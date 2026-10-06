import type { Metadata } from 'next';
import AffiliateContent from './AffiliateContent';

export const metadata: Metadata = {
  title: 'Affiliate Program | Vista Express',
  description: 'Earn commission on Vista Express sales as an affiliate partner, and how the referral programme works.',
};

export default function AffiliatePage() {
  return <AffiliateContent />;
}