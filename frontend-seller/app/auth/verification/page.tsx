'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import apiClient from '@/lib/api-client';
import SellerAuthShell, { AuthFeedback } from '@/components/auth/SellerAuthShell';
import SellerAuthInput from '@/components/auth/SellerAuthInput';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SellerVerificationPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    business_type: '',
    business_registration: '',
    tax_id: '',
    business_address: '',
    website: '',
    id_document_url: '',
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/auth/login');
  }, [isAuthenticated, loading, router]);

  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/seller/verification/submit', form);
      setSuccess(t('auth.verificationSubmitted'));
       setTimeout(() => router.push('/auth/pending-approval'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.verificationFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !isAuthenticated) return null;

  return (
    <SellerAuthShell
      eyebrow={t('auth.verificationEyebrow')}
      title={t('auth.verifyBusiness')}
      description={t('auth.verificationDescription')}
      sideTitle={t('auth.verifySideTitle')}
      sideDescription={t('auth.verifySideDescription')}
      steps={[t('auth.stepCreateAccount'), t('auth.stepBusinessDetails'), t('auth.stepStoreSetup')]}
      activeStep={1}
      wideForm
    >
      <div className="mb-7 flex items-start gap-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg text-[#0789c5] shadow-sm">✓</span>
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{t('auth.accountCreated')}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{t('auth.accountCreatedHint')}</p>
        </div>
      </div>

      {error && <div className="mb-5"><AuthFeedback type="error" message={error} onClose={() => setError('')} /></div>}
      {success && <div className="mb-5"><AuthFeedback type="success" message={success} onClose={() => setSuccess('')} /></div>}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('auth.businessIdentity')}</p>
          <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
            <SellerAuthInput id="business-type" label={t('auth.businessType')} icon="store" value={form.business_type} onChange={(event) => updateField('business_type', event.target.value)} placeholder={t('auth.opticalRetailer')} required />
            <SellerAuthInput id="business-registration" label={t('auth.registrationNumber')} icon="document" value={form.business_registration} onChange={(event) => updateField('business_registration', event.target.value)} placeholder={t('auth.companyRegistration')} required />
            <SellerAuthInput id="tax-id" label={t('auth.taxId')} icon="document" value={form.tax_id} onChange={(event) => updateField('tax_id', event.target.value)} hint={t('common.optional')} />
            <SellerAuthInput id="website" label={t('auth.businessWebsite')} icon="link" value={form.website} onChange={(event) => updateField('website', event.target.value)} placeholder="https://..." hint={t('common.optional')} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('auth.addressAndDocument')}</p>
          <div className="space-y-5">
            <SellerAuthInput id="business-address" label={t('auth.registeredAddress')} icon="document" value={form.business_address} onChange={(event) => updateField('business_address', event.target.value)} placeholder={t('auth.addressPlaceholder')} required />
            <SellerAuthInput id="id-document-url" label={t('auth.identityDocumentUrl')} icon="link" value={form.id_document_url} onChange={(event) => updateField('id_document_url', event.target.value)} placeholder="https://..." hint={t('common.optional')} />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3.5 text-xs leading-5 text-slate-500">
          <span className="mt-0.5 text-[#0789c5]" aria-hidden="true">●</span>
          <p>{t('auth.verificationNotice')}</p>
        </div>
        <Button type="submit" variant="primary" size="lg" isLoading={saving} className="w-full !rounded-xl !py-3.5">{t('auth.submitVerification')}</Button>
      </form>

      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
        <Link href="/auth/pending-approval" className="font-bold text-[#0789c5] hover:text-[#006b99]">{t('auth.applicationStatus')}</Link>
      </div>
    </SellerAuthShell>
  );
}
