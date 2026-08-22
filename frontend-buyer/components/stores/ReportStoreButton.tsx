'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import apiClient, { getAxiosErrorMessage } from '@/lib/api-client';

export default function ReportStoreButton({ storeId, storeName }: { storeId: number; storeName: string }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('fraud');
  const [details, setDetails] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/stores/${storeId}`)}`);
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('reason', reason);
      if (details.trim()) fd.append('details', details.trim());
      if (files) {
        Array.from(files).slice(0, 5).forEach((f) => fd.append('evidence[]', f));
      }
      await apiClient.post(`/buyer/stores/${storeId}/report`, fd);
      setMessage('Report submitted. Vista Express admin will review it.');
      setOpen(false);
      setDetails('');
      setFiles(null);
    } catch (e) {
      setMessage(getAxiosErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-red-600 hover:underline"
      >
        Report this store
      </button>
      {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}
      {open && (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-gray-800">
            Report <span className="font-semibold">{storeName}</span> to Vista Express admin (login required).
          </p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="fraud">Suspected fraud</option>
            <option value="counterfeit">Counterfeit / fake products</option>
            <option value="harassment">Harassment</option>
            <option value="other">Other</option>
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="Describe what happened (optional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            maxLength={5000}
          />
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => setFiles(e.target.files)}
            className="text-xs"
          />
          <div className="flex gap-2">
            <Button variant="danger" size="sm" disabled={sending} onClick={() => void submit()}>
              {sending ? 'Submitting…' : 'Submit report'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
