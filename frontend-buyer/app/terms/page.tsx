import type { Metadata } from 'next';
import TermsContent from './TermsContent';

export const metadata: Metadata = {
  title: 'Terms of Service | Vista Express',
  description: 'Terms governing use of the Vista Express marketplace.',
};

export default function TermsPage() {
  return <TermsContent />;
}