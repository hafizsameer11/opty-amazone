import type { Metadata } from 'next';
import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Returns | Vista Express',
  description: 'Vista Express marketplace returns and refund policy overview.',
};

export default function ReturnsPage() {
  return (
    <StaticPageShell title="Returns">
      <p>
        Vista Express is a <strong>marketplace</strong>: products are sold by independent sellers. Return
        eligibility, time limits, and refund methods may depend on the seller, product category (e.g.
        custom prescription lenses), and local consumer law.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Standard policy overview</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          Many items qualify for return within <strong>14 days</strong> of delivery if unused, in original
          packaging, and with tags where applicable—unless stated otherwise on the product page.
        </li>
        <li>
          Hygiene-sensitive or personalized items (e.g. opened contact lenses, made-to-order lenses) may be
          non-returnable unless defective—check the seller’s terms at checkout.
        </li>
        <li>Refunds are typically issued to the original payment method after the seller receives and inspects the return.</li>
      </ul>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">How to start a return</h2>
      <ol className="list-decimal pl-5 space-y-2">
        <li>Sign in and open your order in the orders section.</li>
        <li>Request a return following the on-screen steps, or contact support with your order number.</li>
        <li>Ship the item back using the instructions provided by the seller or support.</li>
      </ol>
      <p>
        For full legal terms, see our{' '}
        <Link href="/terms" className="text-[#0066CC] hover:underline">
          Terms of Service
        </Link>
        . Questions?{' '}
        <a href="mailto:support@vistaexpress.com" className="text-[#0066CC] hover:underline">
          support@vistaexpress.com
        </a>
      </p>
    </StaticPageShell>
  );
}
