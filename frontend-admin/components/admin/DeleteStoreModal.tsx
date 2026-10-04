'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StoreDetail } from '@/services/seller-service';

/** Pull the backend's refusal reason out of an axios failure. */
function apiErrorMessage(cause: unknown): string {
  if (!cause || typeof cause !== 'object' || !('response' in cause)) return '';
  const data = (cause as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
  return data?.errors?.store?.[0] || data?.message || '';
}

interface DeleteStoreModalProps {
  isOpen: boolean;
  store: Pick<StoreDetail, 'id' | 'name'> | null;
  /** False when the backend will refuse because the store has money history. */
  deletable: boolean;
  /** True while the parent view is still asking the backend about deletability. */
  checking?: boolean;
  /** Populated when the store cannot be deleted, to explain why. */
  blockedReason?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * Destructive confirmation for permanently removing a store.
 *
 * The admin has to retype the store name because this cannot be undone and it
 * removes every product, banner and campaign the store owns.
 */
export default function DeleteStoreModal({
  isOpen,
  store,
  deletable,
  checking = false,
  blockedReason,
  onClose,
  onConfirm,
}: DeleteStoreModalProps) {
  const { t } = useLanguage();
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setConfirmation('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const expected = store?.name ?? '';
  const matches = confirmation.trim() === expected;

  const consequences = useMemo(
    () =>
      [
        t('deleteStoreRemovesProducts'),
        t('deleteStoreRemovesCampaigns'),
        t('deleteStoreRemovesStoreData'),
        t('deleteStoreCannotUndo'),
      ],
    [t]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!matches) {
      setError(t('deleteStoreTypeNameToConfirm'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (cause) {
      setError(apiErrorMessage(cause) || t('requestFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('deleteStoreTitle')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">{t('deleteStoreWarningTitle')}</p>
          <p className="mt-1 text-sm text-red-700">{t('deleteStoreWarningBody', { name: expected })}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700">
            {consequences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {checking ? (
          <p className="text-sm text-slate-500">{t('deleteStoreChecking')}</p>
        ) : !deletable ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">{t('deleteStoreBlockedTitle')}</p>
            <p className="mt-1">{blockedReason || t('deleteStoreBlockedFallback')}</p>
            <p className="mt-2">{t('deleteStoreBlockedAlternative')}</p>
          </div>
        ) : (
          <div>
            <label htmlFor="delete-store-confirm" className="mb-2 block text-sm font-semibold text-slate-800">
              {t('deleteStoreConfirmLabel')}
            </label>
            <input
              id="delete-store-confirm"
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value);
                setError('');
              }}
              placeholder={expected}
              autoComplete="off"
              disabled={submitting}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="danger" disabled={submitting || checking || !deletable || !matches}>
            {submitting ? t('deleting') : t('deleteStoreConfirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}