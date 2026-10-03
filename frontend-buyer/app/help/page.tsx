import type { Metadata } from 'next';
import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Help Center | Vista Express',
  description: 'Help with orders, delivery, returns, payments, and your Vista Express account.',
};

const policyStyle = { fontWeight: 600, color: '#0066CC' } as const;

export default function HelpPage() {
  return (
    <StaticPageShell title="Help Center">
      <p>
        Everything about shopping on Vista Express: how orders and payment work, delivery and returns,
        your account and wallet, and how to reach us. If you cannot find your answer here, email{' '}
        <a href="mailto:support@vistaexpress.com" className="text-[#0066CC] hover:underline">
          support@vistaexpress.com
        </a>{' '}
        with your order number and we will reply within 1–2 business days.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Shopping and orders</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>Placing an order.</span> Add products to your cart, choose a delivery
          address, and confirm. You can follow progress at any time from{' '}
          <Link href="/orders" className="text-[#0066CC] hover:underline">
            My Orders
          </Link>
          .
        </li>
        <li>
          <span style={policyStyle}>Orders are split per store.</span> Because Vista Express is a
          marketplace, one checkout can produce several store orders. Each seller reviews and quotes delivery
          for their own part, and you pay each store order separately.
        </li>
        <li>
          <span style={policyStyle}>No payment is taken at checkout.</span> Checkout shows your item total
          with delivery at &euro;0.00 because the real delivery cost is not known until a seller reviews
          your order. You are never charged until you approve the updated total on the order page.
        </li>
        <li>
          <span style={policyStyle}>Cancelling.</span> You can cancel any store order that has not yet been
          paid for or handed to the seller. Once a seller has started processing, contact support and we will
          try to help.
        </li>
        <li>
          <span style={policyStyle}>Finding a store or product.</span> Use the search bar in the header to
          search products and stores, or browse by{' '}
          <Link href="/categories" className="text-[#0066CC] hover:underline">
            category
          </Link>{' '}
          . On a store page you can filter its products by type, price, availability and rating.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Payment and wallet</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>Paying per store order.</span> Once a seller has quoted delivery, the
          order page shows the updated total and a Pay button for that store. Payments are made one store
          order at a time.
        </li>
        <li>
          <span style={policyStyle}>Paying from your wallet.</span> Your wallet is the payment method
          available at checkout. Top it up from{' '}
          <Link href="/profile" className="text-[#0066CC] hover:underline">
            Profile &rarr; Wallet
          </Link>
          , then pay each store order from your balance. Card payment is not currently available.
        </li>
        <li>
          <span style={policyStyle}>Top-up limits.</span> A single wallet top-up can be at most &euro;100,000.
          Minimum and maximum top-up and withdrawal amounts are shown in your wallet.
        </li>
        <li>
          <span style={policyStyle}>Points.</span> Points can be redeemed against an order at checkout.
          Points discount is applied before delivery is quoted.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Delivery and confirming receipt</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>Delivery is quoted by each seller.</span> Shipping costs are not set by
          Vista Express and are not known at checkout. Each seller adds a delivery fee for your address
          after reviewing the order. See{' '}
          <Link href="/shipping" className="text-[#0066CC] hover:underline">
            Shipping Info
          </Link>{' '}
          for what to expect.
        </li>
        <li>
          <span style={policyStyle}>Delivery confirmation codes.</span> To confirm an out-for-delivery
          order, your seller asks you to share a 6-digit confirmation code in the store chat. For your
          security the code is valid for 7 days, limited to 5 attempts, and repeated wrong entries lock
          that code for 15 minutes.
        </li>
        <li>
          <span style={policyStyle}>Prescription products.</span> Contact lenses and made-to-order lenses
          need a valid prescription. Sellers may require proof before shipping, and production time adds to
          the delivery estimate.
        </li>
        <li>
          <span style={policyStyle}>Problem with a parcel?</span> If something arrives damaged or
          incomplete, photograph the packaging and the items, then contact support within 48 hours of
          delivery.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Returns and refunds</h2>
      <p>
        Return windows depend on the seller and the product. Read the{' '}
        <Link href="/returns" className="text-[#0066CC] hover:underline">
          Returns
        </Link>{' '}
        page for the full policy, including the exclusions that apply to opened contact lenses and
        personalised prescription lenses.
      </p>
      <p>
        <span style={policyStyle}>How to request a return.</span> Returns are not started inside the
        website. Open the order under{' '}
        <Link href="/orders" className="text-[#0066CC] hover:underline">
          My Orders
        </Link>
        , then contact us at{' '}
        <a href="mailto:support@vistaexpress.com" className="text-[#0066CC] hover:underline">
          support@vistaexpress.com
        </a>{' '}
        with your order number and the reason. We coordinate with the seller and confirm whether the item is
        eligible before anything is sent back.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Account, security and privacy</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>Managing your details.</span> Update your name, phone and addresses from{' '}
          <Link href="/profile" className="text-[#0066CC] hover:underline">
            Profile
          </Link>
          . Your login email cannot be changed because it identifies your account.
        </li>
        <li>
          <span style={policyStyle}>Changing your password.</span> From Profile choose Change password. We
          email you a 6-digit code that expires after 15 minutes and can be resent once every 60 seconds,
          with a limit of 5 attempts.
        </li>
        <li>
          <span style={policyStyle}>Verifying your email.</span> A 6-digit code is sent when you register.
          The same 15-minute expiry, 60-second resend wait and 5-attempt limit apply.
        </li>
        <li>
          <span style={policyStyle}>Keeping your account safe.</span> Use a unique password, do not share
          your login, and sign out on shared devices. Never forward a verification or delivery code to
          anyone who did not ask for it through support.
        </li>
        <li>
          <span style={policyStyle}>Your data.</span> How we collect and use your personal data is set out in
          the{' '}
          <Link href="/privacy" className="text-[#0066CC] hover:underline">
            Privacy Policy
          </Link>
          .
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Selling, affiliates and referrals</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>Want to sell on Vista Express?</span> Registration and onboarding run
          in the seller portal. See{' '}
          <Link href="/sell" className="text-[#0066CC] hover:underline">
            Sell on Vista Express
          </Link>{' '}
          for the steps and what you will need.
        </li>
        <li>
          <span style={policyStyle}>Affiliate programme.</span> Publishers and partners earn on qualifying
          sales. Details on rates and how to apply are on the{' '}
          <Link href="/affiliate" className="text-[#0066CC] hover:underline">
            Affiliate Program
          </Link>{' '}
          page.
        </li>
        <li>
          <span style={policyStyle}>Refer a friend.</span> Share your personal referral code from{' '}
          <Link href="/profile" className="text-[#0066CC] hover:underline">
            Profile &rarr; Referrals
          </Link>
          . Your friend gets &euro;10 off and you earn &euro;10 in wallet credit once their order completes.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">Contact support</h2>
      <p>
        Email:{' '}
        <a href="mailto:support@vistaexpress.com" className="text-[#0066CC] hover:underline">
          support@vistaexpress.com
        </a>
        <br />
        Seller enquiries:{' '}
        <a href="mailto:sellers@vistaexpress.com" className="text-[#0066CC] hover:underline">
          sellers@vistaexpress.com
        </a>
        <br />
        Include your order number where relevant and a clear description of the issue. We aim to respond
        within 1–2 business days.
      </p>
    </StaticPageShell>
  );
}