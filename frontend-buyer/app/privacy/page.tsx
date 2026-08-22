import type { Metadata } from 'next';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy | Vista Express',
  description: 'How Vista Express collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <StaticPageShell title="Privacy Policy">
      <p className="text-sm text-gray-500">Last updated: {new Date().getFullYear()}</p>
      <p>
        This Privacy Policy describes how <strong>Vista Express</strong> (“we”, “us”) handles personal data
        when you use our marketplace website and related services.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Data we collect</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Account data:</strong> name, email, phone (if provided), and credentials you use to
          register.
        </li>
        <li>
          <strong>Order data:</strong> delivery address, payment-related references (processing is handled
          by payment providers; we do not store full card numbers on our servers).
        </li>
        <li>
          <strong>Technical data:</strong> IP address, device/browser type, and cookies necessary for
          security and preferences.
        </li>
      </ul>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">How we use data</h2>
      <p>
        We use your data to operate the marketplace: process orders, communicate about purchases, prevent
        fraud, improve our services, and comply with legal obligations. Sellers receive the information
        needed to fulfill your orders (e.g. shipping address).
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Legal basis (EEA/UK)</h2>
      <p>
        Where applicable, we rely on performance of a contract, legitimate interests (e.g. fraud prevention),
        and consent where required (e.g. certain marketing cookies or emails).
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Retention</h2>
      <p>
        We keep data only as long as needed for the purposes above and as required by law (e.g. accounting
        records).
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, rectify, delete, restrict, or object to
        processing of your personal data, and to lodge a complaint with a supervisory authority. Contact us
        at{' '}
        <a href="mailto:privacy@vistaexpress.com" className="text-[#0066CC] hover:underline">
          privacy@vistaexpress.com
        </a>
        .
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Contact</h2>
      <p>
        For privacy questions:{' '}
        <a href="mailto:privacy@vistaexpress.com" className="text-[#0066CC] hover:underline">
          privacy@vistaexpress.com
        </a>
      </p>
    </StaticPageShell>
  );
}
