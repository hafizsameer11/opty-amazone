'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { productService, type Product } from "@/services/product-service";
import { StoreService, type PublicStore } from "@/services/store-service";
import Loader from "@/components/ui/Loader";

function ProductCard({ product }: { product: Product }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = product.images || [];
  const firstImage = images[0] || '/file.svg';

  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group relative flex flex-col h-full"
    >
      <div className="relative w-full h-32 sm:h-36 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={firstImage}
            alt={product.name}
            width={180}
            height={130}
            className="object-contain max-h-[70%] transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>
      <div className="p-3 md:p-4 flex-1 flex flex-col min-h-[170px]">
        <h3 className="font-semibold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-[#0066CC] transition-colors text-sm md:text-[15px] break-words">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-1.5">
          <div className="flex text-yellow-400 text-xs">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.floor(product.rating) ? 'fill-current' : 'text-gray-300'
                }`}
                viewBox="0 0 20 20"
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">
            ({product.review_count})
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="text-base md:text-lg font-bold text-[#0066CC]">
            €{Number(product.price || 0).toFixed(2)}
          </div>
          {product.compare_at_price && Number(product.compare_at_price) > Number(product.price || 0) && (
            <span className="text-xs text-gray-500 line-through">
              €{Number(product.compare_at_price || 0).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);

  useEffect(() => {
    loadProducts();
    loadStores();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll({ per_page: 8, sort_by: 'view_count', sort_order: 'desc' });
      setProducts(data.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      setLoadingStores(true);
      const data = await StoreService.getAllStores({ per_page: 6 });
      setStores(data.stores || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoadingStores(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />

      <main className="flex-1">
        <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8">

        {/* Top selling products */}
        <section className="w-full px-1 sm:px-2 lg:px-0 pb-4 md:pb-6">
          <div className="rounded-t-2xl bg-[#0052a3] text-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm md:text-base font-semibold uppercase tracking-wide">
              Top Selling Products
            </h2>
            <Link
              href="/products"
              className="text-xs md:text-sm font-semibold hover:text-blue-100"
            >
              View All
            </Link>
          </div>
          <div className="bg-white rounded-b-2xl shadow-sm px-2 sm:px-3.5 py-4 sm:py-5">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {products.map((product) => (
                  <div key={product.id} className="h-full">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 py-8">No products available</p>
            )}
          </div>
        </section>

        {/* Categories Section */}
        <section className="w-full px-1 sm:px-2 lg:px-0 pb-4 md:pb-6">
          <div className="rounded-t-2xl bg-[#0066CC] text-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm md:text-base font-semibold uppercase tracking-wide">
              Categories
            </h2>
            <Link
              href="/categories"
              className="text-xs md:text-sm font-semibold hover:text-blue-100"
            >
              View All
            </Link>
          </div>
          <div className="bg-white rounded-b-2xl shadow-sm px-1.5 sm:px-3 py-4 sm:py-5">
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300">
            {[
              { name: "Frames", href: "/categories/frames", icon: "👓", color: "from-sky-500/15 to-sky-500/0" },
              { name: "Sunglasses", href: "/categories/sunglasses", icon: "🕶️", color: "from-amber-500/15 to-amber-500/0" },
              { name: "Contact Lenses", href: "/categories/contact-lenses", icon: "🔍", color: "from-emerald-500/15 to-emerald-500/0" },
              { name: "Eye Hygiene", href: "/categories/eye-hygiene", icon: "💧", color: "from-cyan-500/15 to-cyan-500/0" },
              { name: "Accessories", href: "/categories/accessories", icon: "🎁", color: "from-violet-500/15 to-violet-500/0" },
            ].map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="relative bg-white rounded-lg shadow-sm p-5 text-center hover:shadow-md transition-all border border-gray-200 overflow-hidden group min-w-[130px] sm:min-w-[150px]"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative flex flex-col items-center">
                  <div className="text-3xl mb-2">{category.icon}</div>
                  <div className="font-semibold text-gray-900 text-sm md:text-base">
                    {category.name}
                  </div>
                  <span className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gray-500">
                    Shop now
                  </span>
                </div>
              </Link>
            ))}
            </div>
          </div>
        </section>

        {/* Stores / Top sellers */}
        <section className="w-full px-1 sm:px-2 lg:px-0 pb-8 md:pb-10">
          <div className="rounded-t-2xl bg-[#00CC66] text-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm md:text-base font-semibold uppercase tracking-wide">
              Top Stores
            </h2>
            <Link
              href="/stores"
              className="text-xs md:text-sm font-semibold hover:text-emerald-100"
            >
              View All
            </Link>
        </div>
          <div className="bg-white rounded-b-2xl shadow-sm px-1.5 sm:px-3 py-4 sm:py-5">
            {loadingStores ? (
              <div className="flex gap-3 md:gap-3.5 overflow-x-auto pb-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-shrink-0 w-[320px] sm:w-[360px] lg:w-[420px] h-[180px] bg-gray-200 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : stores.length > 0 ? (
              <div className="flex gap-3 md:gap-3.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300">
                {stores.map((store) => (
                  <Link
                    key={store.id}
                    href={`/stores/${store.id}`}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex-shrink-0 w-[320px] sm:w-[360px] lg:w-[420px] overflow-hidden"
                  >
                    <div className="flex h-full">
                      {/* Cover image - left side */}
                      <div className="relative w-2/5 min-w-[140px] h-full bg-gradient-to-br from-gray-100 to-gray-200">
                        {store.banner_image ? (
                          <Image
                            src={store.banner_image}
                            alt={store.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Content - right side */}
                      <div className="relative flex-1 px-4 py-4 bg-white flex flex-col">
                        {/* Logo avatar */}
                        <div className="absolute -top-4 left-4 h-12 w-12 rounded-full border-4 border-white overflow-hidden shadow-md bg-gray-100">
                          {store.profile_image ? (
                            <Image
                              src={store.profile_image}
                              alt={`${store.name} logo`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0066CC] to-[#0052a3] text-white font-bold text-lg">
                              {store.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="mt-6 flex-1 flex flex-col">
                          <p className="text-[11px] font-semibold text-[#00CC66] uppercase mb-1">
                            Featured Seller
                          </p>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                            {store.name}
                          </h3>
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                            {store.description || 'Premium optical products and services'}
                          </p>
                          {/* Stats row */}
                          <div className="flex items-center justify-between text-[11px] text-gray-600 mb-3">
                            <div className="flex flex-col">
                              <span className="font-medium">Products</span>
                              <span className="font-semibold text-gray-900">
                                {store.products_count || 0}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">Followers</span>
                              <span className="font-semibold text-gray-900">
                                {store.followers_count || 0}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">Rating</span>
                              <span className="font-semibold text-gray-900">
                                {store.rating ? `${Number(store.rating).toFixed(1)}★` : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="mt-auto w-full inline-flex items-center justify-center rounded-full bg-[#0066CC] hover:bg-[#0052a3] text-white text-sm font-semibold py-2.5 transition-colors"
                          >
                            Go to Shop
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                <p>No stores available at the moment.</p>
              </div>
            )}
          </div>
        </section>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
