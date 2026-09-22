'use client';

import Link from 'next/link';
import BuyerAuthShell from '@/components/auth/BuyerAuthShell';

export default function RegisterChoosePage() {
  return (
    <BuyerAuthShell eyebrow="Welcome to VistaExpress" title="How will you use the marketplace?" description="Choose the experience that fits you. You can always return here if your goals change." wideForm>
      <div className="mb-7"><p className="text-lg font-bold text-slate-950">Choose your path</p><p className="mt-1 text-sm text-slate-500">Both experiences are built for optical businesses and shoppers.</p></div>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/auth/register/buyer" className="group rounded-2xl border border-[#b9e5e1] bg-[#f2fbfa] p-5 transition hover:-translate-y-0.5 hover:border-[#087f8c] hover:shadow-lg hover:shadow-cyan-900/10">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl text-[#087f8c] shadow-sm">⌕</span>
          <h2 className="text-lg font-bold text-slate-950">I want to shop</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Discover glasses, lenses, and eye care from trusted optical stores.</p>
          <span className="mt-5 inline-flex text-sm font-bold text-[#087f8c] group-hover:gap-2">Create buyer account <span className="ml-1">→</span></span>
        </Link>
        <a href="https://seller.vistaexpress.it/auth/register" className="group rounded-2xl border border-[#f2d7b7] bg-[#fff8ed] p-5 transition hover:-translate-y-0.5 hover:border-[#f29b66] hover:shadow-lg hover:shadow-orange-900/10">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl text-[#c26d3e] shadow-sm">⌂</span>
          <h2 className="text-lg font-bold text-slate-950">I want to sell</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Open your optical store, list products, and manage customer orders.</p>
          <span className="mt-5 inline-flex text-sm font-bold text-[#c26d3e]">Open seller account <span className="ml-1">↗</span></span>
        </a>
      </div>
      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">Already have a buyer account? <Link href="/auth/login" className="font-bold text-[#087f8c] hover:text-[#05616b]">Sign in</Link></div>
    </BuyerAuthShell>
  );
}
