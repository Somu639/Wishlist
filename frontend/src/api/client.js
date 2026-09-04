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

export const trackEvent = (eventName, payload = {}) => {
  if (!api) return Promise.resolve()
  return api.post('/analytics/event', { event_name: eventName, ...payload }).catch(() => {})
}

export default api
