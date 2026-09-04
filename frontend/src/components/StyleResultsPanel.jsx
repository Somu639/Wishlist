import React, { useState } from 'react'
import { Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { addToCart, fetchCart, trackEvent } from '../api/client.js'
import StyleLookPreview from './StyleLookPreview.jsx'
import { isGeneratedLook } from '../utils/composeLook.js'

function joinList(items) {
  return items.filter(Boolean).join('  •  ')
}

export default function StyleResultsPanel({ product, analysis, tryOn, userPhotoSrc, lookImage, onTryAnother, onCartUpdated }) {
  const [addingToBag, setAddingToBag] = useState(false)

  const why = (analysis.why_it_works || []).slice(0, 3)
  const styleWith = (analysis.accessories?.length ? analysis.accessories : analysis.styling_suggestions || []).slice(0, 3)
  const occasions = (analysis.best_occasions || []).slice(0, 3)
  const consider = [
    ...(analysis.confidence_gaps || []).slice(0, 2),
    analysis.size_guidance,
  ].filter(Boolean).slice(0, 2)

  async function handleAddToBag() {
    setAddingToBag(true)
    try {
      await addToCart({
        product_id: product.product_id,
        source: 'ai_preview',
      })
      const cartData = await fetchCart()
      onCartUpdated(cartData.count || 0)
      trackEvent('add_to_cart_after_ai', { product_id: product.product_id, product_category: product.category })
      trackEvent('conversion_after_ai', { product_id: product.product_id, product_category: product.category })
      toast.success(`${product.product_name} added to bag`)
    } catch (err) {
      toast.error(err.userMessage || 'Could not add to bag.')
    } finally {
      setAddingToBag(false)
    }
  }

  function handleTryAnother() {
    trackEvent('try_another_product', { product_id: product.product_id })
    onTryAnother()
  }

  const lookSrc = [lookImage, tryOn?.generated_tryon_image].find(isGeneratedLook) || null

  return (
    <div className="page-enter px-1 pt-2 pb-4 text-center">
      <h2 className="text-[13px] font-bold tracking-[0.2em] uppercase text-gray-900">
        Your AI Style Result
      </h2>

      <div className="mt-4">
        <StyleLookPreview
          userSrc={userPhotoSrc}
          productId={product.product_id}
          productSrc={product.image_url}
          productName={product.product_name}
          category={product.category}
          generatedSrc={lookSrc}
        />
      </div>

      <p className="mt-6 text-[42px] font-light tracking-tight text-gray-900 leading-none">
        {analysis.overall_score} <span className="text-[22px] text-gray-400">/ 100</span>
      </p>
      <p className="mt-3 text-[12px] font-bold tracking-[0.16em] uppercase text-[#ff3f6c]">
        {analysis.verdict || 'Strong Style Match'}
      </p>

      <div className="mt-8 text-left">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
          <Check size={16} className="text-[#14958f]" strokeWidth={2.5} />
          Why it works
        </p>
        <ul className="mt-2 ml-6 space-y-1.5">
          {why.map((item) => (
            <li key={item} className="text-sm text-gray-600 leading-snug">
              <span className="text-gray-400 mr-1.5">•</span>
              {item}
            </li>
          ))}
        </ul>

        {styleWith.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-gray-500">Style it with</p>
            <p className="mt-2 text-sm text-gray-800 leading-relaxed">{joinList(styleWith)}</p>
          </div>
        )}

        {occasions.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-gray-500">Best for</p>
            <p className="mt-2 text-sm text-gray-800 leading-relaxed">{joinList(occasions)}</p>
          </div>
        )}

        {consider.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-gray-500">What to consider</p>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{consider[0]}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleAddToBag}
        disabled={addingToBag}
        className="mt-8 w-full h-11 bg-[#ff3f6c] hover:bg-[#e63660] text-white text-[12px] font-bold tracking-[0.14em] uppercase disabled:opacity-60"
      >
        {addingToBag ? 'Adding…' : 'Add to Bag'}
      </button>

      <button
        type="button"
        onClick={handleTryAnother}
        className="mt-4 text-sm text-gray-500 underline underline-offset-4 hover:text-gray-800"
      >
        Try another wishlist item
      </button>
    </div>
  )
}
