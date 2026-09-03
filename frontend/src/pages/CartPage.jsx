import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Loader2, ShoppingBag, Sparkles, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchCart, removeFromCart } from '../api/client.js'
import { formatInr } from '../utils/format.js'

const CONVENIENCE_FEE = 99

export default function CartPage({ onBack, onCartUpdated }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  const loadCart = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCart()
      setItems(data.items || [])
      onCartUpdated?.(data.count || 0)
    } catch {
      toast.error('Could not load your bag.')
    } finally {
      setLoading(false)
    }
  }, [onCartUpdated])

  useEffect(() => { loadCart() }, [loadCart])

  async function handleRemove(cartItemId) {
    setRemoving(cartItemId)
    try {
      await removeFromCart(cartItemId)
      toast.success('Removed from bag')
      await loadCart()
    } catch {
      toast.error('Could not remove this item.')
    } finally {
      setRemoving(null)
    }
  }

  const totalMrp = items.reduce(
    (sum, item) => sum + (item.original_price || item.price) * item.quantity,
    0
  )
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = totalMrp - totalPrice
  const payable = items.length > 0 ? totalPrice + CONVENIENCE_FEE : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 page-enter">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={16} /> Continue Shopping
      </button>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <ShoppingBag className="text-muted" size={28} />
          <h2 className="text-lg font-semibold text-ink">Your bag is empty</h2>
          <p className="text-sm text-muted">Move a saved style into your bag to see it here.</p>
          <button type="button" onClick={onBack} className="btn-primary mt-2">
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <section>
            <h1 className="text-[15px] font-bold uppercase text-ink">
              Bag
              <span className="ml-2 text-[13px] font-normal normal-case text-muted">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </h1>

            <div className="mt-4 flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.id} className="card flex gap-4 p-3">
                  <div className="w-[92px] h-[120px] bg-shell overflow-hidden shrink-0">
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                      onError={(event) => { event.currentTarget.style.display = 'none' }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-ink truncate">{item.brand}</p>
                    <p className="text-[13px] text-muted truncate">{item.product_name}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                      <span className="bg-shell px-2 py-0.5">Size: {item.size || 'Free'}</span>
                      <span className="bg-shell px-2 py-0.5">Qty: {item.quantity}</span>
                    </div>

                    {item.source === 'ai_preview' && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-500">
                        <Sparkles size={11} /> Added after AI Style
                      </span>
                    )}

                    <p className="mt-2 flex items-baseline gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-ink">{formatInr(item.price)}</span>
                      {item.original_price > item.price && (
                        <>
                          <span className="text-[12px] text-muted line-through">
                            {formatInr(item.original_price)}
                          </span>
                          <span className="text-[12px] font-semibold text-deal">
                            {Math.round(((item.original_price - item.price) / item.original_price) * 100)}% OFF
                          </span>
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-[12px] text-ok font-semibold">Free delivery on this item</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    disabled={removing === item.id}
                    className="shrink-0 text-muted hover:text-brand-500 transition-colors disabled:opacity-50"
                    aria-label={`Remove ${item.product_name}`}
                  >
                    {removing === item.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <aside className="card p-4 lg:sticky lg:top-[86px]">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-muted">
              Price Details ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h2>

            <div className="mt-4 flex flex-col gap-3">
              <p className="price-row">
                <span>Total MRP</span>
                <span>{formatInr(totalMrp)}</span>
              </p>
              <p className="price-row">
                <span>Discount on MRP</span>
                <span className="text-ok">− {formatInr(discount)}</span>
              </p>
              <p className="price-row">
                <span>Convenience Fee</span>
                <span>{formatInr(CONVENIENCE_FEE)}</span>
              </p>
              <p className="price-row">
                <span>Delivery Fee</span>
                <span className="text-ok">Free</span>
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-[15px] font-bold text-ink">
              <span>Total Amount</span>
              <span>{formatInr(payable)}</span>
            </div>

            <button
              type="button"
              onClick={() => toast.success('Demo checkout — no real purchase is made.')}
              className="btn-primary w-full mt-4"
            >
              Place Order
            </button>
            <p className="mt-3 text-[11px] text-muted text-center">
              This is a demo storefront. No payment is collected.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
