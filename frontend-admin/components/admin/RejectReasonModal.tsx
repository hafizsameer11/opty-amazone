'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface RejectReasonModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  confirmLabel?: string;
}

export default function RejectReasonModal({
  isOpen,
  title,
  description = 'Please provide a clear reason. The seller or system may show this text where appropriate.',
  onClose,
  onConfirm,
  confirmLabel = 'Confirm reject',
}: RejectReasonModalProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('Enter at least 3 characters.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch {
      setError('Request failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-900/75">{description}</p>
        <textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          rows={4}
          className="w-full px-4 py-3 rounded-lg glass border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 resize-y min-h-[100px]"
          placeholder="Reason…"
          disabled={submitting}
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={submitting}>
            {submitting ? 'Submitting…' : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
