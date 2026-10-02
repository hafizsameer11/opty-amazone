'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { useToast } from '@/components/ui/Toast';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { adminReportService, STORE_REPORT_STATUSES, type StoreReinstatementRequest, type StoreReportRow, type StoreReportStatus, type StoreReportSummary } from '@/services/store-moderation-service';

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (['resolved', 'closed', 'approved'].includes(status)) return 'success';
  if (['rejected'].includes(status)) return 'error';
  if (['submitted', 'under_review', 'pending'].includes(status)) return 'warning';
  return 'default';
}

export default function StoreReportsPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [reports, setReports] = useState<StoreReportRow[]>([]);
  const [summary, setSummary] = useState<StoreReportSummary | null>(null);
  const [requests, setRequests] = useState<StoreReinstatementRequest[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoreReportRow | null>(null);
  const [notes, setNotes] = useState('');
  const [nextStatus, setNextStatus] = useState<StoreReportStatus>('under_review');
  const [busy, setBusy] = useState(false);
  const label = (value: string) => { const key = statusKey(value); const translated = t(key); return translated === key ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : translated; };
  const load = async () => {
    try {
      setLoading(true);
      const [reportData, requestData] = await Promise.all([
        adminReportService.list({ status: status || undefined, search: search.trim() || undefined, per_page: 50 }),
        adminReportService.reinstatements('pending'),
      ]);
      setReports(reportData.reports || []); setSummary(reportData.summary || null); setRequests(requestData.requests || []);
    } catch { showToast('error', t('failedLoadStoreReports')); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [status]);
  useLiveRefresh(load);
  const select = (report: StoreReportRow) => { setSelected(report); setNotes(report.admin_notes || ''); setNextStatus((report.status as StoreReportStatus) || 'under_review'); };
  const saveStatus = async () => { if (!selected) return; try { setBusy(true); await adminReportService.updateStatus(selected.id, nextStatus, notes || undefined); showToast('success', t('reportStatusUpdated')); await load(); } catch { showToast('error', t('failedUpdateReport')); } finally { setBusy(false); } };
  const sellerAction = async (action: 'warn' | 'suspend' | 'remove') => {
    if (!selected?.store?.id) return;
    const promptText = action === 'warn' ? t('warningReasonPrompt') : t('warningReasonPrompt');
    const reason = window.prompt(promptText);
    if (!reason?.trim()) { showToast('error', t('actionReasonRequired')); return; }
    const confirmText = action === 'suspend' ? t('confirmSuspendStore', { name: selected.store.name }) : action === 'remove' ? t('confirmRemoveStore', { name: selected.store.name }) : null;
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      setBusy(true);
      if (action === 'warn') await adminReportService.warn(selected.id, reason.trim(), notes || undefined);
      if (action === 'suspend') await adminReportService.suspend(selected.id, reason.trim(), notes || undefined);
      if (action === 'remove') await adminReportService.remove(selected.id, reason.trim(), notes || undefined);
      showToast('success', t(action === 'warn' ? 'sellerWarned' : action === 'suspend' ? 'storeSuspended' : 'storeRemoved'));
      await load();
    } catch { showToast('error', t(action === 'warn' ? 'failedWarnSeller' : action === 'suspend' ? 'failedSuspendStore' : 'failedRemoveStore')); } finally { setBusy(false); }
  };
  const reviewRequest = async (request: StoreReinstatementRequest, action: 'approve' | 'reject') => { try { setBusy(true); await adminReportService.decideReinstatement(request.id, action); showToast('success', t(action === 'approve' ? 'reinstatementApproved' : 'reinstatementRejected')); await load(); } catch { showToast('error', t('failedReinstatementAction')); } finally { setBusy(false); } };
  return <AdminLayout><div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="mb-2 text-3xl font-bold text-slate-900">{t('storeReports')}</h1><p className="text-slate-500">{t('storeReportPrivateDescription')}</p></div><div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load(); }} placeholder={t('search')} className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /><Button variant="outline" onClick={() => void load()}>{t('search')}</Button><select aria-label={t('status')} value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900"><option value="">{t('allStatuses')}</option>{STORE_REPORT_STATUSES.map((item) => <option key={item.value} value={item.value}>{label(item.value)}</option>)}</select></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[{ key: 'total_reports', label: t('storeReports') }, { key: 'reported_stores', label: t('reportedStores') }, { key: 'open_reports', label: t('openReports') }, { key: 'suspended_stores', label: t('storeSuspended') }, { key: 'pending_reinstatements', label: t('pendingReinstatements') }].map((item) => <GlassCard key={item.key}><p className="text-xs font-medium text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary?.[item.key as keyof StoreReportSummary] ?? '—'}</p></GlassCard>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.8fr)]"><GlassCard><h2 className="mb-4 text-lg font-semibold text-slate-900">{t('storeReports')}</h2>{loading ? <p className="text-slate-500">{t('loading')}</p> : reports.length === 0 ? <p className="text-slate-500">{t('noResults')}</p> : <div className="space-y-3">{reports.map((report) => <button key={report.id} type="button" onClick={() => select(report)} className={`w-full rounded-xl border p-4 text-left transition ${selected?.id === report.id ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{report.store?.name || `Store #${report.store_id || report.id}`}</p><Badge variant={statusVariant(report.status)}>{label(report.status)}</Badge>{report.store?.status === 'suspended' && <Badge variant="error">{t('storeSuspendedBadge')}</Badge>}<span className="text-xs text-slate-400">{t('reportsForStore', { count: report.store?.reports_count || 1 })}</span></div><p className="mt-2 text-sm text-slate-600"><span className="font-medium">{report.reason}</span>{report.details ? ` — ${report.details}` : ''}</p><p className="mt-2 text-xs text-slate-400">{t('buyerLabel')}: {report.buyer?.name || t('buyerLabel')} · {report.created_at ? new Date(report.created_at).toLocaleString() : ''}</p></button>)}</div>}</GlassCard>
      <div className="space-y-6">{selected ? <GlassCard><h2 className="text-lg font-semibold text-slate-900">{t('reportLabel', { id: selected.id })}</h2><p className="mt-1 text-sm text-slate-500">{selected.store?.name} · {t('reportsForStore', { count: selected.store?.reports_count || 1 })}</p><p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{selected.details || selected.reason}</p>{selected.evidence_urls?.length ? <div className="mt-3 flex flex-wrap gap-2">{selected.evidence_urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="rounded bg-slate-100 px-2 py-1 text-xs text-blue-700 underline">{t('evidence')} {index + 1}</a>)}</div> : null}<label className="mb-1 mt-4 block text-sm font-medium text-slate-700">{t('status')}</label><select aria-label={t('status')} value={nextStatus} onChange={(event) => setNextStatus(event.target.value as StoreReportStatus)} className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900">{STORE_REPORT_STATUSES.map((item) => <option key={item.value} value={item.value}>{label(item.value)}</option>)}</select><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder={t('adminNotesPrivate')} className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900" /><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => void saveStatus()} disabled={busy}>{t('updateStatus')}</Button><Button size="sm" variant="outline" onClick={() => void sellerAction('warn')} disabled={busy}>{t('warnSeller')}</Button><Button size="sm" variant="outline" onClick={() => void sellerAction('suspend')} disabled={busy}>{t('suspendStore')}</Button><Button size="sm" onClick={() => void sellerAction('remove')} disabled={busy}>{t('removeStore')}</Button></div></GlassCard> : <GlassCard><p className="text-sm text-slate-500">{t('selectTicket')}</p></GlassCard>}
        <GlassCard><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-slate-900">{t('reinstatementRequests')}</h2><Badge variant="warning">{requests.length}</Badge></div>{requests.length ? <div className="space-y-3">{requests.map((request) => <div key={request.id} className="rounded-lg border border-slate-100 p-3"><div className="flex items-center justify-between gap-2"><p className="font-medium text-slate-900">{request.store?.name}</p><Badge variant={statusVariant(request.status)}>{label(request.status)}</Badge></div><p className="mt-1 text-xs text-slate-500">{request.seller?.name} · {request.seller?.email}</p><p className="mt-2 text-sm text-slate-600">{request.reason}</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => void reviewRequest(request, 'approve')} disabled={busy}>{t('approveReinstatement')}</Button><Button size="sm" variant="outline" onClick={() => void reviewRequest(request, 'reject')} disabled={busy}>{t('rejectReinstatement')}</Button></div></div>)}</div> : <p className="text-sm text-slate-500">{t('noReinstatementRequests')}</p>}</GlassCard></div></div></div></AdminLayout>;
}
