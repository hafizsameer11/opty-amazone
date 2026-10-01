'use client';

import { useEffect, useState } from 'react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { announcementService, type Announcement } from '@/services/announcement-service';
import { getAxiosErrorMessage } from '@/lib/api-client';

type Draft = Pick<Announcement, 'title' | 'message' | 'start_date' | 'end_date' | 'is_active'>;

const freshDraft = (): Draft => ({ title: '', message: '', start_date: '', end_date: '', is_active: true });
const dateValue = (value?: string) => value ? value.slice(0, 10) : '';

/**
 * A controlled editor so a new announcement always starts from a fresh draft,
 * even when Next keeps the surrounding layout mounted during navigation.
 */
export default function AnnouncementForm({ announcement, onSaved, onCancel }: {
  announcement?: Announcement;
  onSaved: (announcement: Announcement) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(announcement
      ? { title: announcement.title, message: announcement.message, start_date: dateValue(announcement.start_date), end_date: dateValue(announcement.end_date), is_active: announcement.is_active }
      : freshDraft());
    setError('');
  }, [announcement?.id]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(current => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const data = {
        ...draft,
        start_date: draft.start_date || undefined,
        end_date: draft.end_date || undefined,
      };
      const saved = announcement
        ? await announcementService.update(announcement.id, data)
        : await announcementService.create(data);
      onSaved(saved as Announcement);
    } catch (caught) {
      setError(getAxiosErrorMessage(caught) || 'Unable to save this announcement.');
    } finally {
      setBusy(false);
    }
  };

  return <form onSubmit={submit} className="space-y-6">
    {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-6">
      <div className="sm:col-span-2"><Input label="Announcement title" value={draft.title} maxLength={255} onChange={event => update('title', event.target.value)} required /></div>
      <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Message<textarea required rows={7} value={draft.message} onChange={event => update('message', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 leading-6 outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-blue-100" placeholder="Write the update your customers should see…" /></label>
      <Input label="Start date" type="date" value={draft.start_date || ''} onChange={event => update('start_date', event.target.value)} />
      <Input label="End date" type="date" min={draft.start_date || undefined} value={draft.end_date || ''} onChange={event => update('end_date', event.target.value)} />
      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" checked={draft.is_active} onChange={event => update('is_active', event.target.checked)} className="mt-0.5 h-4 w-4" /><span><strong className="block text-slate-900">Publish this announcement</strong><span className="mt-1 block">Turn it off to save a draft without displaying it to customers.</span></span></label>
    </section>
    <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : announcement ? 'Save changes' : 'Create announcement'}</Button></footer>
  </form>;
}
