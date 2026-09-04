import React from 'react'
import { Heart, ShoppingBag, Search, User } from 'lucide-react'
import { CATEGORY_GROUPS } from '../data/catalog.js'

export default function Header({
  currentPage,
  activeGroup = 'women',
  cartCount = 0,
  wishlistCount = 0,
  searchQuery = '',
  onSearchChange,
  onLogoClick,
  onGroupSelect,
  onWishlistClick,
  onCartClick,
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-header">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-6 h-12 flex items-center gap-3">
        <button type="button" onClick={onLogoClick} className="shrink-0" aria-label="Myntra home">
          <span className="font-black italic text-[17px] tracking-tight text-brand-500 leading-none">Myntra</span>
        </button>

        <nav className="hidden lg:flex items-stretch h-full">
          {CATEGORY_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onGroupSelect?.(group.id)}
              className={`nav-link ${
                currentPage === 'shop' && activeGroup === group.id ? 'text-brand-500 nav-link-active' : ''
              }`}
            >
              {group.label}
              {group.id === 'studio' && (
                <span className="ml-0.5 text-[7px] font-extrabold text-brand-500 align-super">NEW</span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          <label className="relative block">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search for products, brands and more"
              className="w-full h-8 pl-8 pr-2 rounded-sm bg-shell text-[12px] text-ink placeholder:text-muted border border-transparent focus:outline-none focus:bg-white focus:border-line"
            />
          </label>
        </div>

        <nav className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="hidden sm:flex flex-col items-center gap-0 text-[10px] font-bold text-ink leading-tight">
            <User size={14} strokeWidth={2.2} />
            Profile
          </span>

          <button
            type="button"
            onClick={onWishlistClick}
            className={`relative flex flex-col items-center gap-0 text-[10px] font-bold leading-tight ${
              currentPage === 'wishlist' ? 'text-brand-500' : 'text-ink'
            }`}
            aria-label="Wishlist"
          >
            <span className="relative">
              <Heart size={14} strokeWidth={2.2} fill={currentPage === 'wishlist' ? 'currentColor' : 'none'} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-brand-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </span>
            Wishlist
          </button>

          <button
            type="button"
            onClick={onCartClick}
            className={`relative flex flex-col items-center gap-0 text-[10px] font-bold leading-tight ${
              currentPage === 'cart' ? 'text-brand-500' : 'text-ink'
            }`}
            aria-label="Bag"
          >
            <span className="relative">
              <ShoppingBag size={14} strokeWidth={2.2} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-brand-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </span>
            Bag
          </button>
        </nav>
      </div>
    </header>
  )
}
