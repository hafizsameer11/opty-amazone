'use client';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import CampaignDetails from '@/components/ads/CampaignDetails';
export default function AdCampaignPage() {
  const { id } = useParams();
  return <AdminLayout><CampaignDetails id={Number(id)} admin /></AdminLayout>;
}
