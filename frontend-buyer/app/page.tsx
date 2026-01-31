'use client';

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

// Mock product data - will be replaced with API calls later
const mockProducts = [
  {
    id: 1,
    name: "Classic Round Frame Glasses",
    price: 89.99,
    images: ["/file.svg", "/globe.svg"],
    frameColors: ["#111827", "#1f2937", "#4b5563"],
    rating: 4.5,
    reviews: 234,
  },
  {
    id: 2,
    name: "Aviator Sunglasses",
    price: 129.99,
    images: ["/globe.svg", "/window.svg"],
    frameColors: ["#111827", "#f59e0b", "#f97316"],
    rating: 4.8,
    reviews: 456,
  },
  {
    id: 3,
    name: "Designer Cat-Eye Frames",
    price: 159.99,
    images: ["/window.svg", "/vercel.svg"],
    frameColors: ["#db2777", "#7c3aed", "#2563eb"],
    rating: 4.6,
    reviews: 189,
  },
  {
    id: 4,
    name: "Titanium Lightweight Frames",
    price: 199.99,
    images: ["/vercel.svg", "/file.svg"],
    frameColors: ["#0f172a", "#6b7280", "#9ca3af"],
    rating: 4.9,
    reviews: 567,
  },
  {
    id: 5,
    name: "Wayfarer Sunglasses",
    price: 79.99,
    images: ["/file.svg", "/globe.svg"],
    frameColors: ["#111827", "#22c55e", "#0ea5e9"],
    rating: 4.4,
    reviews: 312,
  },
  {
    id: 6,
    name: "Progressive Lens Frames",
    price: 249.99,
    images: ["/globe.svg", "/window.svg"],
    frameColors: ["#1d4ed8", "#4f46e5", "#0f766e"],
    rating: 4.7,
    reviews: 145,
  },
];

// Top image banners - to be replaced with admin-managed banners
const adminBanners = [
  {
    id: 1,
    href: "/collections/blue-light",
    image:
      "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1600&q=80",
    alt: "Blue light protection collection banner",
  },
  {
    id: 2,
    href: "/collections/premium-lenses",
    image:
      "https://images.unsplash.com/photo-1512106378517-16c2f2d81b56?auto=format&fit=crop&w=1600&q=80",
    alt: "Premium lens upgrade banner",
  },
];

// Mock seller banners - to be replaced with seller store banners from backend
const sellerBanners = [
  {
    id: 1,
    storeName: "VisionPro Optics",
    title: "Exclusive Designer Frames",
    subtitle: "Limited-time offers from VisionPro Optics",
    href: "/stores/visionpro",
    coverImage:
      "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80",
    logoImage:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: 2,
    storeName: "SunShade Studio",
    title: "Summer Sunglasses Festival",
    subtitle: "Top-rated sunglasses from SunShade Studio",
    href: "/stores/sunshade-studio",
    coverImage:
      "https://images.unsplash.com/photo-1516575150278-77136aed6920?auto=format&fit=crop&w=1200&q=80",
    logoImage:
      "https://images.unsplash.com/photo-1598970605070-ffb66fba595c?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: 3,
    storeName: "ClearSight Contact Hub",
    title: "Daily & Monthly Lenses",
    subtitle: "Best deals on contact lenses",
    href: "/stores/clearsight-contact-hub",
    coverImage:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    logoImage:
      "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=300&q=80",
  },
];

type Product = (typeof mockProducts)[number];

function ProductCard({ product }: { product: Product }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleColorClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex(index);
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group relative flex flex-col h-full"
    >
      <div className="relative w-full h-32 sm:h-36 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={product.images[activeImageIndex] ?? product.images[0]}
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
                className="w-3.5 h-3.5 fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">
            ({product.reviews})
          </span>
        </div>
        {/* Color options */}
        <div className="flex items-center gap-1.5 mb-2">
          {product.frameColors.map((color, index) => (
            <button
              key={color}
              type="button"
              onClick={(e) => handleColorClick(e, index)}
              className={`h-3.5 w-3.5 rounded-full border ${
                index === activeImageIndex
                  ? "border-[#0066CC] ring-2 ring-[#0066CC]/30"
                  : "border-white"
              } shadow-sm transition-all`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="text-base md:text-lg font-bold text-[#0066CC]">
            ${product.price.toFixed(2)}
          </div>
          <span className="inline-flex items-center rounded-full border border-[#0066CC]/15 bg-[#0066CC]/5 px-2.5 py-1 text-[11px] font-semibold text-[#0066CC]">
            Prime Vision
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Top image banners */}
        <section className="w-full px-1 sm:px-2 lg:px-0 pt-4 md:pt-6">
          <div className="grid md:grid-cols-3 gap-3 md:gap-4">
            {adminBanners.map((banner) => (
              <Link
                key={banner.id}
                href={banner.href}
                className="rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md border border-gray-200 transition-shadow"
              >
                <div className="relative w-full h-28 md:h-36 bg-white">
        <Image
                    src={banner.image}
                    alt={banner.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {mockProducts.slice(0, 8).map((product) => (
                <div key={product.id} className="h-full">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
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
            <div className="flex gap-3 md:gap-3.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300">
              {sellerBanners.map((banner) => (
                <Link
                  key={banner.id}
                  href={banner.href}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex-shrink-0 w-[320px] sm:w-[360px] lg:w-[420px] overflow-hidden"
                >
                  <div className="flex h-full">
                    {/* Cover image - left side */}
                    <div className="relative w-2/5 min-w-[140px] h-full">
                      <Image
                        src={banner.coverImage}
                        alt={banner.storeName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    {/* Content - right side */}
                    <div className="relative flex-1 px-4 py-4 bg-white flex flex-col">
                      {/* Logo avatar */}
                      <div className="absolute -top-4 left-4 h-12 w-12 rounded-full border-4 border-white overflow-hidden shadow-md bg-gray-100">
                        <Image
                          src={banner.logoImage}
                          alt={`${banner.storeName} logo`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="mt-6 flex-1 flex flex-col">
                        <p className="text-[11px] font-semibold text-[#00CC66] uppercase mb-1">
                          Featured Seller
                        </p>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                          {banner.storeName}
                        </h3>
                        <p className="text-sm font-medium text-gray-800 mb-1 line-clamp-1">
                          {banner.title}
                        </p>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {banner.subtitle}
                        </p>
                        {/* Stats row (placeholder values for now) */}
                        <div className="flex items-center justify-between text-[11px] text-gray-600 mb-3">
                          <div className="flex flex-col">
                            <span className="font-medium">Qty Sold</span>
                            <span className="font-semibold text-gray-900">
                              23
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">Followers</span>
                            <span className="font-semibold text-gray-900">
                              4
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">Rating</span>
                            <span className="font-semibold text-gray-900">
                              4.8★
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
          </div>
        </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
