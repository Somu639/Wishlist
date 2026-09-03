import React, { useState } from 'react'
import Header from './components/Header.jsx'
import WishlistPage from './pages/WishlistPage.jsx'
import CartPage from './pages/CartPage.jsx'

export default function App() {
  const [page, setPage] = useState('wishlist')
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-white">
      <Header
        currentPage={page}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogoClick={() => setPage('wishlist')}
        onWishlistClick={() => setPage('wishlist')}
        onCartClick={() => setPage('cart')}
      />
      <main className="pt-16">
        {page === 'wishlist' && (
          <WishlistPage
            searchQuery={searchQuery}
            onCartUpdated={setCartCount}
            onWishlistCount={setWishlistCount}
          />
        )}
        {page === 'cart' && (
          <CartPage onBack={() => setPage('wishlist')} onCartUpdated={setCartCount} />
        )}
      </main>
    </div>
  )
}
