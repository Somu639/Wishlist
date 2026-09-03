import React, { useState } from 'react'
import { Heart } from 'lucide-react'
import { formatInr } from '../utils/format.js'

function shortLabel(product) {
  const category = product.category || product.product_name
  if (category === 'Co-ord Set') return 'Co-ord'
  if (category === 'Ethnic Wear') return 'Ethnic'
  return category
}

export default function ProductCard({
  product,
  onTryAI,
  onToggleWishlist,
  wishlisted = true,
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <article className="flex flex-col">
      <div className="relative aspect-[3/4] bg-[#f4f4f5] overflow-hidden rounded-sm">
        {!imgError ? (
          <img
            src={product.image_url}
            alt={product.product_name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#fff0f4] text-4xl">👗</div>
        )}
      </div>

      <div className="pt-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => onToggleWishlist?.(product)}
            className="mt-0.5 shrink-0"
            aria-label={wishlisted ? `Remove ${product.product_name} from wishlist` : 'Save'}
          >
            <Heart
              size={16}
              className={wishlisted ? 'text-[#ff3f6c]' : 'text-gray-400'}
              fill={wishlisted ? 'currentColor' : 'none'}
            />
          </button>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{shortLabel(product)}</h3>
            <p className="text-[12px] text-gray-500 truncate">{product.brand}</p>
            <p className="mt-1 text-[15px] font-bold text-gray-900">{formatInr(product.price)}</p>
          </div>
        </div>

        {product.intelligence_reason && (
          <p className="mt-2 text-[11px] text-gray-500 leading-snug line-clamp-2">
            {product.intelligence_reason}
          </p>
        )}

        <button
          type="button"
          onClick={onTryAI}
          className="mt-3 w-full h-10 border border-gray-900 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-gray-900 hover:text-white transition-colors"
          aria-label={`AI Style for ${product.product_name}`}
        >
          AI Style
        </button>
      </div>
    </article>
  )
}
