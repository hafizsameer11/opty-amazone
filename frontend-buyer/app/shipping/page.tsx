import type { Metadata } from 'next';
import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Shipping Info | Vista Express',
  description: 'How delivery works on Vista Express — seller-quoted shipping, dispatch times and tracking.',
};

export default function ShippingPage() {
  return (
    <StaticPageShell title="Shipping Info">
      <p>
        On <strong>Vista Express</strong>, each seller ships from their own location and sets their own
        delivery terms. This marketplace works differently from a single-retailer shop, and understanding
        how it works will make your order experience much smoother.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Delivery is quoted after you order</h2>
      <p>
        Delivery is not included in the price you see at checkout, and checkout shows shipping as
        &euro;0.00. No payment is taken when you place an order. Instead, each seller reviews the order and
        adds a delivery fee for your specific address. Once that happens the order page shows the updated
        total and a Pay button, and you decide whether to proceed.
      </p>
      <p>
        This means a single checkout can produce several store orders, each quoted and paid for separately.
        You will see one store order for every seller you bought from.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Estimated delivery times</h2>
      <p>
        Delivery time depends on the seller&apos;s warehouse, the product and the destination, so there is
        no single marketplace-wide figure. Sellers state their own handling time before quoting delivery.
        A common expectation within the European Union is{' '}
        <strong>3&ndash;10 business days</strong> after an order has been paid for and dispatched; remote
        areas can take longer. Prescription and made-to-order products add production time on top, which is
        noted on the product page.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Tracking your order</h2>
      <p>
        Once a seller dispatches your order, tracking details appear in your order details under{' '}
        <Link href="/orders" className="text-[#0066CC] hover:underline">
          My Orders
        </Link>
        , and we email you status updates as the order progresses. If tracking is still missing after the
        handling time the seller quoted, contact us with your order number.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Confirming you received your order</h2>
      <p>
        While an order is in transit the seller may ask you to share a 6-digit delivery confirmation code in
        the store chat. To protect you, that code is valid for 7 days, limited to 5 attempts, and repeated
        wrong entries lock it for 15 minutes. Only ever send a code to the seller you ordered from, through
        the store chat.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Fees, taxes and customs</h2>
      <p>
        The seller&apos;s delivery fee is always shown before you pay, so you approve the full amount before
        it is charged. VAT is included in product prices where applicable. Cross-border orders may attract
        customs duties or import charges in the destination country, which are the customer&apos;s
        responsibility where required by law.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Damaged or missing parcels</h2>
      <p>
        If a package arrives damaged or incomplete, photograph the outer packaging and the contents while
        everything is still present, then contact us within 48 hours of delivery with your order number. We
        will work with the seller to resolve it. Claims reported later than 48 hours can be difficult to
        verify.
      </p>
    </StaticPageShell>
  );
}