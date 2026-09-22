'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { reviewService, type SellerReview, type SellerReviewType } from '@/services/review-service';
import { resolveMediaUrl } from '@/lib/media-url';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReviewsPanel() {
  const { t } = useLanguage();
  const [activeType, setActiveType] = useState<SellerReviewType>('store');
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await reviewService.getReviews(activeType);
      setReviews(response.reviews || []);
    } catch (requestError) {
      console.error('Failed to load seller reviews:', requestError);
      setError(t('reviews.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useLiveRefresh(() => loadReviews(true), true, 30000);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('reviews.title')}</h2>
        <p className="mt-1 text-sm text-gray-600">
          {t('reviews.description')}
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
            {type === 'store' ? t('reviews.store') : t('reviews.product')}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-gray-500">{t('reviews.loading')}</p>
      ) : error ? (
        <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : reviews.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">{activeType === 'store' ? t('reviews.noStore') : t('reviews.noProduct')}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {reviews.map((review) => {
            const title = activeType === 'product'
              ? review.product?.name || t('reviews.productReview')
              : review.store?.name || t('reviews.storeReview');
            const reviewer = review.user?.name || t('reviews.verifiedCustomer');

            return (
              <article key={`${activeType}-${review.id}`} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('reviews.by')} {reviewer}
                      {review.created_at ? ` · ${new Date(review.created_at).toLocaleDateString()}` : ''}
                      {review.is_verified_purchase ? ` · ${t('reviews.verifiedPurchase')}` : ''}
                    </p>
                  </div>
                  <span className="text-lg tracking-tight text-yellow-500" aria-label={t('reviews.ratingAria', { rating: review.rating })}>
                    {'★'.repeat(Number(review.rating))}{'☆'.repeat(5 - Number(review.rating))}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-600">{review.comment || t('reviews.noComment')}</p>
                {activeType === 'product' && review.image_url && (
                  <a href={resolveMediaUrl(review.image_url)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveMediaUrl(review.image_url)}
                      alt={t('reviews.customerPhoto', { title })}
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
