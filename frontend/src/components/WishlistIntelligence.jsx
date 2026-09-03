import React from 'react'

const TILE_STYLES = {
  ready_to_buy: { bar: 'bg-ok', text: 'text-ok' },
  needs_reconsideration: { bar: 'bg-deal', text: 'text-deal' },
  style_uncertainty: { bar: 'bg-[#7b5ea7]', text: 'text-[#7b5ea7]' },
  possibly_outdated: { bar: 'bg-muted', text: 'text-muted' },
  alternative_available: { bar: 'bg-[#3b6ea5]', text: 'text-[#3b6ea5]' },
}

export default function WishlistIntelligence({ savedCount, summary, activeId, onSelect }) {
  if (!summary?.length) return null

  return (
    <section className="card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-brand-500">
            Wishlist intelligence
          </p>
          <h2 className="mt-1 text-[15px] font-bold text-ink">Your Wishlist, Reconsidered</h2>
        </div>
        <p className="text-[12px] text-muted">
          {savedCount} {savedCount === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      <p className="mt-2 text-[12px] text-muted max-w-2xl">
        A decision aid built from your saved pieces and activity — not discounts, not fake urgency.
      </p>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        {summary.map((tile) => {
          const styles = TILE_STYLES[tile.id] || TILE_STYLES.possibly_outdated
          const active = activeId === tile.id
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect?.(active ? null : tile.id)}
              className={`text-left border px-3 py-3 transition-colors ${
                active ? 'border-ink bg-shell' : 'border-line hover:border-muted'
              }`}
            >
              <span className={`block h-[3px] w-8 mb-2.5 ${styles.bar}`} />
              <span className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
                {tile.label}
              </span>
              <span className={`mt-1 block text-[20px] font-bold ${styles.text}`}>{tile.count}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
