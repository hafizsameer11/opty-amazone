'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { productService, type Product } from '@/services/product-service';
import { getFullImageUrl, isLocalhostImage } from '@/lib/image-utils';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

type SearchStore = {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  profile_image_url?: string;
  profile_image?: string;
};

function SearchPageInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<SearchStore[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setProducts([]);
      setStores([]);
      setError(trimmed ? 'Enter at least 2 characters' : null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await productService.search(trimmed);
      setProducts(Array.isArray(data?.products) ? data.products : []);
      setStores(Array.isArray(data?.stores) ? data.stores : []);
    } catch (e) {
      console.error(e);
      setError('Search failed. Please try again.');
      setProducts([]);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQ(initialQ);
    if (initialQ.trim().length >= 2) {
      void runSearch(initialQ);
    }
  }, [initialQ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Search</h1>
      <form
        className="flex flex-col sm:flex-row gap-3 mb-8"
        onSubmit={(e) => {
          e.preventDefault();
          const next = q.trim();
          window.history.replaceState(null, '', `/search?q=${encodeURIComponent(next)}`);
          void runSearch(next);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products and stores..."
          className="flex-1"
        />
        <Button type="submit" variant="primary">
          Search
        </Button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-gray-500 mb-4">Searching…</p>}

      {!loading && initialQ && products.length === 0 && stores.length === 0 && !error && (
        <p className="text-gray-600 mb-6">No results for “{initialQ}”.</p>
      )}

      {products.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Products ({products.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => {
              const img = getFullImageUrl(p.images?.[0] || '/file.svg');
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative h-36 bg-gray-50 flex items-center justify-center">
                    <Image
                      src={img}
                      alt={p.name}
                      width={160}
                      height={120}
                      className="object-contain max-h-[80%]"
                      unoptimized={isLocalhostImage(img)}
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{p.name}</p>
                    <p className="text-[#0066CC] font-bold mt-1">€{Number(p.price || 0).toFixed(2)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {stores.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stores ({stores.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((s) => {
              const img = getFullImageUrl(s.profile_image_url || s.profile_image || '/file.svg');
              return (
                <Link
                  key={s.id}
                  href={`/stores/${s.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex gap-3 hover:shadow-md transition-shadow"
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image src={img} alt={s.name} fill className="object-cover" unoptimized={isLocalhostImage(img)} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    {s.description && <p className="text-sm text-gray-500 line-clamp-2">{s.description}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">Loading search…</div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
