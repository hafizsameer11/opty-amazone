import type { Metadata } from 'next';
import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';
import { getSellerAppBaseUrl } from '@/lib/seller-app-url';

export const metadata: Metadata = {
  title: 'Sell on Vista Express',
  description: 'Open your store on Vista Express and reach customers looking for optical products.',
};

export default function SellPage() {
  const sellerBase = getSellerAppBaseUrl();
  const sellerRegister = `${sellerBase}/auth/register`;
  const sellerLogin = `${sellerBase}/auth/login`;

  return (
    <StaticPageShell title="Sell on Vista Express">
      <p>
        <strong>Vista Express</strong> helps optical retailers, brands, and qualified sellers reach buyers
        across our marketplace. List products, manage orders, and grow your business with tools built for
        eyewear and eye care categories.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Why sell with us</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Exposure to customers actively shopping for glasses, lenses, and related products</li>
        <li>Store profile, banners, and promotional options</li>
        <li>Order and inventory workflows designed for multi-seller retail</li>
      </ul>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Get started</h2>
      <p>
        Seller registration and onboarding run on the <strong>Vista Express seller portal</strong>—a
        separate site from this buyer shop. Use the links below to create a seller account or sign in to
        your store dashboard.
      </p>

      <div className="not-prose my-6 rounded-2xl border border-[#0066CC]/20 bg-gradient-to-br from-[#0066CC]/5 to-[#0052a3]/5 p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0066CC]">Seller portal</p>
        <p className="mt-2 text-[15px] text-gray-700">
          Opens at{' '}
          <span className="font-medium text-gray-900">{sellerBase}</span>
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={sellerRegister}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[#0066CC] px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#0052a3]"
          >
            Register as a seller
          </a>
          <a
            href={sellerLogin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border-2 border-[#0066CC] bg-white px-6 py-3 text-center text-sm font-semibold text-[#0066CC] transition hover:bg-[#0066CC]/5"
          >
            Seller sign in
          </a>
          <a
            href={sellerBase}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-center text-sm font-semibold text-[#0066CC] underline-offset-2 hover:underline"
          >
            Open seller home
          </a>
        </div>
      </div>

      <p>
        Business questions:{' '}
        <a href="mailto:sellers@vistaexpress.com" className="text-[#0066CC] hover:underline">
          sellers@vistaexpress.com
        </a>
      </p>
      <p>
        <Link href="/auth/register" className="text-[#0066CC] font-semibold hover:underline">
          Create a buyer account
        </Link>{' '}
        to shop on Vista Express (buyer accounts are separate from seller accounts).
      </p>
    </StaticPageShell>
  );
}
