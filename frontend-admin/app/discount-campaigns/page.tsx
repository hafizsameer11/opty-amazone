'use client';
import AdminLayout from '@/components/layout/AdminLayout';
import CampaignManager from '@/components/campaigns/CampaignManager';
export default function CampaignPage() { return <AdminLayout><CampaignManager kind="discount" role="admin" /></AdminLayout>; }
