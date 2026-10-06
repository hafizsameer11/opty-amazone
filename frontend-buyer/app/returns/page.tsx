import type { Metadata } from 'next';
import ReturnsContent from './ReturnsContent';

export const metadata: Metadata = {
  title: 'Returns | Vista Express',
  description: 'How returns and refunds work on the Vista Express marketplace.',
};

export default function ReturnsPage() {
  return <ReturnsContent />;
}