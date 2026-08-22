'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import apiClient from '@/lib/api-client';

export default function SellerVerificationPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    bank_account_holder: '',
    bank_name: '',
    bank_iban: '',
    tax_id: '',
    business_registration: '',
    id_document_url: '',
  });

  if (!loading && !isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/seller/verification/submit', form);
      setSuccess('Verification submitted. You will be notified once approved.');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit verification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Seller verification — Step 1</h1>
        <p className="text-sm text-gray-600 mb-6">
          Submit your business and bank details. After admin approval you can complete store setup.
        </p>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Bank account holder *"
            value={form.bank_account_holder}
            onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })}
            required
          />
          <Input
            label="Bank name *"
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            required
          />
          <Input
            label="IBAN"
            value={form.bank_iban}
            onChange={(e) => setForm({ ...form, bank_iban: e.target.value })}
          />
          <Input
            label="Tax ID / VAT"
            value={form.tax_id}
            onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
          />
          <Input
            label="Business registration number"
            value={form.business_registration}
            onChange={(e) => setForm({ ...form, business_registration: e.target.value })}
          />
          <Input
            label="ID document URL (optional)"
            value={form.id_document_url}
            onChange={(e) => setForm({ ...form, id_document_url: e.target.value })}
            placeholder="https://..."
          />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit for review'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/dashboard" className="text-[#0066CC] hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
