'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AnnouncementForm from '@/components/announcements/AnnouncementForm';
import AnnouncementShell from '@/components/announcements/AnnouncementShell';
import SectionBackLink from '@/components/ui/SectionBackLink';
import { announcementService, type Announcement } from '@/services/announcement-service';
import { getAxiosErrorMessage } from '@/lib/api-client';

export default function EditAnnouncementPage() {
  const params = useParams<{ id: string }>(); const router = useRouter(); const [announcement, setAnnouncement] = useState<Announcement | null>(null); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setAnnouncement(await announcementService.get(Number(params.id))); } catch (caught) { setError(getAxiosErrorMessage(caught) || 'Unable to load this announcement.'); } }, [params.id]);
  useEffect(() => { void load(); }, [load]);
  return <AnnouncementShell><SectionBackLink href={`/announcements/${params.id}`}>Back to announcement</SectionBackLink><header className="mt-4 border-b border-slate-200 pb-5"><p className="text-sm font-semibold text-[#0066CC]">Store communication</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Edit announcement</h1></header>{error ? <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p> : announcement ? <div className="mt-6"><AnnouncementForm key={`announcement-${announcement.id}`} announcement={announcement} onSaved={() => router.push(`/announcements/${announcement.id}`)} onCancel={() => router.push(`/announcements/${announcement.id}`)} /></div> : <p className="py-14 text-center text-slate-500">Loading announcement…</p>}</AnnouncementShell>;
}
