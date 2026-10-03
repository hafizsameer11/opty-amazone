import type { Metadata } from 'next';
import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Affiliate Program | Vista Express',
  description: 'Earn commission on Vista Express sales as an affiliate partner, and how the referral programme works.',
};

export default function AffiliatePage() {
  return (
    <StaticPageShell title="Affiliate Program">
      <p>
        Vista Express pays partners for sales they send our way. There are two ways to earn: the{' '}
        <strong>referral programme</strong>, which every shopper can join for free from their account, and
        the <strong>affiliate programme</strong>, for publishers, creators and agencies who promote the
        marketplace on an ongoing basis.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Referral programme</h2>
      <p>
        Every registered shopper receives a personal referral code. Share it with friends; when they create
        an account and complete their first order, you are both rewarded.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>&euro;10 for you</strong> and <strong>&euro;10 off for your friend</strong> on their first
          order, credited as wallet balance once that order is paid for and delivered.
        </li>
        <li>
          <strong>30-day attribution.</strong> Your referral is credited if your friend signs up within 30
          days of using your code or link.
        </li>
        <li>
          <strong>14-day waiting period.</strong> The reward is released after the referred order has
          completed, which prevents rewards being claimed on cancelled orders.
        </li>
        <li>
          <strong>One reward per person.</strong> Each referred buyer can generate a single reward, and the
          referred buyer must verify their email address before their order qualifies.
        </li>
        <li>
          <strong>No monthly cap</strong> on referral rewards, and no minimum order value on the referred
          order.
        </li>
        <li>
          <strong>Cannot be combined</strong> with other platform promotional discounts on the same order.
        </li>
      </ul>
      <p>
        Find and share your code under{' '}
        <Link href="/profile" className="text-[#0066CC] hover:underline">
          Profile &rarr; Referrals
        </Link>
        . Individual stores also run their own referral campaigns, which you may find on the store page.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Affiliate programme</h2>
      <p>
        Affiliates promote Vista Express across their own channels and earn commission on qualifying sales.
        Applications are reviewed individually, so commission rates, cookie window and payout schedule are
        set in your affiliate agreement rather than advertised as a single fixed rate.
      </p>
      <h3 className="text-lg font-semibold text-gray-900 pt-2">Who we work with</h3>
      <ul className="list-disc pl-5 space-y-2">
        <li>Optical and eyewear reviewers, comparison sites and buying guides</li>
        <li>Content creators in lifestyle, health, fashion and fitness</li>
        <li>Opticians and eye-care professionals with an online audience</li>
        <li>Newsletter publishers and deal communities</li>
      </ul>

      <h3 className="text-lg font-semibold text-gray-900 pt-2">How it works</h3>
      <ol className="list-decimal pl-5 space-y-2">
        <li>Send us your website or channel, audience size, main categories and target countries.</li>
        <li>We review the application and reply with tracking details and your commission terms.</li>
        <li>You share your tracked links through our network.</li>
        <li>Qualifying sales are credited to you, and you are paid on the schedule in your agreement.</li>
      </ol>

      <h3 className="text-lg font-semibold text-gray-900 pt-2">Apply</h3>
      <p>
        Email{' '}
        <a href="mailto:affiliates@vistaexpress.com" className="text-[#0066CC] hover:underline">
          affiliates@vistaexpress.com
        </a>{' '}
        with your website or channel URL, audience size and region. Please note that only approved
        relationships receive commission, and that commissions are never paid on self-referred or
        incentivised traffic.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Questions</h2>
      <p>
        For referral questions, use your{' '}
        <Link href="/profile" className="text-[#0066CC] hover:underline">
          Referrals
          </Link>{' '}
        page. For anything else about selling and partnerships, see the{' '}
        <Link href="/help" className="text-[#0066CC] hover:underline">
          Help Center
        </Link>{' '}
        or contact{' '}
        <a href="mailto:support@vistaexpress.com" className="text-[#0066CC] hover:underline">
          support@vistaexpress.com
        </a>
        .
      </p>
    </StaticPageShell>
  );
}