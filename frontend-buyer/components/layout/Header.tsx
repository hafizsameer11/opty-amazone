'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth-service';
import { productService, type Category } from '@/services/product-service';

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

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

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories(true);
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (selectedCategoryId) {
        const selectedCategory = findCategoryById(categories, selectedCategoryId);
        if (selectedCategory) {
          router.push(`/categories/${selectedCategory.slug}?search=${encodeURIComponent(searchQuery.trim())}`);
        } else {
          router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
      } else {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  const findCategoryById = (cats: Category[], id: number): Category | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategoryById(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <header className="bg-[#131921] text-white sticky top-0 z-50 shadow-md">
      {/* Top Bar */}
      <div className="bg-[#232f3e] border-b border-white/10 py-2 px-2 sm:px-3 lg:px-4">
        <div className="w-full flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-3 sm:gap-4 relative">
            <Link href="/" className="hover:text-[#febd69] transition-colors">
              All
            </Link>
            {categories.map((category) => (
              <div
                key={category.id}
                className="relative group"
                onMouseEnter={() => setHoveredCategory(category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <Link
                  href={`/categories/${category.slug}`}
                  className="hover:text-[#febd69] transition-colors flex items-center gap-1"
                >
                  {category.name}
                  {(category.children && category.children.length > 0) && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </Link>
                
                {/* Dropdown Menu */}
                {(category.children && category.children.length > 0) && hoveredCategory === category.id && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] z-50 py-2">
                    {category.children.map((subCategory) => (
                      <div key={subCategory.id} className="relative group/sub">
                        <Link
                          href={`/categories/${subCategory.slug}`}
                          className="block px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <span>{subCategory.name}</span>
                          {(subCategory.children && subCategory.children.length > 0) && (
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </Link>
                        
                        {/* Sub-Sub Categories */}
                        {(subCategory.children && subCategory.children.length > 0) && (
                          <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[180px] z-50 py-2 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all">
                            {subCategory.children.map((subSubCategory) => (
                              <Link
                                key={subSubCategory.id}
                                href={`/categories/${subSubCategory.slug}`}
                                className="block px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors"
                              >
                                {subSubCategory.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
              <div className="hidden sm:block relative">
                <select
                  value={selectedCategoryId || ''}
                  onChange={(e) => {
                    const catId = e.target.value;
                    setSelectedCategoryId(catId ? parseInt(catId) : null);
                  }}
                  className="bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 border-r border-gray-300 text-xs sm:text-sm focus:outline-none appearance-none pr-8 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {(() => {
                    const renderOptions = (cat: Category, prefix = ''): JSX.Element[] => {
                      const options: JSX.Element[] = [
                        <option key={cat.id} value={cat.id}>
                          {prefix}{cat.name}
                        </option>
                      ];
                      if (cat.children) {
                        cat.children.forEach((subCat) => {
                          options.push(...renderOptions(subCat, `${cat.name} → `));
                        });
                      }
                      return options;
                    };
                    const allOptions: JSX.Element[] = [];
                    categories.forEach((category) => {
                      allOptions.push(...renderOptions(category));
                    });
                    return allOptions;
                  })()}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
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
                  className="relative flex items-center gap-1 hover:text-[#febd69] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm">Cart</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#febd69] text-[#131921] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
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
