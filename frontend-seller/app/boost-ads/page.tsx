'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Input from '@/components/ui/Input';
import { productService, type Product } from '@/services/product-service';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';

function BoostAdsPaymentForm({ products }: { products: Product[] }) {
  const stripe = useStripe();
  const elements = useElements();
  const [productId, setProductId] = useState('');
  const [budget, setBudget] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!productId) {
      setError('Please select a product to boost.');
      return;
    }

    if (!budget || Number(budget) <= 0) {
      setError('Please enter a valid ad budget.');
      return;
    }

    if (!stripe || !elements) {
      setError('Stripe is not ready. Please refresh and try again.');
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Card input is not ready yet.');
      return;
    }

    try {
      setProcessing(true);
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card,
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment method creation failed.');
        return;
      }

      setSuccess(
        `Payment method created (${paymentMethod.id}). Frontend Boost Ads checkout is ready. Backend ad placement integration is pending.`
      );
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to process payment form.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Boost Ad</h2>
      <p className="text-sm text-gray-600 mb-6">
        This uses Stripe on frontend only. Charge capture and ad activation should be wired on backend next.
      </p>

      {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}
      {success && <div className="mb-4"><Alert type="success" message={success} onClose={() => setSuccess('')} /></div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
            required
          >
            <option value="">Select product to boost</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - €{Number(product.price || 0).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Ad Budget (€)"
          type="number"
          min="1"
          step="0.01"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          required
        />

        <Input
          label="Duration (Days)"
          type="number"
          min="1"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Card details</label>
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#111827',
                    '::placeholder': { color: '#9CA3AF' },
                  },
                  invalid: { color: '#DC2626' },
                },
              }}
            />
          </div>
        </div>

        <Button type="submit" disabled={processing || !stripe || !elements} className="w-full">
          {processing ? 'Processing Stripe...' : 'Pay & Create Boost Ad'}
        </Button>
      </form>
    </div>
  );
}

export default function BoostAdsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

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
      setProducts(response?.data || []);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
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
                  <p className="text-gray-600 mt-1">Promote products with paid ads placement.</p>
                </div>

                {!publishableKey && (
                  <div className="mb-4">
                    <Alert
                      type="warning"
                      message="Stripe publishable key is missing. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local."
                    />
                  </div>
                )}
                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                {stripePromise ? (
                  <Elements stripe={stripePromise}>
                    <BoostAdsPaymentForm products={products} />
                  </Elements>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm text-gray-700">
                      Stripe frontend is configured in code, but publishable key is required to render payment fields.
                    </p>
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
