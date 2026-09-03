import React, { useState } from 'react'
import { Heart, Star, Sparkles, X } from 'lucide-react'
import { formatInr } from '../utils/format.js'

function ratingCount(count) {
  if (!count) return null
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)
}

export default function ProductCard({
  product,
  variant = 'shop',
  wishlisted = false,
  onTryAI,
  onToggleWishlist,
  onAddToBag,
}) {
  const [imgError, setImgError] = useState(false)
  const isWishlistCard = variant === 'wishlist'

  return (
    <article className="group bg-white border border-line hover:shadow-card-hover transition-shadow flex flex-col">
      <div className="relative aspect-[3/4] bg-shell overflow-hidden">
        {!imgError ? (
          <img
            src={product.image_url}
            alt={product.product_name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-50 text-4xl">👗</div>
        )}

        <button
          type="button"
          onClick={() => onToggleWishlist?.(product)}
          className="absolute top-2 right-2 w-8 h-8 bg-white shadow-card flex items-center justify-center"
          aria-label={
            isWishlistCard
              ? `Remove ${product.product_name} from wishlist`
              : `${wishlisted ? 'Remove' : 'Save'} ${product.product_name}`
          }
        >
          {isWishlistCard ? (
            <X size={15} className="text-ink" />
          ) : (
            <Heart
              size={15}
              className={wishlisted ? 'text-brand-500' : 'text-ink'}
              fill={wishlisted ? 'currentColor' : 'none'}
            />
          )}
        </button>

        {product.rating > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/95 px-1.5 py-0.5 text-[11px] font-bold text-ink shadow-card">
            {product.rating}
            <Star size={10} className="text-rating" fill="currentColor" />
            {ratingCount(product.review_count) && (
              <span className="text-muted font-medium">| {ratingCount(product.review_count)}</span>
            )}
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-[14px] font-bold text-ink truncate">{product.brand}</h3>
        <p className="text-[13px] text-muted truncate">{product.product_name}</p>

        <p className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[14px] font-bold text-ink">{formatInr(product.price)}</span>
          {product.original_price > product.price && (
            <>
              <span className="text-[12px] text-muted line-through">{formatInr(product.original_price)}</span>
              <span className="text-[12px] font-semibold text-deal">({product.discount_percent}% OFF)</span>
            </>
          )}
        </p>

        {isWishlistCard && product.intelligence_reason && (
          <p className="mt-2 text-[11px] text-muted leading-snug line-clamp-2">
            {product.intelligence_reason}
          </p>
        )}

        <div className="mt-auto pt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onAddToBag?.(product)}
            className="w-full h-10 border border-line text-[13px] font-bold uppercase text-brand-500 hover:border-brand-300 hover:bg-brand-50 transition-colors"
          >
            {isWishlistCard ? 'Move to Bag' : 'Add to Bag'}
          </button>

          <button
            type="button"
            onClick={() => onTryAI?.(product)}
            className="w-full h-9 flex items-center justify-center gap-1.5 text-[12px] font-bold uppercase text-ink border border-line hover:border-ink transition-colors"
          >
            <Sparkles size={13} className="text-brand-500" />
            AI Style
          </button>
        </div>
      </div>
    </article>
  )
}
