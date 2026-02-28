'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth-service';
import { productService, type Category } from '@/services/product-service';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [clickedCategory, setClickedCategory] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useLanguage();

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside any dropdown container
      if (!target.closest('.category-dropdown-container')) {
        setClickedCategory(null);
        // Only clear hover on mobile or if not hovering over any category
        if (window.innerWidth < 768) {
          setHoveredCategory(null);
        }
      }
    };

    if (clickedCategory !== null || hoveredCategory !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [clickedCategory, hoveredCategory]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const loadCategories = async () => {
    try {
      // Get parent categories with their children (parentOnly = true gets only parents but includes children)
      const data = await productService.getCategories(true);
      console.log('🔍 Raw categories data from API:', data);
      setCategories(data || []);
      // Debug: Log categories to verify children are loaded
      if (data && data.length > 0) {
        const categoriesWithChildren = data.filter((c: any) => c.children && c.children.length > 0);
        console.log(`📊 Total categories: ${data.length}, Categories with children: ${categoriesWithChildren.length}`);
        if (categoriesWithChildren.length > 0) {
          console.log('✅ Categories with children:', categoriesWithChildren.map((c: any) => ({ 
            id: c.id,
            name: c.name, 
            childrenCount: c.children?.length || 0,
            firstChild: c.children?.[0]?.name || 'none'
          })));
        } else {
          console.warn('⚠️ No categories have children! Check backend API response.');
        }
      } else {
        console.warn('⚠️ No categories loaded');
      }
    } catch (error) {
      console.error('❌ Failed to load categories:', error);
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
    <header className="bg-[#131921] text-white sticky top-0 z-50 shadow-lg" style={{ overflow: 'visible', position: 'relative' }}>
      {/* Top Navigation Bar - Hidden on mobile */}
      <div className="hidden md:block bg-[#232f3e] border-b border-white/10 relative" style={{ overflow: 'visible', position: 'relative', zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 relative" style={{ overflow: 'visible', position: 'relative', zIndex: 50 }}>
          <div className="flex items-center justify-between py-2.5 relative" style={{ overflow: 'visible', position: 'relative', zIndex: 50 }}>
            {/* Category Navigation */}
            <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-hide" style={{ position: 'relative', zIndex: 50, overflowY: 'visible' }}>
              <Link 
                href="/" 
                className="whitespace-nowrap hover:text-[#febd69] transition-colors text-sm font-medium flex items-center gap-1 group"
              >
                <span>{t('all')}</span>
              </Link>
              {categories.map((category) => {
                const isOpen = hoveredCategory === category.id || clickedCategory === category.id;
                const hasChildren = category.children && category.children.length > 0;
                
                // Debug log
                if (hasChildren) {
                  console.log(`Category "${category.name}" - hasChildren: ${hasChildren}, isOpen: ${isOpen}, hoveredCategory: ${hoveredCategory}, clickedCategory: ${clickedCategory}`);
                }
                
                return (
                  <div
                    key={category.id}
                    className="relative category-dropdown-container"
                    onMouseEnter={(e) => {
                      // Clear any pending timeout
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      if (hasChildren) {
                        setHoveredCategory(category.id);
                      }
                    }}
                    onMouseLeave={(e) => {
                      // Add delay before closing to allow moving to dropdown
                      hoverTimeoutRef.current = setTimeout(() => {
                        // Only clear hover on mouse leave, keep clicked for mobile
                        if (!clickedCategory || clickedCategory !== category.id) {
                          setHoveredCategory(null);
                        }
                      }, 200); // 200ms delay
                    }}
                    style={{ position: 'relative', zIndex: isOpen ? 1000 : 'auto' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/categories/${category.slug}`}
                        className="whitespace-nowrap hover:text-[#febd69] transition-colors text-sm font-medium flex items-center gap-1.5 relative z-10"
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          // Clear any pending timeout
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                          }
                          if (hasChildren) {
                            setHoveredCategory(category.id);
                          }
                        }}
                      >
                        <span className="lowercase first-letter:uppercase">{category.name}</span>
                        {hasChildren && <span className="text-xs text-gray-400 ml-1">({category.children?.length || 0})</span>}
                      </Link>
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log(`Clicked dropdown button for: ${category.name}`);
                            const newClickedCategory = clickedCategory === category.id ? null : category.id;
                            setClickedCategory(newClickedCategory);
                            // Also set hovered to keep it open
                            if (newClickedCategory) {
                              setHoveredCategory(category.id);
                            }
                          }}
                          className="hover:text-[#febd69] transition-colors p-1 -ml-1"
                          aria-label="Toggle submenu"
                          aria-expanded={isOpen}
                        >
                          <svg 
                            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* Dropdown Menu */}
                    {hasChildren && isOpen && (
                      <div 
                        className="absolute top-full left-0 pt-2 min-w-[220px]"
                        style={{ 
                          zIndex: 10000, 
                          position: 'absolute',
                          marginTop: '0.5rem',
                          pointerEvents: 'auto',
                          top: '100%',
                          left: 0,
                          display: 'block',
                          visibility: 'visible',
                          opacity: 1,
                          transform: 'translateZ(0)',
                          willChange: 'transform',
                          backgroundColor: 'white',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                        }}
                        ref={(el) => {
                          if (el) {
                            const rect = el.getBoundingClientRect();
                            console.log(`📍 Dropdown for ${category.name} - Position:`, {
                              top: rect.top,
                              left: rect.left,
                              width: rect.width,
                              height: rect.height,
                              visible: rect.width > 0 && rect.height > 0
                            });
                            const styles = window.getComputedStyle(el);
                            console.log(`   Styles:`, {
                              display: styles.display,
                              visibility: styles.visibility,
                              opacity: styles.opacity,
                              zIndex: styles.zIndex,
                              position: styles.position,
                              overflow: styles.overflow
                            });
                          }
                        }}
                        onMouseEnter={() => {
                          // Clear any pending timeout
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                          }
                          setHoveredCategory(category.id);
                        }}
                        onMouseLeave={() => {
                          // Add delay before closing
                          hoverTimeoutRef.current = setTimeout(() => {
                            // Only clear on desktop, keep on mobile if clicked
                            if (window.innerWidth >= 768) {
                              setHoveredCategory(null);
                              setClickedCategory(null);
                            }
                          }, 200); // 200ms delay
                        }}
                      >
                        <div 
                          className="bg-white rounded-lg shadow-2xl border border-gray-200 py-2" 
                          style={{ 
                            position: 'relative', 
                            zIndex: 10000,
                            display: 'block',
                            visibility: 'visible',
                            opacity: 1
                          }}
                        >
                          {category.children?.map((subCategory) => (
                            <div key={subCategory.id} className="relative group/sub">
                              <Link
                                href={`/categories/${subCategory.slug}`}
                                className="px-5 py-2.5 text-gray-900 hover:bg-[#febd69]/10 transition-colors flex items-center justify-between group-hover/sub:pl-6"
                                onClick={() => setClickedCategory(null)}
                              >
                                <span className="font-medium text-sm">{subCategory.name}</span>
                                {(subCategory.children && subCategory.children.length > 0) && (
                                  <svg className="w-4 h-4 text-gray-400 group-hover/sub:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </Link>
                              
                              {/* Sub-Sub Categories */}
                              {(subCategory.children && subCategory.children.length > 0) && (
                                <div 
                                  className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-2xl border border-gray-200 min-w-[200px] py-2 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all duration-200"
                                  style={{ zIndex: 10001, position: 'absolute' }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    // Keep parent dropdown open
                                    setHoveredCategory(category.id);
                                  }}
                                  onMouseLeave={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  {subCategory.children.map((subSubCategory) => (
                                    <Link
                                      key={subSubCategory.id}
                                      href={`/categories/${subSubCategory.slug}`}
                                      className="block px-5 py-2 text-gray-700 hover:bg-[#febd69]/10 transition-colors text-sm"
                                    >
                                      {subSubCategory.name}
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Auth Links */}
            <div className="flex items-center gap-4 ml-4 flex-shrink-0">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/profile" 
                    className="text-sm hover:text-[#febd69] transition-colors font-medium whitespace-nowrap"
                  >
                    {user?.name?.split(' ')[0] || t('account')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm hover:text-[#febd69] transition-colors font-medium whitespace-nowrap"
                  >
                    {t('signOut')}
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth/login" 
                    className="text-sm hover:text-[#febd69] transition-colors font-medium whitespace-nowrap"
                  >
                    {t('signIn')}
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="text-sm hover:text-[#febd69] transition-colors font-medium whitespace-nowrap"
                  >
                    {t('register')}
                  </Link>
                </>
              )}
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>

      {/* Main Header with Logo, Search, and Actions */}
      <div className="bg-[#131921]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex-shrink-0 flex items-center gap-2.5 sm:gap-3 group"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gradient-to-br from-teal-400 via-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg group-hover:shadow-xl transition-shadow">
                OM
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xl sm:text-2xl font-bold tracking-tight group-hover:text-[#febd69] transition-colors">
                  OpticalMarket
                </span>
                <span className="text-[10px] sm:text-xs text-gray-300 uppercase tracking-wider font-medium">
                  Optical Marketplace
                </span>
              </div>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-3xl hidden md:block">
              <div className="flex rounded-lg overflow-hidden shadow-md bg-white hover:shadow-lg transition-shadow">
                <div className="relative border-r border-gray-300">
                  <select
                    value={selectedCategoryId || ''}
                    onChange={(e) => {
                      const catId = e.target.value;
                      setSelectedCategoryId(catId ? parseInt(catId) : null);
                    }}
                    className="bg-gray-50 text-gray-700 px-4 py-2.5 text-sm focus:outline-none appearance-none pr-8 cursor-pointer hover:bg-gray-100 transition-colors font-medium"
                  >
                    <option value="">{t('allCategories')}</option>
                    {(() => {
                      const renderOptions = (cat: Category, prefix = ''): React.ReactElement[] => {
                        const options: React.ReactElement[] = [
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
                      const allOptions: React.ReactElement[] = [];
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
                  placeholder={t('searchPlaceholder')}
                  className="flex-1 px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#febd69]/50"
                />
                <button
                  type="submit"
                  className="bg-[#febd69] hover:bg-[#f3a847] px-6 sm:px-8 py-2.5 text-sm font-semibold text-gray-900 transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="hidden sm:inline">{t('search')}</span>
                </button>
              </div>
            </form>

            {/* Mobile Search Button */}
            <Link
              href="/products"
              className="md:hidden flex-1 flex items-center justify-center bg-white rounded-lg px-4 py-2.5 text-gray-500 text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>{t('search')}</span>
            </Link>

            {/* Cart & Account Section */}
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 flex-shrink-0">
              <div className="md:hidden">
                <LanguageSwitcher />
              </div>
              {/* Cart - Mobile optimized */}
              <Link
                href="/cart"
                className="relative hover:text-[#febd69] transition-colors group md:flex md:flex-col md:items-center"
              >
                <div className="relative">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#febd69] text-[#131921] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md min-w-[20px]">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-medium mt-0.5 hidden md:block">{t('cart')}</span>
              </Link>

              {/* Account - Mobile optimized */}
              {isAuthenticated ? (
                <Link
                  href="/profile"
                  className="hidden md:flex flex-col items-start hover:text-[#febd69] transition-colors group"
                >
                  <span className="text-[11px] text-gray-300 group-hover:text-gray-200">{t('hello')}, {user?.name?.split(' ')[0] || t('account')}</span>
                  <span className="text-sm font-semibold flex items-center gap-1">
                    {t('accountLists')}
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden md:flex flex-col items-start hover:text-[#febd69] transition-colors group"
                >
                  <span className="text-[11px] text-gray-300 group-hover:text-gray-200">{t('hello')}, {t('signIn')}</span>
                  <span className="text-sm font-semibold flex items-center gap-1">
                    {t('accountLists')}
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </Link>
              )}
              
              {/* Mobile Profile Icon */}
              <Link
                href={isAuthenticated ? "/profile" : "/auth/login"}
                className="md:hidden hover:text-[#febd69] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
