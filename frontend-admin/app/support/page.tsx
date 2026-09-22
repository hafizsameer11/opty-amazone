'use client';

import { useCallback, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import { adminSupportService, type AdminSupportTicket } from '@/services/support-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';

export default function AdminSupportPage() {
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [selected, setSelected] = useState<AdminSupportTicket | null>(null);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');

  const statusLabel = (value: string) => {
    const key = statusKey(value);
    const translated = t(key);
    return translated === key ? value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : translated;
  };
  const roleLabel = (value?: string) => {
    if (!value) return '';
    if (value === 'buyer') return t('buyer');
    if (value === 'seller') return t('seller');
    if (value === 'admin') return t('admin');
    return value;
  };

  const load = useCallback(async () => {
    const response = await adminSupportService.list({ per_page: 50 });
    setTickets(response.tickets || []);
  }, []);

  useLiveRefresh(async () => {
    await load();
    if (selected) setSelected(await adminSupportService.show(selected.id));
  }, true, 15000, true);

  const open = async (id: number) => {
    const ticket = await adminSupportService.show(id);
    setSelected(ticket);
    setStatus(ticket.status);
  };

  const update = async () => {
    if (!selected) return;
    setSelected(await adminSupportService.update(selected.id, { status }));
    await load();
  };

  const reply = async () => {
    if (!selected || !message.trim()) return;
    await adminSupportService.reply(selected.id, { body: message });
    setMessage('');
    await open(selected.id);
    await load();
  };

  return (
    <AdminLayout>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex justify-between">
            <h1 className="font-semibold">{t('supportTickets')}</h1>
            <button onClick={() => void load()} className="text-sm text-[#0066CC]">{t('refresh')}</button>
          </div>
          {tickets.length === 0 ? (
            <p className="py-6 text-sm text-gray-500">{t('supportNoTickets')}</p>
          ) : tickets.map((ticket) => (
            <button key={ticket.id} onClick={() => void open(ticket.id)} className="w-full border-b p-3 text-left">
              <b>{ticket.ticket_no}</b>
              <span className="block text-sm">{ticket.subject}</span>
              <span className="text-xs text-gray-500">{ticket.user?.name} · {roleLabel(ticket.user_role)} · {statusLabel(ticket.status)}</span>
            </button>
          ))}
        </section>

        <section className="rounded-xl border bg-white p-5">
          {!selected ? (
            <p className="text-gray-500">{t('selectTicket')}</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selected.ticket_no} · {selected.subject}</h2>
                  <p className="text-sm text-gray-500">{selected.user?.name} ({roleLabel(selected.user_role)}) · {selected.category}</p>
                </div>
                <div className="flex gap-2">
                  <select aria-label={t('supportStatus')} value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border p-2 text-sm">
                    <option value="open">{statusLabel('open')}</option>
                    <option value="in_progress">{statusLabel('in_progress')}</option>
                    <option value="waiting_for_user">{statusLabel('waiting_for_user')}</option>
                    <option value="resolved">{statusLabel('resolved')}</option>
                    <option value="closed">{statusLabel('closed')}</option>
                  </select>
                  <Button size="sm" onClick={() => void update()}>{t('save')}</Button>
                </div>
              </div>
              <p className="mt-4 rounded bg-gray-50 p-3 text-sm">{selected.description}</p>
              <div className="my-4 max-h-[45vh] space-y-2 overflow-y-auto">
                {(selected.messages || []).map((item) => (
                  <div key={item.id} className="rounded border p-3 text-sm">
                    <p>{item.body}</p>
                    <span className="text-xs text-gray-400">{item.sender?.name || roleLabel(item.sender_role)} · {new Date(item.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="flex-1 rounded border p-2 text-sm" rows={2} placeholder={t('replyToUser')} />
                <Button onClick={() => void reply()}>{t('send')}</Button>
              </div>
            </>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
