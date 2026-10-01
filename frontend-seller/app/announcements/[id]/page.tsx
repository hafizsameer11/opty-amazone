'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AnnouncementShell from '@/components/announcements/AnnouncementShell';
import SectionBackLink from '@/components/ui/SectionBackLink';
import Button from '@/components/ui/Button';
import { announcementService, type Announcement } from '@/services/announcement-service';
import { getAxiosErrorMessage } from '@/lib/api-client';

const date = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not set';

export default function AnnouncementDetailsPage() {
  const params = useParams<{ id: string }>(); const router = useRouter(); const [announcement, setAnnouncement] = useState<Announcement | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setAnnouncement(await announcementService.get(Number(params.id))); } catch (caught) { setError(getAxiosErrorMessage(caught) || 'Unable to load this announcement.'); } }, [params.id]);
  useEffect(() => { void load(); }, [load]);
  const toggle = async () => { if (!announcement) return; setBusy(true); try { setAnnouncement(await announcementService.toggle(announcement.id)); } catch (caught) { setError(getAxiosErrorMessage(caught) || 'Unable to update this announcement.'); } finally { setBusy(false); } };
  const remove = async () => { if (!announcement || !window.confirm('Delete this announcement?')) return; setBusy(true); try { await announcementService.delete(announcement.id); router.push('/announcements'); } catch (caught) { setError(getAxiosErrorMessage(caught) || 'Unable to delete this announcement.'); } finally { setBusy(false); } };
  return <AnnouncementShell><SectionBackLink href="/announcements">Back to Announcements</SectionBackLink>{error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>}{announcement ? <><header className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-slate-50/95 py-4 backdrop-blur"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#0066CC]">Store communication</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{announcement.title}</h1><span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${announcement.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{announcement.is_active ? 'Active' : 'Draft / inactive'}</span></div><div className="flex flex-wrap gap-2"><Link href={`/announcements/${announcement.id}/edit`}><Button variant="outline" disabled={busy}>Edit</Button></Link><Button variant="outline" disabled={busy} onClick={() => void toggle()}>{announcement.is_active ? 'Pause' : 'Activate'}</Button><Button variant="outline" disabled={busy} onClick={() => void remove()} className="!border-rose-300 !text-rose-700">Delete</Button></div></div></header><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Message</h2><p className="mt-3 whitespace-pre-line text-base leading-7 text-slate-700">{announcement.message}</p><dl className="mt-8 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start date</dt><dd className="mt-1 font-medium text-slate-900">{date(announcement.start_date)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">End date</dt><dd className="mt-1 font-medium text-slate-900">{date(announcement.end_date)}</dd></div></dl></section></> : <p className="py-14 text-center text-slate-500">Loading announcement…</p>}</AnnouncementShell>;
}
