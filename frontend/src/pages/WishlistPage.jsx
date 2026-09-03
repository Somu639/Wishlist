import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Heart, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import ProductCard from '../components/ProductCard.jsx'
import WishlistIntelligence from '../components/WishlistIntelligence.jsx'
import StylePreviewModal from './StylePreviewPage.jsx'
import {
  fetchWishlist,
  fetchCart,
  removeFromWishlist,
  trackEvent,
} from '../api/client.js'

export default function WishlistPage({ searchQuery = '', onCartUpdated, onWishlistCount }) {
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
      onCartUpdated(cartData.count || 0)
    } catch (err) {
      setError(err.userMessage || 'Could not load your wishlist. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [onCartUpdated, onWishlistCount])

  useEffect(() => {
    loadWishlist()
  }, [loadWishlist])

  async function handleToggleWishlist(product) {
    try {
      await removeFromWishlist(product.product_id)
      toast.success('Removed from wishlist')
      await loadWishlist()
    } catch (err) {
      toast.error(err.userMessage || 'Could not update wishlist.')
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
    const q = searchQuery.trim().toLowerCase()
    let list = products
    if (filter) list = list.filter((item) => item.classification === filter)
    if (q) {
      list = list.filter((item) => {
        const hay = `${item.product_name} ${item.brand} ${item.category} ${item.color}`.toLowerCase()
        return hay.includes(q)
      })
    }
    return list
  }, [products, filter, searchQuery])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-[#ff3f6c]" size={32} />
        <p className="text-gray-500 text-sm">Loading your wishlist…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-gray-700 font-medium text-center">{error}</p>
        <button type="button" onClick={loadWishlist} className="btn-primary">
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-4 text-center">
        <h1 className="text-[22px] sm:text-[28px] font-bold tracking-[0.18em] uppercase text-gray-900">
          My Wishlist
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {products.length} saved {products.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Heart className="text-[#ff3f6c]" size={28} />
            <h2 className="text-lg font-semibold text-gray-800">Your wishlist is empty</h2>
          </div>
        ) : (
          <>
            {intelligence && (
              <div className="mb-8">
                <WishlistIntelligence
                  savedCount={intelligence.saved_count ?? products.length}
                  summary={intelligence.summary}
                  activeId={filter}
                  onSelect={setFilter}
                />
              </div>
            )}

            {visible.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-12">No items match this view.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
                {visible.map((product) => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    wishlisted
                    onTryAI={() => handleTryAI(product)}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

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
