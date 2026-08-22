'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import UnifiedProductForm from '@/components/products/UnifiedProductForm';

export default function SunGlassesProductPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto" />
          <p className="mt-4 text-gray-600 text-sm">Loading...</p>
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
            <div className="py-5">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="text-[#0066CC] hover:underline text-sm mb-2"
                  >
                    ← Back to Products
                  </button>
                  <h1 className="text-xl font-bold text-gray-900">Create sunglasses</h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Frame photos, lens options, lens tint colors — same fields as the sunglasses edit page.
                  </p>
                </div>
                <UnifiedProductForm
                  eyewearOnly={{ productType: 'sunglasses', defaultCategorySlug: 'sun-glasses' }}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
