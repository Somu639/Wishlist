import React from 'react'
import { Heart, ShoppingBag, Search } from 'lucide-react'

export default function Header({
  currentPage,
  cartCount,
  wishlistCount = 0,
  searchQuery = '',
  onSearchChange,
  onLogoClick,
  onWishlistClick,
  onCartClick,
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-[64px] flex items-center gap-3 sm:gap-6">
        <button
          type="button"
          onClick={onLogoClick}
          className="shrink-0 font-black text-[20px] sm:text-[22px] tracking-[0.12em] text-[#ff3f6c] uppercase"
        >
          StyleAI
        </button>

        <div className="flex-1 max-w-xl mx-auto">
          <label className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search"
              className="w-full h-10 pl-9 pr-3 rounded-md bg-[#f5f5f6] text-sm text-gray-800 placeholder:text-gray-400 border border-transparent focus:outline-none focus:bg-white focus:border-gray-300"
            />
          </label>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6 shrink-0">
          <button
            type="button"
            onClick={onWishlistClick}
            className={`relative flex flex-col items-center gap-0.5 text-[11px] font-semibold ${
              currentPage === 'wishlist' ? 'text-[#ff3f6c]' : 'text-gray-800'
            }`}
            aria-label="Wishlist"
          >
            <span className="relative">
              <Heart size={20} fill={currentPage === 'wishlist' ? 'currentColor' : 'none'} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#ff3f6c] text-white text-[9px] font-bold flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </span>
            <span className="hidden sm:block">Wishlist</span>
          </button>

          <button
            type="button"
            onClick={onCartClick}
            className={`relative flex flex-col items-center gap-0.5 text-[11px] font-semibold ${
              currentPage === 'cart' ? 'text-[#ff3f6c]' : 'text-gray-800'
            }`}
            aria-label="Bag"
          >
            <span className="relative">
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#ff3f6c] text-white text-[9px] font-bold flex items-center justify-center">
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
