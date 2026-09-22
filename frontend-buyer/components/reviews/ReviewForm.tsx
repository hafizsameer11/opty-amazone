'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { getAxiosErrorMessage } from '@/lib/api-client';
import {
  reviewService,
  type ReviewEligibility,
  type ReviewEligibilityOption,
} from '@/services/review-service';

interface ReviewFormProps {
  type: 'product' | 'store';
  id: number;
  onSaved?: () => void | Promise<void>;
  triggerLabel?: string;
  className?: string;
  orderItemId?: number;
  storeOrderId?: number;
}

export default function ReviewForm({
  type,
  id,
  onSaved,
  triggerLabel,
  className = '',
  orderItemId,
  storeOrderId,
}: ReviewFormProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<ReviewEligibilityOption | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const imageInputId = useId();

  const openReview = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setChecking(true);
    setNotice(null);
    try {
      const result = type === 'product'
        ? await reviewService.getProductEligibility(id)
        : await reviewService.getStoreEligibility(id);
      setEligibility(result);

      if (!result.eligible) {
        setNotice(result.already_reviewed
          ? 'You have already reviewed this purchase.'
          : 'A delivered purchase is required before you can leave a review.');
        return;
      }

      const selected = result.options.find((option) =>
        type === 'product' ? option.order_item_id === orderItemId : option.store_order_id === storeOrderId
      ) || result.options[0];
      setSelectedPurchase(selected || null);
      setOpen(true);
    } catch (error) {
      setNotice(getAxiosErrorMessage(error) || 'Could not verify review eligibility.');
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    if (!selectedPurchase || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      if (type === 'product') {
        await reviewService.createProductReview(id, {
          rating,
          comment: comment.trim() || undefined,
          order_item_id: selectedPurchase.order_item_id,
          image,
        });
      } else {
        await reviewService.createStoreReview(id, {
          rating,
          comment: comment.trim() || undefined,
          store_order_id: selectedPurchase.store_order_id,
        });
      }
      setOpen(false);
      setComment('');
      setImage(null);
      setNotice('Review submitted successfully.');
      await onSaved?.();
    } catch (error) {
      setNotice(getAxiosErrorMessage(error) || 'Could not submit your review.');
    } finally {
      setBusy(false);
    }
  };

  const purchaseLabel = (option: ReviewEligibilityOption) =>
    option.order_no ? `Order ${option.order_no}` : `Order #${option.order_id}`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        disabled={checking}
        onClick={() => void openReview()}
      >
        {checking ? 'Checking purchase…' : (triggerLabel || (type === 'product' ? 'Review Product' : 'Leave Review'))}
      </Button>
      {notice && <p className="mt-2 text-xs text-gray-600">{notice}</p>}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={type === 'product' ? 'Review Product' : 'Review Store'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This review is linked to your delivered purchase and will be shown as a verified purchase.
          </p>

          {eligibility && eligibility.options.length > 1 && (
            <label className="block text-sm font-medium text-gray-700">
              Purchase
              <select
                value={type === 'product' ? selectedPurchase?.order_item_id ?? '' : selectedPurchase?.store_order_id ?? ''}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSelectedPurchase(eligibility.options.find((option) =>
                    type === 'product' ? option.order_item_id === value : option.store_order_id === value
                  ) || null);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {eligibility.options.map((option) => (
                  <option key={type === 'product' ? option.order_item_id : option.store_order_id} value={type === 'product' ? option.order_item_id : option.store_order_id}>
                    {purchaseLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700">Rating</p>
            <div className="mt-1 flex gap-1" aria-label="Choose a rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-label={`${value} star${value === 1 ? '' : 's'}`}
                  onClick={() => setRating(value)}
                  className={`text-2xl ${value <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Share your experience"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
          />

          {type === 'product' && (
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor={imageInputId}>
                Product photo <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input
                id={imageInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0066CC]/10 file:px-3 file:py-1.5 file:font-medium file:text-[#0066CC]"
              />
              <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WEBP up to 5 MB.</p>
              {image && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  <span className="truncate">{image.name}</span>
                  <button type="button" className="ml-3 text-red-600 hover:underline" onClick={() => setImage(null)}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy || !selectedPurchase} onClick={() => void submit()}>
              {busy ? 'Submitting…' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
