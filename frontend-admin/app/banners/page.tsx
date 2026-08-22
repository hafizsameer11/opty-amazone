'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PaginationBar, { type PaginationMeta } from '@/components/ui/PaginationBar';
import RejectReasonModal from '@/components/admin/RejectReasonModal';
import {
  storeBannerAdminService,
  type AdminStoreBanner,
} from '@/services/store-banner-admin-service';
import { useToast } from '@/components/ui/Toast';
import { rowsAndMetaFromAdminList } from '@/lib/paginated-response';

export default function StoreBannersPage() {
  const { showToast } = useToast();
  const [banners, setBanners] = useState<AdminStoreBanner[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState('');
  const [rejectId, setRejectId] = useState<number | null>(null);

  const loadBanners = useCallback(
    async (pageNum: number) => {
      try {
        setLoading(true);
        setLoadError(null);
        const params: Record<string, string | number> = { per_page: 15, page: pageNum };
        if (approvalFilter === 'pending') params.is_approved = 0;
        if (approvalFilter === 'approved') params.is_approved = 1;
        const response = await storeBannerAdminService.getAll(params);
        const { rows, meta } = rowsAndMetaFromAdminList<AdminStoreBanner>(response);
        setBanners(rows);
        setPaginationMeta(meta);
      } catch {
        setLoadError('Could not load store ads.');
        showToast('error', 'Failed to load banners');
      } finally {
        setLoading(false);
      }
    },
    [approvalFilter, showToast]
  );

  useEffect(() => {
    void loadBanners(page);
  }, [page, loadBanners]);

  const handleApprove = async (id: number) => {
    try {
      await storeBannerAdminService.approve(id);
      showToast('success', 'Ad approved');
      void loadBanners(page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Approve failed');
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (rejectId == null) return;
    await storeBannerAdminService.reject(rejectId, reason);
    showToast('success', 'Ad rejected');
    void loadBanners(page);
  };

  const handleToggle = async (id: number) => {
    try {
      await storeBannerAdminService.toggleActive(id);
      showToast('success', 'Visibility updated');
      void loadBanners(page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Toggle failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this ad from the platform?')) return;
    try {
      await storeBannerAdminService.delete(id);
      showToast('success', 'Ad removed');
      void loadBanners(page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Store ads</h1>
          <p className="text-slate-500">Approve or reject seller banner placements (home carousel and store creatives)</p>
        </div>

        <GlassCard>
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            <select
              value={approvalFilter}
              onChange={(e) => {
                setApprovalFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
            >
              <option value="">All</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          {loadError && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-slate-900">
              <p className="text-sm flex-1">{loadError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadBanners(page)}>
                Retry
              </Button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading…</div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No ads found</div>
          ) : (
            <div className="space-y-4">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="glass rounded-xl p-4 flex flex-col lg:flex-row gap-4 border border-slate-100"
                >
                  <div className="relative w-full max-w-[200px] h-[100px] shrink-0 rounded-lg overflow-hidden bg-slate-100">
                    {b.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400 p-2">No preview</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{b.store?.name || `Store #${b.store_id}`}</p>
                    <p className="text-sm text-slate-500 truncate">{b.title || 'Untitled'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {b.position} · home boost: {b.is_home_boosted ? 'yes' : 'no'}
                    </p>
                    {!b.is_approved && b.rejection_reason && (
                      <p className="text-xs text-red-200/90 mt-2 line-clamp-2">{b.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge variant={b.is_approved ? 'success' : 'warning'}>
                      {b.is_approved ? 'Approved' : 'Pending'}
                    </Badge>
                    <Badge variant={b.is_active ? 'info' : 'default'}>{b.is_active ? 'Live' : 'Off'}</Badge>
                    <Button size="sm" variant="primary" onClick={() => handleApprove(b.id)} disabled={b.is_approved}>
                      Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setRejectId(b.id)}>
                      Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggle(b.id)} disabled={!b.is_approved}>
                      Toggle live
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PaginationBar meta={paginationMeta} loading={loading} onPageChange={(p) => setPage(p)} />
        </GlassCard>

        <RejectReasonModal
          isOpen={rejectId != null}
          title="Reject store ad"
          description="The ad will be hidden from shoppers until the seller uploads a new one or you approve it again."
          onClose={() => setRejectId(null)}
          onConfirm={handleRejectConfirm}
          confirmLabel="Reject ad"
        />
      </div>
    </AdminLayout>
  );
}
