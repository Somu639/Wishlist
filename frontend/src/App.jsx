import React, { useState } from 'react'
import Header from './components/Header.jsx'
import ShopPage from './pages/ShopPage.jsx'
import WishlistPage from './pages/WishlistPage.jsx'
import CartPage from './pages/CartPage.jsx'

export default function App() {
  const [page, setPage] = useState('shop')
  const [group, setGroup] = useState('all')
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
        onLogoClick={() => goToShop('all')}
        onGroupSelect={goToShop}
        onWishlistClick={() => setPage('wishlist')}
        onCartClick={() => setPage('cart')}
      />

      <main className="pt-[70px] bg-white min-h-screen">
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
            onContinueShopping={() => goToShop()}
          />
        )}

        {page === 'cart' && (
          <CartPage onBack={() => goToShop()} onCartUpdated={setCartCount} />
        )}
      </main>

      <footer className="mt-10 border-t border-line bg-shell">
        <div className="max-w-[1280px] mx-auto px-4 py-8 text-[12px] text-muted flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>StyleAI — demo storefront with AI Style Preview. Not affiliated with any retailer.</p>
          <p>AI guidance is not a guarantee of fit or appearance.</p>
        </div>
      </footer>
    </div>
  )
}
