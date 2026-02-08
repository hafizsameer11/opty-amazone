'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { productService, type Category } from '@/services/product-service';
import Button from '@/components/ui/Button';

const categoryRoutes: Record<string, string> = {
  'eye-glasses': '/products/new/eye-glasses',
  'sun-glasses': '/products/new/sun-glasses',
  'contact-lenses': '/products/new/contact-lenses',
  'eye-hygiene': '/products/new/eye-hygiene',
  'accessori': '/products/new/accessori',
};

const categoryIcons: Record<string, string> = {
  'eye-glasses': '👓',
  'sun-glasses': '🕶️',
  'contact-lenses': '🔍',
  'eye-hygiene': '💧',
  'accessori': '🎁',
};

export default function NewProductPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
    }
  }, [isAuthenticated]);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      // Filter to only main categories (parent_id is null) that have routes
      const mainCategories = data.filter(cat => 
        !cat.parent_id && categoryRoutes[cat.slug]
      );
      setCategories(mainCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  if (loading || loadingCategories) {
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
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                  <button
                    onClick={() => router.back()}
                    className="text-[#0066CC] hover:underline mb-4"
                  >
                    ← Back to Products
                  </button>
                  <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
                  <p className="text-gray-600 mt-2">Select a category to create a product</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => {
                    const route = categoryRoutes[category.slug];
                    const icon = categoryIcons[category.slug] || '📦';
                    
                    return (
                      <Link key={category.id} href={route}>
                        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-[#0066CC]">
                          <div className="text-center">
                            <div className="text-5xl mb-4">{icon}</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2 capitalize">
                              {category.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                              Create a new {category.name.toLowerCase()} product
                            </p>
                            <Button variant="outline" className="w-full">
                              Create Product
                            </Button>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {categories.length === 0 && (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-500">No categories available. Please contact support.</p>
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

