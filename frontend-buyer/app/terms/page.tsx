import type { Metadata } from 'next';
import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service | Vista Express',
  description: 'Terms governing use of the Vista Express marketplace.',
};

export default function TermsPage() {
  return (
    <StaticPageShell title="Terms of Service">
      <p className="text-sm text-gray-500">Last updated: {new Date().getFullYear()}</p>
      <p>
        These Terms of Service (“Terms”) govern your use of the <strong>Vista Express</strong> marketplace
        and related services. By accessing or using Vista Express, you agree to these Terms.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">The marketplace</h2>
      <p>
        Vista Express provides a platform where third-party sellers list and sell products. We are not the
        seller of items listed by independent stores unless expressly stated. Contracts for products are
        between you and the relevant seller; Vista Express facilitates the transaction and platform services.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Accounts</h2>
      <p>
        You must provide accurate information and keep your credentials secure. You are responsible for
        activity under your account. We may suspend or terminate accounts that violate these Terms or
        applicable law.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Products & prescriptions</h2>
      <p>
        Optical and medical-device products may require valid prescriptions or professional fitting where
        required by law. You are responsible for ensuring that orders comply with applicable regulations.
        Product descriptions are provided by sellers; verify details before purchase.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Pricing & payment</h2>
      <p>
        Prices, fees, and taxes are shown at checkout. Payment processing is handled by secure third-party
        providers. We may update platform fees or policies with notice where required.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Vista Express is not liable for indirect or consequential
        damages arising from use of the platform. Our total liability for any claim related to the services
        is limited as permitted by applicable law. Nothing in these Terms excludes liability that cannot
        legally be excluded.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Governing law</h2>
      <p>
        These Terms are interpreted in accordance with applicable laws of the jurisdiction that governs your
        contract with Vista Express, without regard to conflict-of-law rules. Disputes may be subject to the
        courts of that jurisdiction unless mandatory consumer protections in your country say otherwise.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Contact</h2>
      <p>
        Questions about these Terms:{' '}
        <a href="mailto:legal@vistaexpress.com" className="text-[#0066CC] hover:underline">
          legal@vistaexpress.com
        </a>
        . See also our{' '}
        <Link href="/privacy" className="text-[#0066CC] hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </StaticPageShell>
  );
}
