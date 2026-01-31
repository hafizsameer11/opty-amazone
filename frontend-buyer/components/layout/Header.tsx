'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth-service';

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      AuthService.clearAuth();
      router.push('/');
    } catch (error) {
      // Even if API call fails, clear local storage
      AuthService.clearAuth();
      router.push('/');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-[#131921] text-white sticky top-0 z-50 shadow-md">
      {/* Top Bar */}
      <div className="bg-[#232f3e] border-b border-white/10 py-2 px-2 sm:px-3 lg:px-4">
        <div className="w-full flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="hover:text-[#febd69] transition-colors">
              All
            </Link>
            <Link href="/categories/frames" className="hover:text-[#febd69] transition-colors">
              Frames
            </Link>
            <Link href="/categories/sunglasses" className="hover:text-[#febd69] transition-colors">
              Sunglasses
            </Link>
            <Link href="/categories/contact-lenses" className="hover:text-[#febd69] transition-colors">
              Contact Lenses
            </Link>
            <Link href="/categories/eye-hygiene" className="hover:text-[#febd69] transition-colors">
              Eye Hygiene
            </Link>
            <Link href="/categories/accessories" className="hover:text-[#febd69] transition-colors">
              Accessories
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/profile" className="hover:text-[#febd69] transition-colors">
                  {user?.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="hover:text-[#febd69] transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="hover:text-[#febd69] transition-colors">
                  Sign In
                </Link>
                <Link href="/auth/register" className="hover:text-[#febd69] transition-colors">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="w-full px-2 sm:px-3 lg:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-[#00CC66] to-[#0066CC] flex items-center justify-center text-sm font-bold shadow-sm">
              OM
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg sm:text-xl font-semibold tracking-tight">
                OpticalMarket
              </span>
              <span className="text-[10px] sm:text-xs text-blue-100 uppercase tracking-[0.16em]">
                Optical Marketplace
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-3xl">
            <div className="flex rounded-md overflow-hidden shadow-sm bg-white">
              <select className="hidden sm:block bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 border-r border-gray-300 text-xs sm:text-sm focus:outline-none">
                <option>All Categories</option>
                <option>Frames</option>
                <option>Sunglasses</option>
                <option>Contact Lenses</option>
                <option>Eye Hygiene</option>
                <option>Accessories</option>
              </select>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for glasses, lenses, and more..."
                className="flex-1 px-3 sm:px-4 py-2 text-gray-900 text-xs sm:text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#febd69] hover:bg-[#f3a847] px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold text-gray-900 transition-colors flex items-center justify-center"
              >
                Search
              </button>
            </div>
          </form>

          {/* Cart & Account */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 text-xs sm:text-sm">
            {isAuthenticated ? (
              <>
                <Link
                  href="/cart"
                  className="flex items-center gap-1 hover:text-[#febd69] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm">Cart</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex flex-col items-start hover:text-[#febd69] transition-colors"
                >
                  <span className="text-[11px]">Hello, {user?.name?.split(' ')[0]}</span>
                  <span className="text-sm font-semibold">Profile</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="flex items-center gap-1 hover:text-[#febd69] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm">Cart</span>
                </Link>
                <Link
                  href="/auth/login"
                  className="flex flex-col items-start hover:text-[#febd69] transition-colors"
                >
                  <span className="text-[11px]">Hello, Sign in</span>
                  <span className="text-sm font-semibold">Account & Lists</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
