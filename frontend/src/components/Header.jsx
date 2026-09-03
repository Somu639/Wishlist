import React from 'react'
import { Heart, ShoppingBag, Search, User } from 'lucide-react'
import { CATEGORY_GROUPS } from '../data/catalog.js'

export default function Header({
  currentPage,
  activeGroup = 'all',
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
      <div className="max-w-[1280px] mx-auto px-4 h-[70px] flex items-center gap-4">
        <button
          type="button"
          onClick={onLogoClick}
          className="shrink-0 font-black text-[22px] tracking-[0.14em] text-brand-500 uppercase"
        >
          StyleAI
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
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          <label className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search for products, brands and more"
              className="w-full h-10 pl-9 pr-3 bg-shell text-sm text-ink placeholder:text-muted border border-transparent focus:outline-none focus:bg-white focus:border-line"
            />
          </label>
        </div>

        <nav className="flex items-center gap-5 sm:gap-7 shrink-0">
          <span className="hidden sm:flex flex-col items-center gap-0.5 text-[11px] font-bold text-ink">
            <User size={20} />
            Profile
          </span>

          <button
            type="button"
            onClick={onWishlistClick}
            className={`relative flex flex-col items-center gap-0.5 text-[11px] font-bold ${
              currentPage === 'wishlist' ? 'text-brand-500' : 'text-ink'
            }`}
            aria-label="Wishlist"
          >
            <span className="relative">
              <Heart size={20} fill={currentPage === 'wishlist' ? 'currentColor' : 'none'} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </span>
            <span className="hidden sm:block">Wishlist</span>
          </button>

          <button
            type="button"
            onClick={onCartClick}
            className={`relative flex flex-col items-center gap-0.5 text-[11px] font-bold ${
              currentPage === 'cart' ? 'text-brand-500' : 'text-ink'
            }`}
            aria-label="Bag"
          >
            <span className="relative">
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </span>
            <span className="hidden sm:block">Bag</span>
          </button>
        </nav>
      </div>
    </header>
  )
}
