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

function statusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'resolved' || status === 'closed') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'submitted' || status === 'under_review') return 'warning';
  return 'default';
}

function statusLabel(status: string): string {
  return STORE_REPORT_STATUSES.find((s) => s.value === status)?.label || status;
}

export default function StoreReportsPage() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<StoreReportRow[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoreReportRow | null>(null);
  const [notes, setNotes] = useState('');
  const [nextStatus, setNextStatus] = useState<StoreReportStatus>('under_review');
  const [actionBusy, setActionBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminReportService.list({
        status: status || undefined,
        per_page: 50,
      });
      setReports(data.reports || []);
    } catch {
      showToast('error', 'Failed to load store reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const openEditor = (r: StoreReportRow) => {
    setSelected(r);
    setNotes(r.admin_notes || '');
    setNextStatus(
      (STORE_REPORT_STATUSES.find((s) => s.value === r.status)?.value as StoreReportStatus) ||
        'under_review'
    );
  };

  const saveStatus = async () => {
    if (!selected) return;
    try {
      setActionBusy(true);
      await adminReportService.updateStatus(selected.id, nextStatus, notes || undefined);
      showToast('success', 'Report status updated');
      setSelected(null);
      setNotes('');
      void load();
    } catch {
      showToast('error', 'Failed to update report');
    } finally {
      setActionBusy(false);
    }
  };

  const warnSeller = async () => {
    if (!selected?.store?.id) return;
    const reason = window.prompt('Warning reason (private, not shown on public site):');
    if (!reason?.trim()) return;
    try {
      setActionBusy(true);
      await sellerService.warn(selected.store.id, reason.trim());
      showToast('success', 'Seller warned');
    } catch {
      showToast('error', 'Failed to warn seller');
    } finally {
      setActionBusy(false);
    }
  };

  const suspendSeller = async () => {
    if (!selected?.store?.id) return;
    if (!window.confirm(`Suspend store “${selected.store.name}”?`)) return;
    try {
      setActionBusy(true);
      await sellerService.suspend(selected.store.id);
      showToast('success', 'Store suspended');
      void load();
    } catch {
      showToast('error', 'Failed to suspend store');
    } finally {
      setActionBusy(false);
    }
  };

  const blockSeller = async () => {
    if (!selected?.store?.id) return;
    if (!window.confirm(`Block store “${selected.store.name}”? This suspends the store and revokes sessions.`)) {
      return;
    }
    try {
      setActionBusy(true);
      await sellerService.block(selected.store.id);
      showToast('success', 'Store blocked');
      void load();
    } catch {
      showToast('error', 'Failed to block store');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Store Reports</h1>
            <p className="text-slate-500">
              Private fraud/abuse reports from buyers — not shown on the public site
            </p>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg bg-slate-100 border border-slate-200 text-slate-900 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STORE_REPORT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <GlassCard>
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="text-slate-500">No reports found.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="border border-slate-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-slate-900 font-semibold">
                        {r.store?.name || `Store #${r.store_id || r.id}`}
                      </p>
                      <Badge variant={statusBadgeVariant(r.status)}>{statusLabel(r.status)}</Badge>
                      {r.store?.status === 'suspended' && (
                        <Badge variant="error">Store suspended</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">{r.reason}</span>
                      {r.details ? ` — ${r.details}` : ''}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      By {r.buyer?.name || 'Buyer'} · {new Date(r.created_at).toLocaleString()}
                    </p>
                    {!!r.evidence_urls?.length && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {r.evidence_urls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#0066CC] underline"
                          >
                            Evidence
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="sm" onClick={() => openEditor(r)}>
                    Manage
                  </Button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {selected && (
          <GlassCard>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Report #{selected.id} — {selected.store?.name || `Store #${selected.store_id}`}
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Status updates and seller actions are private (admin-only).
            </p>

            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as StoreReportStatus)}
              className="w-full rounded-lg bg-slate-100 border border-slate-200 text-slate-900 px-3 py-2 text-sm mb-3"
            >
              {STORE_REPORT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Admin notes (optional, private)"
              className="w-full rounded-lg bg-slate-100 border border-slate-200 text-slate-900 px-3 py-2 text-sm mb-3"
            />

            <div className="flex flex-wrap gap-2 mb-4">
              <Button onClick={() => void saveStatus()} disabled={actionBusy}>
                Update status
              </Button>
              <Button variant="outline" onClick={() => setSelected(null)} disabled={actionBusy}>
                Cancel
              </Button>
            </div>

            {selected.store?.id ? (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-800 mb-2">Seller actions</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => void warnSeller()} disabled={actionBusy}>
                    Warn seller
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void suspendSeller()} disabled={actionBusy}>
                    Suspend store
                  </Button>
                  <Button size="sm" onClick={() => void blockSeller()} disabled={actionBusy}>
                    Block store
                  </Button>
                </div>
              </div>
            ) : null}
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  );
}
