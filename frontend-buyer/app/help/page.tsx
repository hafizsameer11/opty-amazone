import type { Metadata } from 'next';
import HelpContent from './HelpContent';

export const metadata: Metadata = {
  title: 'Help Center | Vista Express',
  description: 'Help with orders, delivery, returns, payments, and your Vista Express account.',
};

export default function HelpPage() {
  return <HelpContent />;
}