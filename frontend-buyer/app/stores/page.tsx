'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import { StoreService, type PublicStore } from '@/services/store-service';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

function StoreCard({ store }: { store: PublicStore }) {
  return (
    <Link
      href={`/stores/${store.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group"
    >
      {/* Banner Image */}
      <div className="relative w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200">
        {store.banner_image ? (
          <Image
            src={store.banner_image}
            alt={store.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
        {/* Profile Image Overlay */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
            {store.profile_image ? (
              <Image
                src={store.profile_image}
                alt={store.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0066CC] to-[#0052a3] text-white font-bold text-2xl">
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Store Info */}
      <div className="pt-12 pb-4 px-4 text-center">
        <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-[#0066CC] transition-colors">
          {store.name}
        </h3>
        {store.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {store.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 font-medium">Products</span>
            <span className="text-sm font-bold text-gray-900">{store.products_count || 0}</span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 font-medium">Followers</span>
            <span className="text-sm font-bold text-gray-900">{store.followers_count || 0}</span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 font-medium">Rating</span>
            <span className="text-sm font-bold text-gray-900">
              {store.rating ? Number(store.rating).toFixed(1) : 'N/A'}
            </span>
          </div>
        </div>

        <Button variant="primary" size="sm" className="w-full">
          Visit Store
        </Button>
      </div>
    </Link>
  );
}

export default function StoresPage() {
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadStores();
  }, [currentPage, search]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const data = await StoreService.getAllStores({
        search: search || undefined,
        per_page: 12,
        page: currentPage,
      });
      setStores(data.stores || []);
      setTotalPages(data.pagination?.last_page || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadStores();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">All Stores</h1>
          <p className="text-gray-600">Discover amazing optical stores and sellers</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              type="text"
              placeholder="Search stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="primary">
              Search
            </Button>
          </form>
        </div>

        {/* Stores Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : stores.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {stores.length} of {total} stores
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600 px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-gray-600 mb-4">No stores found matching your search.</p>
            <Button onClick={() => { setSearch(''); setCurrentPage(1); }} variant="primary">
              Clear Search
            </Button>
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}




