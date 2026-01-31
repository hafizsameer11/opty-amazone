'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { StoreService } from '@/services/store-service';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default function StoreSettingsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneVisibility, setPhoneVisibility] = useState<'public' | 'request' | 'hidden'>('request');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const response = await StoreService.getPhoneVisibility();
      setPhoneVisibility(response.data.phone_visibility);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await StoreService.updatePhoneVisibility(phoneVisibility);
      setSuccess('Settings updated successfully');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingSettings) {
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
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Settings</h1>
                  <p className="text-gray-600">Configure your store preferences and privacy settings</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
                  {error && <Alert type="error" message={error} className="mb-6" />}
                  {success && <Alert type="success" message={success} className="mb-6" />}

                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Privacy & Visibility Settings</h2>
                    <p className="text-sm text-gray-600">Control how your contact information is displayed to customers</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Phone Visibility
                      </label>
                      <div className="space-y-3">
                        <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          phoneVisibility === 'public' 
                            ? 'border-[#0066CC] bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            value="public"
                            checked={phoneVisibility === 'public'}
                            onChange={(e) => setPhoneVisibility(e.target.value as any)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">Public</div>
                            <div className="text-sm text-gray-600">Anyone can see your phone number</div>
                          </div>
                        </label>

                        <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          phoneVisibility === 'request' 
                            ? 'border-[#0066CC] bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            value="request"
                            checked={phoneVisibility === 'request'}
                            onChange={(e) => setPhoneVisibility(e.target.value as any)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">Request Required</div>
                            <div className="text-sm text-gray-600">Buyers must request to see your phone number</div>
                          </div>
                        </label>

                        <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          phoneVisibility === 'hidden' 
                            ? 'border-[#0066CC] bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            value="hidden"
                            checked={phoneVisibility === 'hidden'}
                            onChange={(e) => setPhoneVisibility(e.target.value as any)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">Hidden</div>
                            <div className="text-sm text-gray-600">Phone number is not visible to anyone</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                      <Button 
                        type="submit" 
                        disabled={saving}
                        className="bg-[#0066CC] hover:bg-[#0052a3] text-white font-semibold px-6"
                      >
                        {saving ? 'Saving...' : 'Save Settings'}
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
      <BottomNav />
    </div>
  );
}
