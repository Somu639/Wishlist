import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Heart, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import ProductCard from '../components/ProductCard.jsx'
import WishlistIntelligence from '../components/WishlistIntelligence.jsx'
import StylePreviewModal from './StylePreviewPage.jsx'
import {
  addToCart,
  fetchCart,
  fetchWishlist,
  removeFromWishlist,
  trackEvent,
} from '../api/client.js'

export default function WishlistPage({
  searchQuery = '',
  onCartUpdated,
  onWishlistCount,
  onContinueShopping,
}) {
  const [products, setProducts] = useState([])
  const [intelligence, setIntelligence] = useState(null)
  const [filter, setFilter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const loadWishlist = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWishlist()
      const items = data.items || []
      setProducts(items)
      setIntelligence(data.intelligence || null)
      setFilter(null)
      onWishlistCount?.(items.length)
      trackEvent('wishlist_view')
      const cartData = await fetchCart()
      onCartUpdated?.(cartData.count || 0)
    } catch (err) {
      setError(err.userMessage || 'Could not load your wishlist. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [onCartUpdated, onWishlistCount])

  useEffect(() => { loadWishlist() }, [loadWishlist])

  async function handleRemove(product) {
    try {
      await removeFromWishlist(product.product_id)
      toast.success('Removed from wishlist')
      await loadWishlist()
    } catch (err) {
      toast.error(err.userMessage || 'Could not update wishlist.')
    }
  }

  async function handleMoveToBag(product) {
    try {
      await addToCart({ product_id: product.product_id, source: 'direct' })
      await removeFromWishlist(product.product_id)
      const cartData = await fetchCart()
      onCartUpdated?.(cartData.count || 0)
      toast.success(`${product.product_name} moved to bag`)
      await loadWishlist()
    } catch (err) {
      toast.error(err.userMessage || 'Could not move this item to your bag.')
    }
  }

  function handleTryAI(product) {
    trackEvent('wishlist_product_selected', {
      product_id: product.product_id,
      product_category: product.category,
    })
    setSelectedProduct(product)
  }

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    let list = products
    if (filter) list = list.filter((item) => item.classification === filter)
    if (query) {
      list = list.filter((item) => {
        const haystack = `${item.product_name} ${item.brand} ${item.category} ${item.color}`.toLowerCase()
        return haystack.includes(query)
      })
    }
    return list
  }, [products, filter, searchQuery])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-500" size={32} />
        <p className="text-sm text-muted">Loading your wishlist…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-center font-medium text-ink">{error}</p>
        <button type="button" onClick={loadWishlist} className="btn-primary">
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 page-enter">
      <h1 className="text-[16px] font-bold text-ink">
        My Wishlist
        <span className="ml-2 text-[13px] font-normal text-muted">
          {products.length} {products.length === 1 ? 'item' : 'items'}
        </span>
      </h1>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Heart className="text-brand-500" size={28} />
          <h2 className="text-lg font-semibold text-ink">Your wishlist is empty</h2>
          <p className="text-sm text-muted">Save the styles you like and come back to decide.</p>
          <button type="button" onClick={onContinueShopping} className="btn-primary mt-2">
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
          {intelligence && (
            <div className="mt-5">
              <WishlistIntelligence
                savedCount={intelligence.saved_count ?? products.length}
                summary={intelligence.summary}
                activeId={filter}
                onSelect={setFilter}
              />
            </div>
          )}

          {visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No items match this view.</p>
          ) : (
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
              {visible.map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  variant="wishlist"
                  wishlisted
                  onTryAI={handleTryAI}
                  onToggleWishlist={handleRemove}
                  onAddToBag={handleMoveToBag}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedProduct && (
        <StylePreviewModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onCartUpdated={onCartUpdated}
        />
      )}
    </div>
  )
}
