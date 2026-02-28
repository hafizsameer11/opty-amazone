'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { StoreService } from '@/services/store-service';
import type { Store } from '@/types/store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function EditStorePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
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
      });
    } catch (error) {
      console.error('Failed to load store:', error);
      setError('Failed to load store');
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
        setSuccess(type === 'profile' ? 'Store logo updated successfully' : 'Store banner updated successfully');
      }
    } catch (uploadError: any) {
      setError(uploadError.response?.data?.message || `Failed to upload ${type} image`);
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
        setSuccess(type === 'profile' ? 'Store logo removed successfully' : 'Store banner removed successfully');
      }
    } catch (deleteError: any) {
      setError(deleteError.response?.data?.message || `Failed to remove ${type} image`);
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
      setSuccess('Store updated successfully');
      setTimeout(() => {
        router.push('/store');
      }, 1500);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update store');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="py-6">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Store</h1>
                  <p className="text-gray-600">Update your store information and details</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
                  {error && <Alert type="error" message={error} className="mb-6" />}
                  {success && <Alert type="success" message={success} className="mb-6" />}

                  <div className="mb-8 pb-8 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Store Images</h2>
                    <p className="text-sm text-gray-600 mb-5">Update your store logo and banner shown to buyers</p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-sm font-semibold text-gray-900 mb-3">Store Logo</p>
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
                              {uploadingProfileImage ? 'Uploading...' : 'Upload Logo'}
                            </span>
                          </label>
                          {(store?.profile_image_url || store?.profile_image) && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleDeleteImage('profile')}
                              disabled={deletingProfileImage || uploadingProfileImage}
                            >
                              {deletingProfileImage ? 'Removing...' : 'Remove'}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-sm font-semibold text-gray-900 mb-3">Store Banner</p>
                        <div className="w-full h-28 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden mb-4 flex items-center justify-center">
                          {store?.banner_image_url || store?.banner_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getFullImageUrl(store.banner_image_url || store.banner_image)}
                              alt="Store banner"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-400">No banner image</span>
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
                              {uploadingBannerImage ? 'Uploading...' : 'Upload Banner'}
                            </span>
                          </label>
                          {(store?.banner_image_url || store?.banner_image) && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleDeleteImage('banner')}
                              disabled={deletingBannerImage || uploadingBannerImage}
                            >
                              {deletingBannerImage ? 'Removing...' : 'Remove'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Store Information</h2>
                    <p className="text-sm text-gray-600">Update your store details to help customers find you</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Store Name *
                      </label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full"
                        placeholder="Enter your store name"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all"
                        placeholder="Tell customers about your store..."
                      />
                      <p className="text-xs text-gray-500 mt-1">Describe what makes your store special</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full"
                          placeholder="store@example.com"
                        />
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Phone
                        </label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full"
                          placeholder="+1234567890"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                      <Button 
                        type="submit" 
                        disabled={saving}
                        className="bg-[#0066CC] hover:bg-[#0052a3] text-white font-semibold px-6"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Link href="/store">
                        <Button type="button" variant="outline" className="px-6">
                          Cancel
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
