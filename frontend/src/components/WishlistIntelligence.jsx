import React from 'react'

const TILE_STYLES = {
  ready_to_buy: { bar: 'bg-[#14958f]', muted: 'bg-[#f3fbfa]', text: 'text-[#0f6b66]' },
  needs_reconsideration: { bar: 'bg-[#c9a227]', muted: 'bg-[#fbf8ee]', text: 'text-[#8a7010]' },
  style_uncertainty: { bar: 'bg-[#7b5ea7]', muted: 'bg-[#f7f4fb]', text: 'text-[#5a427d]' },
  possibly_outdated: { bar: 'bg-[#8a8a8a]', muted: 'bg-[#f6f6f6]', text: 'text-[#5c5c5c]' },
  alternative_available: { bar: 'bg-[#3b6ea5]', muted: 'bg-[#f3f7fb]', text: 'text-[#2a4f78]' },
}

export default function WishlistIntelligence({ savedCount, summary, activeId, onSelect }) {
  if (!summary?.length) return null

  return (
    <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-card">
      <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#ff3e6c]">Wishlist intelligence</p>
      <div className="mt-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <h2 className="font-display text-2xl sm:text-3xl text-gray-900">Your Wishlist, Reconsidered</h2>
        <p className="text-sm text-gray-500">
          {savedCount} {savedCount === 1 ? 'item' : 'items'} saved
        </p>
      </div>
      <p className="mt-2 text-sm text-gray-500 max-w-2xl">
        A decision aid from your saved pieces and activity — not discounts, not fake urgency.
      </p>

      <div className="mt-5 grid grid-cols-2 lg:grid-cols-5 gap-3">
        {summary.map((tile) => {
          const styles = TILE_STYLES[tile.id] || TILE_STYLES.possibly_outdated
          const active = activeId === tile.id
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(active ? null : tile.id)}
              className={`text-left rounded-xl border px-4 py-3.5 transition-all ${
                active ? 'border-gray-900 shadow-sm' : 'border-gray-100 hover:border-gray-300'
              } ${styles.muted}`}
            >
              <span className={`block h-1 w-8 rounded-full mb-3 ${styles.bar}`} />
              <span className="block font-display text-3xl leading-none text-gray-900">{tile.count}</span>
              <span className={`mt-2 block text-xs font-semibold leading-snug ${styles.text}`}>
                {tile.label}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
