import type { Metadata } from 'next';
import PrivacyContent from './PrivacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy | Vista Express',
  description: 'How Vista Express collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}