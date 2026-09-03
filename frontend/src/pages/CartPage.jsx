import React, { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Trash2, ShoppingBag, Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchCart, removeFromCart } from '../api/client.js'

export default function CartPage({ onBack, onCartUpdated }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  const loadCart = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCart()
      setItems(data.items || [])
      setTotal(data.total || 0)
      onCartUpdated(data.count || 0)
    } catch {
      toast.error('Could not load cart.')
    } finally {
      setLoading(false)
    }
  }, [onCartUpdated])

  useEffect(() => { loadCart() }, [loadCart])

  async function handleRemove(cartItemId) {
    setRemoving(cartItemId)
    try {
      await removeFromCart(cartItemId)
      toast.success('Removed from cart')
      await loadCart()
    } catch {
      toast.error('Could not remove item.')
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 page-enter">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Continue Shopping
      </button>

      <div className="flex items-center gap-2 mb-6">
        <ShoppingBag className="text-brand-500" size={22} />
        <h1 className="text-2xl font-bold text-gray-900">Bag</h1>
        <span className="text-sm text-gray-400 ml-1">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="text-gray-300" size={28} />
          </div>
          <h2 className="text-lg font-semibold text-gray-600">Your bag is empty</h2>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            Head to your wishlist and add items you love!
          </p>
          <button onClick={onBack} className="btn-primary mt-2">
            Go to Wishlist
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Cart items */}
          <div className="card divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 p-4">
                <div className="w-16 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{item.brand}</p>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{item.product_name}</p>
                  {item.size && (
                    <p className="text-xs text-gray-500 mt-0.5">Size: {item.size}</p>
                  )}
                  {item.source === 'ai_preview' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-brand-600 font-semibold mt-1">
                      <Sparkles size={10} /> Added via AI Preview
                    </span>
                  )}
                  <p className="text-base font-bold text-gray-900 mt-1">₹{item.price.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removing === item.id}
                  className="text-gray-300 hover:text-red-400 transition-colors shrink-0 disabled:opacity-50"
                  aria-label="Remove item"
                >
                  {removing === item.id ? (
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin block" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="card p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-800">Order Summary</h3>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal ({items.length} items)</span>
              <span>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Delivery</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <button
              onClick={() => {
                toast.success('Demo checkout — no real purchase is made.')
              }}
              className="btn-primary w-full py-3 text-base mt-1"
            >
              Proceed to Checkout
            </button>
            <p className="text-xs text-gray-400 text-center">This is a demo — no real purchase will be made.</p>
          </div>
        </div>
      )}
    </div>
  )
}
