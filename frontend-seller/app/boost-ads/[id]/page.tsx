'use client';
import { useParams } from 'next/navigation';
import AdShell from '@/components/ads/AdShell';
import CampaignDetails from '@/components/ads/CampaignDetails';
export default function CampaignPage() {
  const { id } = useParams();
  return <AdShell><CampaignDetails id={Number(id)} /></AdShell>;
}
