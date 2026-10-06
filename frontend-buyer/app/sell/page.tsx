import type { Metadata } from 'next';
import SellContent from './SellContent';

export const metadata: Metadata = {
  title: 'Sell on Vista Express',
  description: 'Open your store on Vista Express and reach customers looking for optical products.',
};

export default function SellPage() {
  return <SellContent />;
}