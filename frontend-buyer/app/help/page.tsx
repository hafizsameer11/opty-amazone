import type { Metadata } from 'next';
import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Help Center | Vista Express',
  description: 'Get help with orders, account, and shopping on Vista Express.',
};

export default function HelpPage() {
  return (
    <StaticPageShell title="Help Center">
      <p>
        Find answers to common questions about shopping on <strong>Vista Express</strong>. For order-specific
        issues, log in and check your order details, or contact us using the options below.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Orders & delivery</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          Track status from{' '}
          <Link href="/orders" className="text-[#0066CC] hover:underline">
            My Orders
          </Link>{' '}
          after signing in.
        </li>
        <li>
          Shipping times depend on the seller and destination—see{' '}
          <Link href="/shipping" className="text-[#0066CC] hover:underline">
            Shipping Info
          </Link>
          .
        </li>
      </ul>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Returns & refunds</h2>
      <p>
        Return windows and steps vary by product type and seller. Read our{' '}
        <Link href="/returns" className="text-[#0066CC] hover:underline">
          Returns
        </Link>{' '}
        page for an overview and how to start a return when eligible.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Account & security</h2>
      <p>
        Manage your profile, addresses, and password from{' '}
        <Link href="/profile" className="text-[#0066CC] hover:underline">
          Profile
        </Link>{' '}
        when logged in. Use a strong, unique password and never share your login with others.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Contact support</h2>
      <p>
        Email:{' '}
        <a href="mailto:support@vistaexpress.com" className="text-[#0066CC] hover:underline">
          support@vistaexpress.com
        </a>
        <br />
        Include your order number (if applicable) and a clear description of your request. We aim to
        respond within 1–2 business days.
      </p>
    </StaticPageShell>
  );
}
