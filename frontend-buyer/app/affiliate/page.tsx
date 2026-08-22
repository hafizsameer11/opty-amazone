import type { Metadata } from 'next';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Affiliate Program | Vista Express',
  description: 'Earn commissions by promoting Vista Express and driving qualified sales.',
};

export default function AffiliatePage() {
  return (
    <StaticPageShell title="Affiliate Program">
      <p>
        The Vista Express <strong>Affiliate Program</strong> rewards publishers, influencers, and partners
        who refer customers to our marketplace. When your audience shops through your tracked links, you can
        earn commissions on qualifying purchases according to your agreement.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Who can join</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Content creators and bloggers in lifestyle, health, and fashion</li>
        <li>Comparison and review sites</li>
        <li>Optical professionals with an online audience (subject to approval)</li>
      </ul>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">How to apply</h2>
      <p>
        Send a brief description of your website or channel, audience size, and region to{' '}
        <a href="mailto:affiliates@vistaexpress.com" className="text-[#0066CC] hover:underline">
          affiliates@vistaexpress.com
        </a>
        . Our team will review applications and respond with next steps, terms, and tracking options.
      </p>
      <p className="text-sm text-gray-500">
        Commission structures, cookie duration, and eligibility vary by market and campaign. Details are
        provided in the affiliate agreement upon approval.
      </p>
    </StaticPageShell>
  );
}
