import React, { useState } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import ShopPage from './pages/ShopPage.jsx'
import WishlistPage from './pages/WishlistPage.jsx'
import CartPage from './pages/CartPage.jsx'

export default function App() {
  const [page, setPage] = useState('shop')
  const [group, setGroup] = useState('women')
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  function goToShop(groupId) {
    if (groupId) setGroup(groupId)
    setPage('shop')
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        currentPage={page}
        activeGroup={group}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogoClick={() => goToShop('women')}
        onGroupSelect={goToShop}
        onWishlistClick={() => setPage('wishlist')}
        onCartClick={() => setPage('cart')}
      />

      <div className="pt-[80px]">
        <div className="bg-[#fff6f0] border-b border-[#ffe3d3] text-center text-[12px] sm:text-[13px] text-ink py-2 px-4">
          Flat 40-70% OFF on wishlist favourites · Try <span className="font-bold text-brand-500">AI Style Preview</span> before you buy
        </div>

        <main className="min-h-[70vh] bg-white">
          {page === 'shop' && (
            <ShopPage
              activeGroup={group}
              searchQuery={searchQuery}
              onGroupSelect={setGroup}
              onCartUpdated={setCartCount}
              onWishlistCount={setWishlistCount}
              onGoToWishlist={() => setPage('wishlist')}
            />
          )}

          {page === 'wishlist' && (
            <WishlistPage
              searchQuery={searchQuery}
              onCartUpdated={setCartCount}
              onWishlistCount={setWishlistCount}
              onContinueShopping={() => goToShop('women')}
            />
          )}

          {page === 'cart' && (
            <CartPage onBack={() => goToShop('women')} onCartUpdated={setCartCount} />
          )}
        </main>

        <Footer />
      </div>
    </div>
  )
}
