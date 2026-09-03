import { PRODUCTS, getProduct } from './catalog.js'
import { classifyWishlist } from './intelligence.js'

const WISHLIST_KEY = 'styleai.wishlist.v1'
const CART_KEY = 'styleai.cart.v1'

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or full storage — the session still works in memory.
  }
}

function defaultWishlist() {
  const now = new Date().toISOString()
  return PRODUCTS.map((product) => ({ product_id: product.product_id, added_at: now }))
}

function wishlistRows() {
  const stored = window.localStorage.getItem(WISHLIST_KEY)
  if (stored === null) {
    const seeded = defaultWishlist()
    write(WISHLIST_KEY, seeded)
    return seeded
  }
  return read(WISHLIST_KEY, [])
}

export function getWishlist() {
  const rows = wishlistRows()
  const hydrated = rows
    .map((row) => {
      const product = getProduct(row.product_id)
      return product ? { ...product, wishlisted_at: row.added_at } : null
    })
    .filter(Boolean)

  const { items, summary } = classifyWishlist(hydrated)

  return {
    success: true,
    items,
    count: items.length,
    intelligence: {
      title: 'Your Wishlist, Reconsidered',
      saved_count: items.length,
      summary,
    },
  }
}

export function addToWishlist(productId) {
  const rows = wishlistRows()
  if (!rows.some((row) => row.product_id === productId)) {
    rows.unshift({ product_id: productId, added_at: new Date().toISOString() })
    write(WISHLIST_KEY, rows)
  }
  return { success: true }
}

export function removeFromWishlist(productId) {
  write(WISHLIST_KEY, wishlistRows().filter((row) => row.product_id !== productId))
  return { success: true }
}

export function isWishlisted(productId) {
  return wishlistRows().some((row) => row.product_id === productId)
}

export function getCart() {
  const rows = read(CART_KEY, [])
  const items = rows
    .map((row) => {
      const product = getProduct(row.product_id)
      if (!product) return null
      return {
        id: row.id,
        product_id: row.product_id,
        size: row.size || null,
        quantity: row.quantity || 1,
        added_at: row.added_at,
        source: row.source || 'direct',
        product_name: product.product_name,
        brand: product.brand,
        price: product.price,
        original_price: product.original_price,
        image_url: product.image_url,
        color: product.color,
      }
    })
    .filter(Boolean)

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return { success: true, items, count: items.length, total }
}

export function addToCart({ product_id, size = null, quantity = 1, source = 'direct' }) {
  const product = getProduct(product_id)
  if (!product) {
    const err = new Error('Product not found')
    err.userMessage = 'Product not found.'
    throw err
  }
  const rows = read(CART_KEY, [])
  rows.unshift({
    id: `${product_id}-${Date.now()}`,
    product_id,
    size,
    quantity,
    source,
    added_at: new Date().toISOString(),
  })
  write(CART_KEY, rows)
  return { success: true, product_name: product.product_name }
}

export function removeFromCart(cartItemId) {
  write(CART_KEY, read(CART_KEY, []).filter((row) => row.id !== cartItemId))
  return { success: true }
}
