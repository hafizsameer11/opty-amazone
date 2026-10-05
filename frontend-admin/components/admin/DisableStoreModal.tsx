'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StoreDetail } from '@/services/seller-service';

interface DisableStoreModalProps {
  isOpen: boolean;
  store: Pick<StoreDetail, 'id' | 'name'> | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

/**
 * Confirmation for the non-destructive alternative to deletion.
 *
 * A store with orders or wallet movement can never be permanently deleted, so
 * the admin disables it instead: it disappears from buyers while every
 * financial record is kept.
 */
export default function DisableStoreModal({ isOpen, store, onClose, onConfirm }: DisableStoreModalProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (cause) {
      setError(
        (cause as { response?: { data?: { message?: string } } })?.response?.data?.message
          || t('requestFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('disableStoreTitle')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{t('disableStoreNoticeTitle')}</p>
          <p className="mt-1 text-sm text-amber-800">{t('disableStoreNotice', { name: store?.name ?? '' })}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">
            <li>{t('disableStoreHidesFromBuyers')}</li>
            <li>{t('disableStoreKeepsRecords')}</li>
            <li>{t('disableStoreReversible')}</li>
          </ul>
        </div>

        <div>
          <label htmlFor="disable-store-reason" className="mb-2 block text-sm font-semibold text-slate-800">
            {t('disableStoreReasonLabel')}
          </label>
          <textarea
            id="disable-store-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError('');
            }}
            rows={3}
            placeholder={t('disableStoreReasonPlaceholder')}
            disabled={submitting}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-y"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={submitting}>
            {submitting ? t('disabling') : t('disableStoreConfirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}