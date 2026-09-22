'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { supportService, type SupportTicket, type SupportTicketCategory, type SupportTicketPriority, type SupportTicketStatus } from '@/services/support-service';

const categories: Array<{ value: SupportTicketCategory; label: string }> = [
  { value: 'order', label: 'Order issue' }, { value: 'product', label: 'Product issue' }, { value: 'payment', label: 'Payment issue' }, { value: 'shipping', label: 'Shipping issue' }, { value: 'refund', label: 'Refund issue' }, { value: 'account', label: 'Account issue' }, { value: 'technical', label: 'Technical issue' }, { value: 'other', label: 'Other' },
];
const statuses: Array<{ value: SupportTicketStatus; label: string }> = [
  { value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In progress' }, { value: 'waiting_for_user', label: 'Waiting for you' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
];
const priorities: Array<{ value: SupportTicketPriority; label: string }> = [
  { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
];
const labelFor = <T extends string>(items: Array<{ value: T; label: string }>, value: string) => items.find((item) => item.value === value)?.label ?? value.replaceAll('_', ' ');
const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available';
const apiError = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const requestError = error as { response?: { data?: { message?: unknown } } };
  return typeof requestError.response?.data?.message === 'string' ? requestError.response.data.message : fallback;
};
const statusClasses: Record<SupportTicketStatus, string> = { open: 'bg-blue-100 text-blue-800', in_progress: 'bg-amber-100 text-amber-800', waiting_for_user: 'bg-violet-100 text-violet-800', resolved: 'bg-emerald-100 text-emerald-800', closed: 'bg-slate-200 text-slate-700' };

export default function SupportPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<SupportTicketCategory | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('order');
  const [priority, setPriority] = useState<SupportTicketPriority>('normal');
  const [description, setDescription] = useState('');
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await supportService.list({ status: statusFilter, category: categoryFilter, per_page: 50 });
      setTickets(response.tickets ?? []);
    } catch (requestError: unknown) {
      setError(apiError(requestError, 'Unable to load support tickets.'));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const openTicket = async (id: number) => {
    try {
      setOpening(true); setError(null);
      setSelected(await supportService.show(id));
      setReply(''); setReplyFile(null);
    } catch (requestError: unknown) {
      setError(apiError(requestError, 'Unable to open this ticket.'));
    } finally { setOpening(false); }
  };

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subject.trim() || !description.trim()) { setError('Add a subject and describe the issue before creating the ticket.'); return; }
    if (createFile && createFile.size > 5 * 1024 * 1024) { setError('Attachments must be 5 MB or smaller.'); return; }
    try {
      setSubmitting(true); setError(null);
      const form = new FormData();
      form.append('subject', subject.trim()); form.append('category', category); form.append('priority', priority); form.append('description', description.trim());
      if (createFile) form.append('attachment', createFile);
      const ticket = await supportService.create(form);
      setSubject(''); setDescription(''); setCreateFile(null); setShowCreate(false);
      setSuccess(`Ticket ${ticket.ticket_no} was created.`);
      await loadTickets(); await openTicket(ticket.id);
    } catch (requestError: unknown) { setError(apiError(requestError, 'Unable to create your ticket.')); }
    finally { setSubmitting(false); }
  };

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || (!reply.trim() && !replyFile)) return;
    if (replyFile && replyFile.size > 5 * 1024 * 1024) { setError('Attachments must be 5 MB or smaller.'); return; }
    try {
      setSubmitting(true); setError(null);
      const form = new FormData(); form.append('body', reply.trim()); if (replyFile) form.append('attachment', replyFile);
      await supportService.reply(selected.id, form);
      setReply(''); setReplyFile(null); setSelected(await supportService.show(selected.id)); await loadTickets();
    } catch (requestError: unknown) { setError(apiError(requestError, 'Unable to send your reply.')); }
    finally { setSubmitting(false); }
  };

  const updateStatus = async (reopen: boolean) => {
    if (!selected) return;
    try {
      setSubmitting(true); setError(null);
      await (reopen ? supportService.reopen(selected.id) : supportService.close(selected.id));
      setSelected(await supportService.show(selected.id)); await loadTickets();
    } catch (requestError: unknown) { setError(apiError(requestError, 'Unable to update this ticket.')); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0066CC]">Customer support</p><h2 className="mt-1 text-xl font-bold text-slate-950">Support tickets</h2><p className="mt-1 text-sm text-slate-600">Get clear help with orders, products, payments, and your account.</p></div>
        <Button size="sm" onClick={() => { setShowCreate((visible) => !visible); setError(null); setSuccess(null); }}>{showCreate ? 'Cancel' : 'New ticket'}</Button>
      </div>

      <div className="p-5 sm:p-7">
        {error && <div className="mb-5"><Alert type="error" message={error} /></div>}
        {success && <div className="mb-5"><Alert type="success" message={success} /></div>}
        {showCreate && <form onSubmit={createTicket} className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">Create a support ticket</h3><p className="mt-1 text-sm text-slate-600">Tell us what happened and we will keep the conversation here.</p></div><span className="text-xs text-slate-500">Images or PDF, max 5 MB</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><select aria-label="Issue category" value={category} onChange={(event) => setCategory(event.target.value as SupportTicketCategory)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-blue-100">{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select aria-label="Ticket priority" value={priority} onChange={(event) => setPriority(event.target.value as SupportTicketPriority)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-blue-100">{priorities.map((item) => <option key={item.value} value={item.value}>{item.label} priority</option>)}</select><input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={180} placeholder="Subject" className="sm:col-span-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-blue-100" /><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} rows={4} placeholder="Describe the issue, including the order or product if relevant." className="sm:col-span-2 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-blue-100" /><input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={(event) => setCreateFile(event.target.files?.[0] ?? null)} className="sm:col-span-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-[#0066CC]" /></div>
          <div className="mt-4 flex justify-end"><Button type="submit" size="sm" isLoading={submitting}>Create ticket</Button></div>
        </form>}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-900">Your tickets</h3><p className="mt-1 text-sm text-slate-500">Open a card for the complete conversation and ticket history.</p></div><div className="flex gap-2"><select aria-label="Filter tickets by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SupportTicketStatus | '')} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All statuses</option>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select aria-label="Filter tickets by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as SupportTicketCategory | '')} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All issues</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div></div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-3 xl:max-h-[42rem] xl:overflow-y-auto xl:pr-1">{loading ? <div className="flex min-h-40 items-center justify-center text-sm text-slate-500"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-[#0066CC] border-t-transparent" />Loading tickets…</div> : tickets.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No tickets match these filters.</div> : tickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => void openTicket(ticket.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === ticket.id ? 'border-[#0066CC] bg-blue-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold tracking-wide text-[#0066CC]">{ticket.ticket_no}</p><h4 className="mt-1 truncate font-bold text-slate-900">{ticket.subject}</h4></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[ticket.status]}`}>{labelFor(statuses, ticket.status)}</span></div><div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{labelFor(categories, ticket.category)} · {labelFor(priorities, ticket.priority)}</span><span>{dateTime(ticket.updated_at)}</span></div>{Boolean(ticket.user_unread_count) && <span className="mt-3 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">New reply</span>}</button>)}</div>
          <section className="min-h-[28rem] rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">{opening ? <div className="flex h-64 items-center justify-center text-sm text-slate-500">Loading ticket details…</div> : !selected ? <div className="flex h-64 flex-col items-center justify-center text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl text-[#0066CC]">?</div><h3 className="mt-4 font-bold text-slate-900">Select a ticket</h3><p className="mt-1 max-w-xs text-sm text-slate-500">The complete conversation and history will appear here.</p></div> : <>
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold tracking-wide text-[#0066CC]">{selected.ticket_no}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{selected.subject}</h3><p className="mt-1 text-sm text-slate-600">{labelFor(categories, selected.category)} · {labelFor(priorities, selected.priority)} priority</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClasses[selected.status]}`}>{labelFor(statuses, selected.status)}</span>{(selected.status === 'resolved' || selected.status === 'closed') ? <Button variant="outline" size="sm" disabled={submitting} onClick={() => void updateStatus(true)}>Reopen</Button> : <Button variant="outline" size="sm" disabled={submitting} onClick={() => void updateStatus(false)}>Close ticket</Button>}</div></div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">{selected.order?.order_no && <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Order {selected.order.order_no}</span>}{selected.product?.name && <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Product {selected.product.name}</span>}{selected.store?.name && <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Store {selected.store.name}</span>}</div>
            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">{(selected.messages ?? []).map((message) => { const ownMessage = message.sender_role === 'buyer'; return <div key={message.id} className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${ownMessage ? 'bg-[#0066CC] text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}><p className="whitespace-pre-wrap leading-6">{message.body || 'Attachment'}</p>{message.attachment_url && <a href={message.attachment_url} target="_blank" rel="noreferrer" className={`mt-2 inline-block text-xs font-bold underline ${ownMessage ? 'text-blue-100' : 'text-[#0066CC]'}`}>View attachment{message.attachment_name ? `: ${message.attachment_name}` : ''}</a>}<p className={`mt-2 text-xs ${ownMessage ? 'text-blue-100' : 'text-slate-400'}`}>{ownMessage ? 'You' : message.sender?.name || 'Support'} · {dateTime(message.created_at)}</p></div></div>; })}</div>
            {(selected.events?.length ?? 0) > 0 && <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ticket history</p><div className="mt-2 space-y-1">{selected.events?.map((event) => <p key={event.id} className="text-xs text-slate-500">{event.actor?.name || 'Support'} {String(event.event || event.type || 'updated').replaceAll('_', ' ')} · {dateTime(event.created_at)}</p>)}</div></div>}
            {selected.status !== 'closed' ? <form onSubmit={sendReply} className="mt-4 border-t border-slate-200 pt-4"><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} placeholder="Write a reply to support…" className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-blue-100" /><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={(event) => setReplyFile(event.target.files?.[0] ?? null)} className="text-xs text-slate-600" /><Button type="submit" size="sm" isLoading={submitting} disabled={!reply.trim() && !replyFile}>Send reply</Button></div></form> : <p className="mt-4 rounded-xl bg-slate-200 px-3 py-2 text-sm text-slate-600">This ticket is closed. Reopen it if you need to continue the conversation.</p>}
          </>}</section>
        </div>
      </div>
    </div>
  );
}
