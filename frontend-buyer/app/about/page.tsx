import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us | Vista Express',
  description:
    'Learn about Vista Express — the marketplace for eyewear, contact lenses, and eye care products across Europe.',
};

function IconSpark() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function IconShop() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function IconSupport() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

const features = [
  {
    title: 'Curated catalog',
    body: 'Frames, sunglasses, contact lenses, eye hygiene, and accessories from vetted sellers in one place.',
    icon: IconShop,
  },
  {
    title: 'Transparent shopping',
    body: 'Clear product details and seller storefronts so you can compare and choose with confidence.',
    icon: IconSpark,
  },
  {
    title: 'Seller tools',
    body: 'Partners get inventory, orders, and promotions built for optical retail—not generic e‑commerce.',
    icon: IconUsers,
  },
  {
    title: 'We are here to help',
    body: 'Support for orders, returns, and questions—because buying for your eyes should feel straightforward.',
    icon: IconSupport,
  },
];

export default function AboutPage() {
  return (
    <div className="bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0066CC] via-[#0052a3] to-[#0a1628] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 0%, transparent 45%), radial-gradient(circle at 80% 20%, #00CC66 0%, transparent 35%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 md:pb-20 md:pt-14">
          <nav className="mb-8 text-sm text-blue-100/90" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <span className="mx-2 text-blue-200/60">/</span>
            <span className="font-medium text-white">About us</span>
          </nav>

          <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl lg:max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
                Vista Express
              </p>
              <h1 className="font-bold tracking-tight text-4xl leading-[1.1] md:text-5xl">
                Your marketplace for optical solutions
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-blue-100/95 md:text-xl">
                We connect people who need quality eyewear and eye care with trusted sellers and optical
                professionals—simple, modern, and built around how you shop today.
              </p>
            </div>
            <div className="flex w-full max-w-[280px] shrink-0 flex-col items-center rounded-2xl bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur-sm sm:max-w-xs">
              <Image
                src="/vistaexpress-logo.png"
                alt="Vista Express"
                width={260}
                height={100}
                className="mb-4 h-24 w-auto max-w-full object-contain drop-shadow-md"
                priority
              />
              <p className="text-center text-sm text-blue-100/90">Optical solutions marketplace</p>
            </div>
          </div>
        </div>
      </section>

      {/* Overlap card — mission */}
      <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 pb-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/50 md:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#0066CC]">Our mission</h2>
            <p className="mt-4 text-xl font-semibold text-gray-900 md:text-2xl md:leading-snug">
              Make it easier to discover quality products, compare options, and shop with confidence—whether
              you are updating your look, replacing contact lenses, or caring for your eyes every day.
            </p>
          </div>
        </div>
      </section>

      {/* What we offer — grid */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">What we offer</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Everything you need from a marketplace focused on optics—not generic retail.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
          {features.map(({ title, body, icon: Icon }) => (
            <div
              key={title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md md:p-8"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0066CC]/10 to-[#0052a3]/5 text-[#0066CC] transition-transform group-hover:scale-105">
                <Icon />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story strip */}
      <section className="border-y border-gray-200 bg-white py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16 md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Built for buyers & sellers</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
                <strong className="text-gray-900">Vista Express</strong> is an online marketplace dedicated to
                optical solutions: prescription eyewear, sunglasses, contact lenses, eye hygiene products,
                and accessories. Customers get choice and clarity; sellers get a platform that understands
                their categories and customers.
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/80 p-8 ring-1 ring-gray-100">
              <ul className="space-y-4 text-[15px] text-gray-700">
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0066CC]" />
                  Multi-seller catalog with real storefronts
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0066CC]" />
                  Product information you can trust
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0066CC]" />
                  Support when you need it
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 md:pb-20">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0066CC] to-[#004080] p-8 text-white shadow-lg md:flex md:items-center md:justify-between md:p-10">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold md:text-2xl">Questions about Vista Express?</h2>
            <p className="mt-2 text-blue-100/95">
              Our team is happy to hear from you—whether you are shopping, selling, or just exploring.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-0">
            <a
              href="mailto:support@vistaexpress.com"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-center text-sm font-semibold text-[#0066CC] shadow-sm transition hover:bg-blue-50"
            >
              support@vistaexpress.com
            </a>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Browse products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
