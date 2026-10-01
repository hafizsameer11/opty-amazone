'use client';

import { useRouter } from 'next/navigation';
import AnnouncementForm from '@/components/announcements/AnnouncementForm';
import AnnouncementShell from '@/components/announcements/AnnouncementShell';
import SectionBackLink from '@/components/ui/SectionBackLink';

export default function NewAnnouncementPage() {
  const router = useRouter();
  return <AnnouncementShell><SectionBackLink href="/announcements">Back to Announcements</SectionBackLink><header className="mt-4 border-b border-slate-200 pb-5"><p className="text-sm font-semibold text-[#0066CC]">Store communication</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">New announcement</h1><p className="mt-2 text-sm text-slate-600">Create a timed store update for your buyers.</p></header><div className="mt-6"><AnnouncementForm key="new-announcement" onSaved={() => router.push('/announcements')} onCancel={() => router.push('/announcements')} /></div></AnnouncementShell>;
}
