import type { Metadata } from 'next';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Shipping Info | Vista Express',
  description: 'How shipping works on Vista Express — delivery times, carriers, and tracking.',
};

export default function ShippingPage() {
  return (
    <StaticPageShell title="Shipping Info">
      <p>
        On <strong>Vista Express</strong>, each seller ships from their own location. Delivery times, courier
        choices, and shipping fees are shown at checkout and on the order confirmation when available.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Delivery times</h2>
      <p>
        Estimated delivery is typically <strong>3–10 business days</strong> within the European Union,
        depending on the seller’s warehouse, product availability, and carrier. Remote areas may take
        longer. Custom or prescription products may require additional production time—see product details.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Tracking</h2>
      <p>
        When your order ships, you should receive tracking information by email or in your account order
        details. If tracking is missing after the stated handling time, contact{' '}
        <a href="mailto:support@vistaexpress.com" className="text-[#0066CC] hover:underline">
          support@vistaexpress.com
        </a>{' '}
        with your order number.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Fees & taxes</h2>
      <p>
        Shipping costs and any applicable VAT or duties are displayed before you pay. Cross-border orders
        may be subject to customs rules in the destination country—customers are responsible for any
        import charges where required by law.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Damaged or missing parcels</h2>
      <p>
        If your package arrives damaged or incomplete, photograph the packaging and items and contact
        support within 48 hours of delivery. We will work with the seller to resolve the issue.
      </p>
    </StaticPageShell>
  );
}
