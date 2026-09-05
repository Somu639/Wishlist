import axios from 'axios'
import * as local from '../data/localStore.js'
import { fileToResizedBase64 } from '../utils/image.js'

const explicitApi = import.meta.env.VITE_API_URL
const remoteBase = /^https?:\/\//.test(explicitApi || '')
  ? explicitApi
  : (import.meta.env.DEV ? '/api' : '')

const api = remoteBase
  ? axios.create({ baseURL: remoteBase, timeout: 60000 })
  : null

const functions = axios.create({ timeout: 90000 })

function withMessage(error) {
  const data = error.response?.data
  const status = error.response?.status
  let userMessage = data?.error || 'Something went wrong. Please try again.'

  if (status === 429) {
    userMessage = data?.error || 'AI Style is busy. Wait a few seconds and tap Try again.'
  } else if (status === 504 || error.code === 'ECONNABORTED') {
    userMessage = 'Request timed out. Please try again.'
  }

  return Object.assign(error, { userMessage })
}

function isUnavailable(error, payload) {
  if (typeof payload === 'string') return true
  if (!error) return false
  const status = error.response?.status
  return !error.response || status === 404 || status >= 500
}

async function callRemote(request, fallback) {
  if (!api) return fallback()
  try {
    const response = await request(api)
    if (isUnavailable(null, response.data)) return fallback()
    return response.data
  } catch (error) {
    if (isUnavailable(error)) return fallback()
    throw withMessage(error)
  }
}

export const fetchWishlist = () =>
  callRemote((a) => a.get('/wishlist'), () => local.getWishlist())

export const addToWishlist = (productId) =>
  callRemote((a) => a.post('/wishlist', { product_id: productId }), () => local.addToWishlist(productId))

export const removeFromWishlist = (productId) =>
  callRemote((a) => a.delete(`/wishlist/${productId}`), () => local.removeFromWishlist(productId))

export const fetchCart = () =>
  callRemote((a) => a.get('/cart'), () => local.getCart())

export const addToCart = (payload) =>
  callRemote((a) => a.post('/cart', payload), () => local.addToCart(payload))

export const removeFromCart = (cartItemId) =>
  callRemote((a) => a.delete(`/cart/${cartItemId}`), () => local.removeFromCart(cartItemId))

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postStyle(imageBase64, productId) {
  return functions.post('/api/style', {
    product_id: productId,
    image_base64: imageBase64,
    image_mime: 'image/jpeg',
  })
}

export async function analyzeStyle({ file, productId }) {
  if (api) {
    const formData = new FormData()
    formData.append('userPhoto', file)
    formData.append('product_id', productId)
    try {
      const response = await api.post('/analyze-style', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
      })
      if (typeof response.data !== 'string') return response.data
    } catch (error) {
      if (!isUnavailable(error)) throw withMessage(error)
    }
  }

  const imageBase64 = await fileToResizedBase64(file)

  let lastError
  for (const wait of [0, 4000, 8000]) {
    if (wait) await sleep(wait)
    try {
      const response = await postStyle(imageBase64, productId)
      return response.data
    } catch (error) {
      lastError = error
      const status = error.response?.status
      const retryable = status === 429 || status === 502 || status === 504 || error.code === 'ECONNABORTED'
      if (!retryable) throw withMessage(error)
    }
  }
  throw withMessage(lastError)
}

/**
 * Photoreal try-on. Never throws: it reports why it could not produce an image
 * so the caller can fall back to the browser-side style preview and still tell
 * the shopper what happened.
 *
 * @returns {Promise<{imageUrl: string|null, status: string, reason: string|null}>}
 */
export async function generateTryOn({ file, productId }) {
  try {
    const imageBase64 = await fileToResizedBase64(file)
    const response = await functions.post(
      '/api/tryon',
      { product_id: productId, image_base64: imageBase64, image_mime: 'image/jpeg' },
      { timeout: 120000 },
    )

    const data = response.data || {}
    if (typeof data !== 'object') {
      return { imageUrl: null, status: 'failed', reason: 'endpoint_missing' }
    }

    return {
      imageUrl: data.processing_status === 'completed' ? data.image_url || null : null,
      status: data.processing_status || 'failed',
      reason: data.reason || null,
      detail: data.detail || null,
    }
  } catch (error) {
    const status = error.response?.status
    let reason = 'request_failed'
    if (status === 401 || status === 403) reason = 'blocked'
    else if (status === 404) reason = 'endpoint_missing'
    else if (status === 413) reason = 'photo_too_large'
    else if (error.code === 'ECONNABORTED') reason = 'timeout'
    return { imageUrl: null, status: 'failed', reason, detail: null }
  }
}

const TRY_ON_NOTICES = {
  disabled: 'Photoreal try-on is switched off for this deployment.',
  not_configured: 'Photoreal try-on is not configured.',
  auth_failed: 'The try-on API key was rejected.',
  needs_credits: 'The paid try-on account is out of credit.',
  rejected_input: 'Try-on could not use this photo or product image.',
  rate_limited: 'The free try-on GPU is busy right now. Tap Try again in a moment.',
  timeout: 'The free try-on GPU queue took too long. Tap Try again.',
  no_image: 'Try-on could not produce an image from this photo.',
  image_expired: 'The free try-on GPU dropped the finished image. Tap Try again.',
  missing_images: 'Try-on needs both your photo and the product image.',
  blocked: 'Vercel deployment protection is blocking the try-on endpoint.',
  endpoint_missing: 'The try-on endpoint is not deployed yet.',
  photo_too_large: 'That photo is too large for try-on.',
  network_error: 'Could not reach the try-on service.',
  request_failed: 'The try-on request failed.',
}

/** Human-readable explanation for a try-on that did not produce an image. */
export function describeTryOn({ reason, detail } = {}) {
  if (!reason) return null

  let message = TRY_ON_NOTICES[reason]
  if (!message && reason.startsWith('upstream_')) {
    message = `fal.ai returned an error (${reason.replace('upstream_', 'HTTP ')}).`
  }
  if (!message) message = 'Showing a style preview instead of a photoreal try-on.'

  return detail ? `${message} — ${detail}` : message
}

export const trackEvent = (eventName, payload = {}) => {
  if (!api) return Promise.resolve()
  return api.post('/analytics/event', { event_name: eventName, ...payload }).catch(() => {})
}

export default api
