import type { Metadata } from 'next';
import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Returns | Vista Express',
  description: 'How returns and refunds work on the Vista Express marketplace.',
};

export default function ReturnsPage() {
  return (
    <StaticPageShell title="Returns">
      <p>
        Vista Express is a <strong>marketplace</strong>: products are sold by independent sellers, so return
        eligibility, time limits and refund methods can differ per seller and per product. Your statutory
        rights as a consumer always apply regardless of this policy.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Return window</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          Many items qualify for return within <strong>14 days</strong> of delivery, provided they are
          unused, in their original packaging and with tags where applicable — unless the product page
          states otherwise.
        </li>
        <li>
          The return window runs from delivery, not from the dispatch date.
        </li>
        <li>
          If an item arrives faulty, damaged or not as described, contact us as soon as you notice. Faulty
          goods are covered regardless of the 14-day window.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Items that cannot be returned</h2>
      <p>
        For hygiene reasons, the following are excluded unless they are faulty or damaged on arrival:
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Opened contact lenses and eye-care products</li>
        <li>Personalised or made-to-order prescription lenses configured to your prescription</li>
        <li>Products returned after use where use affects resaleable condition</li>
      </ul>
      <p>
        Sellers may also set their own conditions on specific listings. Always check the product page
        before ordering a personalised or hygiene-sensitive item.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">How to request a return</h2>
      <p>
        Returns are not started inside the website. To request one:
      </p>
      <ol className="list-decimal pl-5 space-y-2">
        <li>
          Sign in and open the relevant order under{' '}
          <Link href="/orders" className="text-[#0066CC] hover:underline">
            My Orders
          </Link>
          .
        </li>
        <li>
          Email us at{' '}
          <a href="mailto:support@vistaexpress.com" className="text-[#0066CC] hover:underline">
            support@vistaexpress.com
          </a>{' '}
          with your order number, the store name and the reason for the return.
        </li>
        <li>
          We confirm with the seller whether the item is eligible and, if so, send you the return address
          and any packaging instructions.
        </li>
        <li>
          Send the item back using a tracked service and keep your proof of postage.
        </li>
      </ol>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Refunds</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          Refunds are issued to your original payment method once the seller has received and inspected the
          returned item.
        </li>
        <li>
          Where a refund is approved, it returns to your Vista Express wallet. You can then use that balance
          for a new order or withdraw it from{' '}
          <Link href="/profile" className="text-[#0066CC] hover:underline">
            Profile &rarr; Wallet
          </Link>
          .
        </li>
        <li>
          Original delivery charges are refundable where the return is caused by a fault, damage or an
          incorrect item.
        </li>
        <li>
          Buyers pay the return postage where they are withdrawing from a change of mind. Faulty or
          incorrect items are returned at no cost to you.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Cancellation</h2>
      <p>
        Because nothing is paid for at checkout, you can cancel a store order free of charge at any point
        before it is paid for and handed to the seller for dispatch. After that, please contact us and we
        will help you and the seller agree a resolution.
      </p>

      <p>
        For the full legal terms, see our{' '}
        <Link href="/terms" className="text-[#0066CC] hover:underline">
          Terms of Service
        </Link>
        . Questions? Email{' '}
        <a href="mailto:support@vistaexpress.com" className="text-[#0066CC] hover:underline">
          support@vistaexpress.com
        </a>
        .
      </p>
    </StaticPageShell>
  );
}