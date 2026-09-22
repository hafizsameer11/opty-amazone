'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { StoreService } from '@/services/store-service';
import type { Store, StoreProfile } from '@/types/store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EditStorePage() {
  const { t } = useLanguage();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      }
    >
      <EditStorePageContent />
    </Suspense>
  );
}

function EditStorePageContent() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetupWizard = searchParams.get('setup') === '1';
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [deletingProfileImage, setDeletingProfileImage] = useState(false);
  const [deletingBannerImage, setDeletingBannerImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    profile: {
      tagline: '',
      business_type: '',
      registration_number: '',
      tax_id: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      website: '',
      support_email: '',
      shipping_policy: '',
      return_policy: '',
    } satisfies StoreProfile,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStore();
    }
  }, [isAuthenticated]);

  const loadStore = async () => {
    try {
      setLoadingStore(true);
      const response = await StoreService.getStore();
      const storeData = response.data.store;
      setStore(storeData);
      setFormData({
        name: storeData.name || '',
        description: storeData.description || '',
        email: storeData.email || '',
        phone: storeData.phone || '',
        profile: {
          tagline: storeData.meta?.profile?.tagline || '',
          business_type: storeData.meta?.profile?.business_type || '',
          registration_number: storeData.meta?.profile?.registration_number || '',
          tax_id: storeData.meta?.profile?.tax_id || '',
          address: storeData.meta?.profile?.address || '',
          city: storeData.meta?.profile?.city || '',
          state: storeData.meta?.profile?.state || '',
          postal_code: storeData.meta?.profile?.postal_code || '',
          country: storeData.meta?.profile?.country || '',
          website: storeData.meta?.profile?.website || '',
          support_email: storeData.meta?.profile?.support_email || '',
          shipping_policy: storeData.meta?.profile?.shipping_policy || '',
          return_policy: storeData.meta?.profile?.return_policy || '',
        },
      });
    } catch (error) {
      console.error('Failed to load store:', error);
      setError(t('store.failedUpdate'));
    } finally {
      setLoadingStore(false);
    }
  };

  const getFullImageUrl = (url?: string | null) => {
    if (!url) return '';
    const normalized = String(url).trim();
    if (!normalized) return '';
    if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('data:')) {
      return normalized;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const backendBase = apiBase.replace('/api', '');
    const relativePath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `${backendBase}${relativePath}`;
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'profile' | 'banner'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setSuccess(null);

      if (type === 'profile') setUploadingProfileImage(true);
      if (type === 'banner') setUploadingBannerImage(true);

      const response = type === 'profile'
        ? await StoreService.uploadProfileImage(file)
        : await StoreService.uploadBannerImage(file);

      if (response.success && response.data?.store) {
        setStore(response.data.store);
        setSuccess(type === 'profile' ? t('store.logoRemoved') : t('store.bannerRemoved'));
      }
    } catch (uploadError: any) {
      setError(uploadError.response?.data?.message || t('store.failedImage', { type }));
    } finally {
      if (type === 'profile') setUploadingProfileImage(false);
      if (type === 'banner') setUploadingBannerImage(false);
      event.target.value = '';
    }
  };

  const handleDeleteImage = async (type: 'profile' | 'banner') => {
    try {
      setError(null);
      setSuccess(null);

      if (type === 'profile') setDeletingProfileImage(true);
      if (type === 'banner') setDeletingBannerImage(true);

      const response = type === 'profile'
        ? await StoreService.deleteProfileImage()
        : await StoreService.deleteBannerImage();

      if (response.success && response.data?.store) {
        setStore(response.data.store);
        setSuccess(type === 'profile' ? t('store.logoRemoved') : t('store.bannerRemoved'));
      }
    } catch (deleteError: any) {
      setError(deleteError.response?.data?.message || t('store.failedImage', { type }));
    } finally {
      if (type === 'profile') setDeletingProfileImage(false);
      if (type === 'banner') setDeletingBannerImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await StoreService.updateStore(formData);
      if (isSetupWizard) {
        await StoreService.completeStoreSetup();
      }
      setSuccess(isSetupWizard ? t('store.setupComplete') : t('store.saved'));
      setTimeout(() => {
        router.push('/store');
      }, 1500);
    } catch (error: any) {
      setError(error.response?.data?.message || t('store.failedUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const updateProfileField = (field: keyof StoreProfile, value: string) => {
    setFormData((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  };

  if (loading || loadingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <div className="flex h-full min-h-0">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="py-6">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('store.editTitle')}</h1>
                  <p className="text-gray-600">{t('store.editSubtitle')}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
                  {error && <Alert type="error" message={error} className="mb-6" />}
                  {success && <Alert type="success" message={success} className="mb-6" />}

                  <div className="mb-8 pb-8 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('store.images')}</h2>
                    <p className="text-sm text-gray-600 mb-5">{t('store.imagesDescription')}</p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-sm font-semibold text-gray-900 mb-3">{t('store.logo')}</p>
                        <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-200 overflow-hidden mb-4 flex items-center justify-center">
                          {store?.profile_image_url || store?.profile_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getFullImageUrl(store.profile_image_url || store.profile_image)}
                              alt="Store logo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-gray-400">
                              {store?.name?.charAt(0).toUpperCase() || 'S'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, 'profile')}
                              disabled={uploadingProfileImage || deletingProfileImage}
                            />
                            <span className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0066CC] text-white text-sm font-medium hover:bg-[#0052a3] cursor-pointer disabled:opacity-50">
                              {uploadingProfileImage ? t('store.uploading') : t('store.uploadLogo')}
                            </span>
                          </label>
                          {(store?.profile_image_url || store?.profile_image) && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleDeleteImage('profile')}
                              disabled={deletingProfileImage || uploadingProfileImage}
                            >
                              {deletingProfileImage ? t('store.removing') : t('store.remove')}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-sm font-semibold text-gray-900 mb-3">{t('store.banner')}</p>
                        <div className="w-full h-28 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden mb-4 flex items-center justify-center">
                          {store?.banner_image_url || store?.banner_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getFullImageUrl(store.banner_image_url || store.banner_image)}
                              alt="Store banner"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-400">{t('store.noBanner')}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, 'banner')}
                              disabled={uploadingBannerImage || deletingBannerImage}
                            />
                            <span className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0066CC] text-white text-sm font-medium hover:bg-[#0052a3] cursor-pointer disabled:opacity-50">
                              {uploadingBannerImage ? t('store.uploading') : t('store.uploadBanner')}
                            </span>
                          </label>
                          {(store?.banner_image_url || store?.banner_image) && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleDeleteImage('banner')}
                              disabled={deletingBannerImage || uploadingBannerImage}
                            >
                              {deletingBannerImage ? t('store.removing') : t('store.remove')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('store.information')}</h2>
                    <p className="text-sm text-gray-600">{t('store.informationDescription')}</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('store.storeName')}
                      </label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full"
                         placeholder={t('store.storeNamePlaceholder')}
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('store.descriptionLabel')}
                      </label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all"
                        placeholder={t('store.descriptionPlaceholder')}
                      />
                      <p className="text-xs text-gray-500 mt-1">{t('store.descriptionHint')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          {t('store.email')}
                        </label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full"
                          placeholder={t('store.emailPlaceholder')}
                        />
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          {t('store.phone')}
                        </label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full"
                          placeholder={t('store.phonePlaceholder')}
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('store.professional')}</h2>
                      <p className="text-sm text-gray-600 mb-5">{t('store.professionalDescription')}</p>
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-2">{t('store.tagline')}</label>
                            <Input id="tagline" value={formData.profile.tagline || ''} onChange={(e) => updateProfileField('tagline', e.target.value)} placeholder={t('store.taglinePlaceholder')} />
                          </div>
                          <div>
                            <label htmlFor="business-type" className="block text-sm font-medium text-gray-700 mb-2">{t('store.businessType')}</label>
                            <Input id="business-type" value={formData.profile.business_type || ''} onChange={(e) => updateProfileField('business_type', e.target.value)} placeholder={t('store.businessTypePlaceholder')} />
                          </div>
                          <div>
                            <label htmlFor="registration-number" className="block text-sm font-medium text-gray-700 mb-2">{t('store.registrationNumber')}</label>
                            <Input id="registration-number" value={formData.profile.registration_number || ''} onChange={(e) => updateProfileField('registration_number', e.target.value)} placeholder={t('store.registrationNumberPlaceholder')} />
                          </div>
                          <div>
                            <label htmlFor="tax-id" className="block text-sm font-medium text-gray-700 mb-2">{t('store.taxId')}</label>
                            <Input id="tax-id" value={formData.profile.tax_id || ''} onChange={(e) => updateProfileField('tax_id', e.target.value)} placeholder={t('common.optional')} />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="business-address" className="block text-sm font-medium text-gray-700 mb-2">{t('store.address')}</label>
                          <Input id="business-address" value={formData.profile.address || ''} onChange={(e) => updateProfileField('address', e.target.value)} placeholder={t('store.addressPlaceholder')} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {([['city', t('store.city')], ['state', t('store.state')], ['postal_code', t('store.postalCode')], ['country', t('store.country')]] as const).map(([field, label]) => (
                            <div key={field}>
                              <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                              <Input id={field} value={formData.profile[field] || ''} onChange={(e) => updateProfileField(field, e.target.value)} />
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">{t('store.website')}</label>
                          <Input id="website" type="url" value={formData.profile.website || ''} onChange={(e) => updateProfileField('website', e.target.value)} placeholder={t('store.websitePlaceholder')} />
                          </div>
                          <div>
                            <label htmlFor="support-email" className="block text-sm font-medium text-gray-700 mb-2">{t('store.supportEmail')}</label>
                          <Input id="support-email" type="email" value={formData.profile.support_email || ''} onChange={(e) => updateProfileField('support_email', e.target.value)} placeholder={t('store.supportEmailPlaceholder')} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="shipping-policy" className="block text-sm font-medium text-gray-700 mb-2">{t('store.shippingPolicy')}</label>
                          <textarea id="shipping-policy" value={formData.profile.shipping_policy || ''} onChange={(e) => updateProfileField('shipping_policy', e.target.value)} rows={4} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#0066CC] focus:outline-none focus:ring-2 focus:ring-[#0066CC]" placeholder={t('store.shippingPolicyPlaceholder')} />
                          </div>
                          <div>
                            <label htmlFor="return-policy" className="block text-sm font-medium text-gray-700 mb-2">{t('store.returnPolicy')}</label>
                          <textarea id="return-policy" value={formData.profile.return_policy || ''} onChange={(e) => updateProfileField('return_policy', e.target.value)} rows={4} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#0066CC] focus:outline-none focus:ring-2 focus:ring-[#0066CC]" placeholder={t('store.returnPolicyPlaceholder')} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                      <Button 
                        type="submit" 
                        disabled={saving}
                        className="bg-[#0066CC] hover:bg-[#0052a3] text-white font-semibold px-6"
                      >
                        {saving ? t('common.loading') : t('store.saveChanges')}
                      </Button>
                      <Link href="/store">
                        <Button type="button" variant="outline" className="px-6">
                          {t('common.cancel')}
                        </Button>
                      </Link>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
