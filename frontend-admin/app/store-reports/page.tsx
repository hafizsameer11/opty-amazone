'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  adminReportService,
  STORE_REPORT_STATUSES,
  type StoreReportRow,
  type StoreReportStatus,
} from '@/services/store-moderation-service';
import { sellerService } from '@/services/seller-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';

function statusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'resolved' || status === 'closed') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'submitted' || status === 'under_review') return 'warning';
  return 'default';
}

export default function StoreReportsPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [reports, setReports] = useState<StoreReportRow[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoreReportRow | null>(null);
  const [notes, setNotes] = useState('');
  const [nextStatus, setNextStatus] = useState<StoreReportStatus>('under_review');
  const [actionBusy, setActionBusy] = useState(false);

  const statusLabel = (value: string) => {
    const key = statusKey(value);
    const translated = t(key);
    return translated === key ? value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : translated;
  };

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminReportService.list({ status: status || undefined, per_page: 50 });
      setReports(data.reports || []);
    } catch {
      showToast('error', t('failedLoadStoreReports'));
    } finally {
      setLoading(false);
    }
  };

  useLiveRefresh(load);

  useEffect(() => {
    void load();
  }, [status]);

  const openEditor = (report: StoreReportRow) => {
    setSelected(report);
    setNotes(report.admin_notes || '');
    setNextStatus((report.status as StoreReportStatus) || 'under_review');
  };

  const saveStatus = async () => {
    if (!selected) return;
    try {
      setActionBusy(true);
      await adminReportService.updateStatus(selected.id, nextStatus, notes || undefined);
      showToast('success', t('reportStatusUpdated'));
      setSelected(null);
      setNotes('');
      void load();
    } catch {
      showToast('error', t('failedUpdateReport'));
    } finally {
      setActionBusy(false);
    }
  };

  const warnSeller = async () => {
    if (!selected?.store?.id) return;
    const reason = window.prompt(t('warningReasonPrompt'));
    if (!reason?.trim()) return;
    try {
      setActionBusy(true);
      await sellerService.warn(selected.store.id, reason.trim());
      showToast('success', t('sellerWarned'));
    } catch {
      showToast('error', t('failedWarnSeller'));
    } finally {
      setActionBusy(false);
    }
  };

  const suspendSeller = async () => {
    if (!selected?.store?.id) return;
    if (!window.confirm(t('confirmSuspendStore', { name: selected.store.name }))) return;
    try {
      setActionBusy(true);
      await sellerService.suspend(selected.store.id);
      showToast('success', t('storeSuspended'));
      void load();
    } catch {
      showToast('error', t('failedSuspendStore'));
    } finally {
      setActionBusy(false);
    }
  };

  const blockSeller = async () => {
    if (!selected?.store?.id) return;
    if (!window.confirm(t('confirmBlockStore', { name: selected.store.name }))) return;
    try {
      setActionBusy(true);
      await sellerService.block(selected.store.id);
      showToast('success', t('storeBlocked'));
      void load();
    } catch {
      showToast('error', t('failedBlockStore'));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-slate-900">{t('storeReports')}</h1>
            <p className="text-slate-500">{t('storeReportPrivateDescription')}</p>
          </div>
          <select aria-label={t('status')} value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900">
            <option value="">{t('allStatuses')}</option>
            {STORE_REPORT_STATUSES.map((item) => <option key={item.value} value={item.value}>{statusLabel(item.value)}</option>)}
          </select>
        </div>

        <GlassCard>
          {loading ? <p className="text-slate-500">{t('loading')}</p> : reports.length === 0 ? <p className="text-slate-500">{t('noResults')}</p> : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{report.store?.name || `Store #${report.store_id || report.id}`}</p>
                      <Badge variant={statusBadgeVariant(report.status)}>{statusLabel(report.status)}</Badge>
                      {report.store?.status === 'suspended' && <Badge variant="error">{t('storeSuspendedBadge')}</Badge>}
                    </div>
                    <p className="text-sm text-slate-600"><span className="font-medium">{report.reason}</span>{report.details ? ` — ${report.details}` : ''}</p>
                    <p className="mt-1 text-xs text-slate-400">{t('buyerLabel')}: {report.buyer?.name || t('buyerLabel')} · {new Date(report.created_at).toLocaleString()}</p>
                    {!!report.evidence_urls?.length && <div className="mt-2 flex flex-wrap gap-2">{report.evidence_urls.map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0066CC] underline">{t('evidence')}</a>)}</div>}
                  </div>
                  <Button size="sm" onClick={() => openEditor(report)}>{t('manage')}</Button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {selected && <GlassCard>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">{t('reportLabel', { id: selected.id })} — {selected.store?.name || `Store #${selected.store_id}`}</h2>
          <p className="mb-3 text-xs text-slate-500">{t('reportPrivateAdmin')}</p>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('status')}</label>
          <select aria-label={t('status')} value={nextStatus} onChange={(event) => setNextStatus(event.target.value as StoreReportStatus)} className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900">
            {STORE_REPORT_STATUSES.map((item) => <option key={item.value} value={item.value}>{statusLabel(item.value)}</option>)}
          </select>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder={t('adminNotesPrivate')} className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900" />
          <div className="mb-4 flex flex-wrap gap-2"><Button onClick={() => void saveStatus()} disabled={actionBusy}>{t('updateStatus')}</Button><Button variant="outline" onClick={() => setSelected(null)} disabled={actionBusy}>{t('cancel')}</Button></div>
          {selected.store?.id && <div className="border-t border-slate-100 pt-4"><p className="mb-2 text-sm font-semibold text-slate-800">{t('sellerActions')}</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void warnSeller()} disabled={actionBusy}>{t('warnSeller')}</Button><Button variant="outline" size="sm" onClick={() => void suspendSeller()} disabled={actionBusy}>{t('suspendStore')}</Button><Button size="sm" onClick={() => void blockSeller()} disabled={actionBusy}>{t('blockStore')}</Button></div></div>}
        </GlassCard>}
      </div>
    </AdminLayout>
  );
}
