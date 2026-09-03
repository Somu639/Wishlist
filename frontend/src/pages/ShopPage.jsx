import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CATEGORY_GROUPS, PRODUCTS } from '../data/catalog.js'
import ProductCard from '../components/ProductCard.jsx'
import StylePreviewModal from './StylePreviewPage.jsx'
import {
  addToCart,
  addToWishlist,
  fetchCart,
  fetchWishlist,
  removeFromWishlist,
  trackEvent,
} from '../api/client.js'

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'discount', label: 'Better Discount' },
  { id: 'rating', label: 'Customer Rating' },
]

export default function ShopPage({
  activeGroup = 'all',
  searchQuery = '',
  onGroupSelect,
  onCartUpdated,
  onWishlistCount,
  onGoToWishlist,
}) {
  const [wishlistIds, setWishlistIds] = useState([])
  const [sort, setSort] = useState('recommended')
  const [selectedProduct, setSelectedProduct] = useState(null)

  const syncWishlist = useCallback(async () => {
    try {
      const data = await fetchWishlist()
      const ids = (data.items || []).map((item) => item.product_id)
      setWishlistIds(ids)
      onWishlistCount?.(ids.length)
    } catch {
      // Browsing still works without the wishlist state.
    }
  }, [onWishlistCount])

  useEffect(() => { syncWishlist() }, [syncWishlist])

  const group = CATEGORY_GROUPS.find((item) => item.id === activeGroup) || CATEGORY_GROUPS[0]

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    let list = group.categories
      ? PRODUCTS.filter((item) => group.categories.includes(item.category))
      : [...PRODUCTS]

    if (query) {
      list = list.filter((item) => {
        const haystack = `${item.product_name} ${item.brand} ${item.category} ${item.color}`.toLowerCase()
        return haystack.includes(query)
      })
    }

    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
    else if (sort === 'discount') list.sort((a, b) => b.discount_percent - a.discount_percent)
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)

    return list
  }, [group, searchQuery, sort])

  async function handleToggleWishlist(product) {
    const saved = wishlistIds.includes(product.product_id)
    try {
      if (saved) {
        await removeFromWishlist(product.product_id)
        toast.success('Removed from wishlist')
      } else {
        await addToWishlist(product.product_id)
        toast.success('Added to wishlist')
      }
      await syncWishlist()
    } catch (err) {
      toast.error(err.userMessage || 'Could not update wishlist.')
    }
  }

  async function handleAddToBag(product) {
    try {
      await addToCart({ product_id: product.product_id, source: 'direct' })
      const cart = await fetchCart()
      onCartUpdated?.(cart.count || 0)
      toast.success(`${product.product_name} added to bag`)
    } catch (err) {
      toast.error(err.userMessage || 'Could not add to bag.')
    }
  }

  function handleTryAI(product) {
    trackEvent('wishlist_product_selected', {
      product_id: product.product_id,
      product_category: product.category,
    })
    setSelectedProduct(product)
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 page-enter">
      <p className="text-[12px] text-muted">
        Home / Clothing /{' '}
        <span className="text-ink font-semibold">{group.label}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[17px] font-bold text-ink">
          {group.label} Clothing
          <span className="ml-2 text-[13px] font-normal text-muted">
            — {visible.length} {visible.length === 1 ? 'item' : 'items'}
          </span>
        </h1>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoToWishlist}
            className="text-[13px] font-bold uppercase text-brand-500"
          >
            View Wishlist
          </button>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-9 border border-line bg-white px-2 text-[13px] font-semibold text-ink focus:outline-none"
            >
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
        {CATEGORY_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onGroupSelect?.(item.id)}
            className={`h-8 px-3 border text-[12px] font-bold uppercase ${
              item.id === activeGroup ? 'border-brand-500 text-brand-500' : 'border-line text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted">No products match this search.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((product) => (
            <ProductCard
              key={product.product_id}
              product={product}
              variant="shop"
              wishlisted={wishlistIds.includes(product.product_id)}
              onTryAI={handleTryAI}
              onToggleWishlist={handleToggleWishlist}
              onAddToBag={handleAddToBag}
            />
          ))}
        </div>
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
