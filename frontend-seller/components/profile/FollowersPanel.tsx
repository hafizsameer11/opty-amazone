'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { displayProfileImageUrl } from '@/lib/profile-image-url';
import { StoreService } from '@/services/store-service';
import type { StoreFollower, StoreFollowersPagination } from '@/types/store';
import { useLanguage } from '@/contexts/LanguageContext';

const formatDate = (value: string | null | undefined, unavailable = 'Not available') => {
  if (!value) return unavailable;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? unavailable : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const errorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const requestError = error as { response?: { data?: { message?: unknown } } };
  return typeof requestError.response?.data?.message === 'string' ? requestError.response.data.message : fallback;
};

export default function FollowersPanel() {
  const { t } = useLanguage();
  const [followers, setFollowers] = useState<StoreFollower[]>([]);
  const [pagination, setPagination] = useState<StoreFollowersPagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFollowers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await StoreService.getFollowers({ page, per_page: 20 });
      setFollowers(response.data.followers ?? []);
      setPagination(response.data.pagination ?? null);
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, t('followers.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadFollowers();
  }, [loadFollowers]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">{t('followers.community')}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">{t('followers.title')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('followers.description')}</p>
        </div>
        <div className="rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-800">
          {t('followers.total', { count: pagination?.total ?? followers.length })}
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {error && <Alert type="error" message={error} className="mb-5" />}
        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
            <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            Loading followers…
          </div>
        ) : followers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-2xl text-violet-700">♡</div>
            <h3 className="mt-4 font-bold text-slate-900">{t('followers.emptyTitle')}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{t('followers.emptyDescription')}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {followers.map((follower) => {
              const avatar = displayProfileImageUrl(follower.user.profile_image_url);
              return (
                <article key={follower.id} className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 font-bold text-violet-700 ring-2 ring-white shadow-sm">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt={follower.user.name} className="h-full w-full object-cover" />
                    ) : (
                      follower.user.name?.charAt(0)?.toUpperCase() ?? 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900">{follower.user.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{t('followers.followingSince', { date: formatDate(follower.followed_at, t('followers.notAvailable')) })}</p>
                    <p className="mt-1 text-xs text-slate-400">{t('followers.memberSince', { date: formatDate(follower.user.created_at, t('followers.notAvailable')) })}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pagination && pagination.last_page > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-500">{t('followers.page', { current: pagination.current_page, last: pagination.last_page })}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((currentPage) => currentPage - 1)}>{t('followers.previous')}</Button>
              <Button variant="outline" size="sm" disabled={page >= pagination.last_page || loading} onClick={() => setPage((currentPage) => currentPage + 1)}>{t('followers.next')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
