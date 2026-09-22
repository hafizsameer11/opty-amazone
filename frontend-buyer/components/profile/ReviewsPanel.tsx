'use client';

import { useCallback, useEffect, useState } from 'react';
import { getFullImageUrl } from '@/lib/image-utils';
import apiClient from '@/lib/api-client';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

type ReviewType = 'store' | 'product';

interface ReviewRow {
  id: number;
  type: ReviewType;
  rating: number;
  comment?: string | null;
  image_url?: string | null;
  is_verified_purchase: boolean;
  created_at?: string | null;
  product?: { id: number; name: string } | null;
  store?: { id: number; name: string } | null;
}

export default function ReviewsPanel() {
  const [activeType, setActiveType] = useState<ReviewType>('store');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await apiClient.get('/buyer/profile/reviews', {
        params: { type: activeType, per_page: 100 },
      });
      const reviews = response.data?.data?.reviews;
      setRows(Array.isArray(reviews) ? reviews : []);
    } catch (requestError) {
      console.error('Failed to load buyer reviews:', requestError);
      setError('Could not load your reviews right now.');
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh(() => load(true), true, 30000);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Your Reviews</h2>
        <p className="mt-1 text-sm text-gray-600">
          See the verified reviews you have submitted for stores and products.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {(['store', 'product'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeType === type
                ? 'bg-[#0066CC] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type === 'store' ? 'Store Reviews' : 'Product Reviews'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-gray-500">Loading reviews…</p>
      ) : error ? (
        <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">
          You have not submitted any {activeType === 'store' ? 'store' : 'product'} reviews yet.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((review) => {
            const title = activeType === 'product'
              ? review.product?.name || 'Product review'
              : review.store?.name || 'Store review';

            return (
              <article key={`${review.type}-${review.id}`} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                      {review.is_verified_purchase ? ' · Verified purchase' : ''}
                    </p>
                  </div>
                  <span className="text-lg tracking-tight text-yellow-500" aria-label={`${review.rating} out of 5 stars`}>
                    {'★'.repeat(Number(review.rating))}{'☆'.repeat(5 - Number(review.rating))}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-600">{review.comment || 'No written comment.'}</p>
                {activeType === 'product' && review.image_url && (
                  <a href={getFullImageUrl(review.image_url)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getFullImageUrl(review.image_url)}
                      alt={`Your product review photo for ${title}`}
                      className="h-28 w-28 rounded-lg border border-gray-200 object-cover"
                    />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
