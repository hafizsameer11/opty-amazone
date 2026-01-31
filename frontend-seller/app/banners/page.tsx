'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { bannerService, type Banner } from '@/services/banner-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Image from 'next/image';

export default function BannersPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    image: null as File | null,
    title: '',
    link: '',
    position: 'top' as 'top' | 'middle' | 'bottom' | 'sidebar',
    is_active: true,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadBanners();
    }
  }, [isAuthenticated]);

  const loadBanners = async () => {
    try {
      setLoadingBanners(true);
      const data = await bannerService.getAll();
      setBanners(data || []);
    } catch (error) {
      console.error('Failed to load banners:', error);
      setError('Failed to load banners');
    } finally {
      setLoadingBanners(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }
      formDataToSend.append('title', formData.title);
      formDataToSend.append('link', formData.link);
      formDataToSend.append('position', formData.position);
      formDataToSend.append('is_active', formData.is_active.toString());

      if (editingBanner) {
        await bannerService.update(editingBanner.id, formDataToSend);
        setSuccess('Banner updated successfully');
      } else {
        await bannerService.create(formDataToSend);
        setSuccess('Banner created successfully');
      }

      resetForm();
      loadBanners();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save banner');
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      image: null,
      title: banner.title || '',
      link: banner.link || '',
      position: banner.position,
      is_active: banner.is_active,
    });
    setImagePreview(banner.image ? `${process.env.NEXT_PUBLIC_API_URL}/storage/${banner.image}` : null);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    try {
      await bannerService.delete(id);
      setSuccess('Banner deleted successfully');
      loadBanners();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete banner');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await bannerService.toggle(id);
      loadBanners();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to toggle banner');
    }
  };

  const resetForm = () => {
    setFormData({
      image: null,
      title: '',
      link: '',
      position: 'top',
      is_active: true,
    });
    setImagePreview(null);
    setEditingBanner(null);
    setShowForm(false);
  };

  if (loading || loadingBanners) {
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
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Banners</h1>
                    <p className="text-gray-600 mt-1">Manage your store banners</p>
                  </div>
                  <Button onClick={() => setShowForm(true)}>
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Banner
                  </Button>
                </div>

                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                {success && (
                  <div className="mb-4">
                    <Alert type="success" message={success} onClose={() => setSuccess('')} />
                  </div>
                )}

                {showForm && (
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                      {editingBanner ? 'Edit Banner' : 'Create Banner'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Banner Image {!editingBanner && '*'}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          required={!editingBanner}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0066CC] file:text-white hover:file:bg-[#0052a3]"
                        />
                        {imagePreview && (
                          <div className="mt-4">
                            <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded" />
                          </div>
                        )}
                      </div>

                      <Input
                        label="Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Banner title (optional)"
                      />

                      <Input
                        label="Link URL"
                        value={formData.link}
                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        placeholder="https://example.com (optional)"
                        type="url"
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Position *
                        </label>
                        <select
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                          required
                        >
                          <option value="top">Top</option>
                          <option value="middle">Middle</option>
                          <option value="bottom">Bottom</option>
                          <option value="sidebar">Sidebar</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="mr-2"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                          Active
                        </label>
                      </div>

                      <div className="flex gap-4">
                        <Button type="submit" className="flex-1">
                          {editingBanner ? 'Update Banner' : 'Create Banner'}
                        </Button>
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {banners.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No banners</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new banner.</p>
                    <div className="mt-6">
                      <Button onClick={() => setShowForm(true)}>Add Banner</Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.map((banner) => (
                      <div key={banner.id} className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="relative h-48 bg-gray-100">
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL}/storage/${banner.image}`}
                            alt={banner.title || 'Banner'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {banner.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-1">{banner.title || 'Untitled Banner'}</h3>
                          <p className="text-sm text-gray-600 mb-2">Position: {banner.position}</p>
                          {banner.link && (
                            <p className="text-xs text-blue-600 truncate mb-4">{banner.link}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleEdit(banner)}
                              className="flex-1 text-sm"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleToggle(banner.id)}
                              className="flex-1 text-sm"
                            >
                              {banner.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleDelete(banner.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

