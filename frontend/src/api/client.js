import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000, // 60s — AI calls can be slow
})

// Response interceptor — convert known error codes to readable messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data
    const status = error.response?.status

    if (status === 429) {
      const msg = data?.error || 'Too many requests. Please wait a moment.'
      return Promise.reject(Object.assign(error, { userMessage: msg }))
    }

    if (status === 504 || error.code === 'ECONNABORTED') {
      return Promise.reject(
        Object.assign(error, { userMessage: 'Request timed out. Please try again.' })
      )
    }

    if (status >= 500) {
      return Promise.reject(
        Object.assign(error, {
          userMessage: data?.error || 'Something went wrong. Please try again.',
        })
      )
    }

    return Promise.reject(
      Object.assign(error, { userMessage: data?.error || 'An unexpected error occurred.' })
    )
  }
)

// Wishlist
export const fetchWishlist = () => api.get('/wishlist').then((r) => r.data)
export const removeFromWishlist = (productId) =>
  api.delete(`/wishlist/${productId}`).then((r) => r.data)

// Cart
export const fetchCart = () => api.get('/cart').then((r) => r.data)
export const addToCart = (payload) => api.post('/cart', payload).then((r) => r.data)
export const removeFromCart = (cartItemId) =>
  api.delete(`/cart/${cartItemId}`).then((r) => r.data)

// AI Analysis
export const analyzeStyle = (formData) =>
  api.post('/analyze-style', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000, // extra time for vision model
  }).then((r) => r.data)

export const saveStyle = (payload) =>
  api.post('/analyze-style/save', payload).then((r) => r.data)

// Analytics
export const trackEvent = (eventName, payload = {}) =>
  api.post('/analytics/event', { event_name: eventName, ...payload }).catch(() => {
    // Analytics failures must never surface to user
  })

export default api
