'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { productService, type Product } from '@/services/product-service';

export default function BoostAdsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [location, setLocation] = useState('global');
  const [budget, setBudget] = useState('10');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [payMethod, setPayMethod] = useState<'wallet' | 'checkout_stub'>('wallet');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadProducts();
    }
  }, [isAuthenticated]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await productService.getAll({ per_page: 100 });
      const rows = response?.data || [];
      setProducts(rows);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const boostedProducts = products.filter((p) => p.is_boosted);
  const pendingProducts = products.filter((p) => p.boost_payment_status === 'pending_payment' && !p.is_boosted);
  const availableProducts = products.filter((p) => !p.is_boosted && p.boost_payment_status !== 'pending_payment');

  const handleBoost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const id = Number(selectedProductId);
    if (!id) {
      setError('Please select a product to boost.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await productService.boostWithPlan(id, {
        location,
        budget: Number(budget || 0),
        start_at: startAt || undefined,
        end_at: endAt || undefined,
        pay_method: payMethod,
      });
      if (result.product.boost_payment_status === 'pending_payment' && !result.product.is_boosted) {
        setSuccess(
          result.message ||
            'Insufficient wallet balance. Boost is pending — use “Pay now (stub)” to complete payment.'
        );
      } else {
        setSuccess(result.message || 'Product boosted successfully (wallet charged).');
      }
      setSelectedProductId('');
      await loadProducts();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || submitError?.message || 'Failed to boost product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletePayment = async (id: number) => {
    try {
      setError('');
      setSuccess('');
      await productService.completeBoostPayment(id);
      setSuccess('Boost payment completed via checkout stub. Product is now boosted.');
      await loadProducts();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || submitError?.message || 'Failed to complete payment.');
    }
  };

  const handleRemoveBoost = async (id: number) => {
    try {
      setError('');
      setSuccess('');
      await productService.toggleBoost(id);
      setSuccess('Boost removed successfully.');
      await loadProducts();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || submitError?.message || 'Failed to remove boost.');
    }
  };

  if (loading || loadingProducts) {
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
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Boost Ads</h1>
                  <p className="text-gray-600 mt-1">
                    Pay from your seller wallet (ad credit / shopping balance), or complete a checkout stub if balance is low.
                  </p>
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

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Boost Product</h2>
                  <p className="text-sm text-gray-600 mb-5">
                    Boosted products are prioritized automatically on buyer home and category pages.
                  </p>
                  <form onSubmit={handleBoost} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-lg"
                        required
                      >
                        <option value="">Select product to boost</option>
                        {availableProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - EUR {Number(product.price || 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-lg"
                      >
                        <option value="global">Global</option>
                        <option value="local">Local</option>
                        <option value="city">City</option>
                        <option value="region">Region</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="Budget (EUR)"
                        className="px-4 py-3 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as 'wallet' | 'checkout_stub')}
                        className="px-4 py-3 border border-gray-300 rounded-lg"
                      >
                        <option value="wallet">Pay from wallet</option>
                        <option value="checkout_stub">Checkout stub (pending → pay)</option>
                      </select>
                      <input
                        type="datetime-local"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="datetime-local"
                        value={endAt}
                        onChange={(e) => setEndAt(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-lg"
                      />
                      <Button type="submit" disabled={isSubmitting || availableProducts.length === 0} className="md:col-span-2">
                        {isSubmitting ? 'Processing…' : 'Boost Now'}
                      </Button>
                    </div>
                  </form>
                </div>

                {pendingProducts.length > 0 && (
                  <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending payment</h2>
                    <div className="space-y-3">
                      {pendingProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-3 border border-amber-200 bg-white rounded-lg px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">
                              Budget: EUR {Number(product.boost_budget || 0).toFixed(2)} · status: pending_payment
                            </p>
                          </div>
                          <Button onClick={() => handleCompletePayment(product.id)}>Pay now (stub)</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Currently Boosted (VIP)</h2>
                    <span className="text-sm text-gray-500">{boostedProducts.length} product(s)</span>
                  </div>

                  {boostedProducts.length === 0 ? (
                    <p className="text-sm text-gray-600">No boosted products yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {boostedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-600">EUR {Number(product.price || 0).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">
                              {product.boost_location || 'global'} • Budget: EUR {Number(product.boost_budget || 0).toFixed(2)}
                              {product.boost_payment_status ? ` • ${product.boost_payment_status}` : ''}
                            </p>
                          </div>
                          <Button variant="outline" onClick={() => handleRemoveBoost(product.id)}>
                            Remove Boost
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
