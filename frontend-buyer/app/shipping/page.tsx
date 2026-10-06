import type { Metadata } from 'next';
import ShippingContent from './ShippingContent';

export const metadata: Metadata = {
  title: 'Shipping Info | Vista Express',
  description: 'How delivery works on Vista Express — seller-quoted shipping, dispatch times and tracking.',
};

export default function ShippingPage() {
  return <ShippingContent />;
}