'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { walletService } from '@/services/wallet-service';
import { useToast } from '@/components/ui/Toast';
// Layout components are now handled by app/template.tsx
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';

function TopUpForm() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'loading' | 'development' | 'stripe' | 'unavailable'>('loading');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/profile/top-up');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadBalance();
      walletService.capabilities().then(c => setMode(c.development_top_up ? 'development' : c.stripe_available ? 'stripe' : 'unavailable')).catch(() => setMode('unavailable'));
      const session = new URLSearchParams(window.location.search).get('session_id');
      if (session) {
        setProcessing(true);
        walletService.topUp({ stripe_session_id: session }).then(() => {
          showToast('success', 'Stripe payment verified and wallet credited.');
          window.history.replaceState(null, '', '/profile/top-up');
          void loadBalance();
        }).catch(error => showToast('error', error.response?.data?.message || 'Payment verification failed.'))
          .finally(() => setProcessing(false));
      }
    }
  }, [isAuthenticated]);

  const loadBalance = async () => {
    try {
      const data = await walletService.getBalance();
      setBalance(data.balance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const quickAmounts = [10, 25, 50, 100, 200, 500];

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const topUpAmount = parseFloat(amount);
    if (!topUpAmount || topUpAmount <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    if (topUpAmount < 5) {
      showToast('error', 'Minimum top-up amount is €5.00');
      return;
    }

    setProcessing(true);
    try {
      if (mode === 'development') {
        const slot = 'opty-development-topup:' + topUpAmount.toFixed(2);
        const key = sessionStorage.getItem(slot) || crypto.randomUUID();
        sessionStorage.setItem(slot, key);
        await walletService.developmentTopUp(topUpAmount, key);
        sessionStorage.removeItem(slot);
        await loadBalance(); setAmount('');
        showToast('success', 'Development top-up added to your wallet.');
        return;
      }
      if (mode !== 'stripe') throw new Error('Wallet top-up is not available in this environment.');
      const origin = window.location.origin;
      const response = await apiClient.post('/buyer/wallet/create-checkout-session', {
        amount: Math.round(topUpAmount * 100), currency: 'eur',
        success_url: origin + '/profile/top-up?session_id={CHECKOUT_SESSION_ID}', cancel_url: origin + '/profile/top-up',
      });
      window.location.assign(response.data.data.url);
    } catch (error: any) {
      showToast('error', error.response?.data?.message || error.message || 'Failed to top up wallet. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <Loader fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-[#0066CC] hover:text-[#0052a3] transition-colors mb-4 group"
          >
            <svg
              className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Top Up Wallet</h1>
          <p className="text-gray-600">Add funds to your wallet for faster checkout</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              {/* Current Balance */}
              {balance !== null && (
                <div className="bg-gradient-to-r from-[#0066CC]/10 to-[#00CC66]/5 rounded-xl p-5 mb-6 border border-[#0066CC]/20">
                  <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                  <p className="text-3xl font-bold text-[#0066CC]">
                    €{Number(balance || 0).toFixed(2)}
                  </p>
                </div>
              )}

              <form onSubmit={handleTopUp} className="space-y-6">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Amount to Top Up
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-semibold">
                      €
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="5"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-10 text-lg font-semibold"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Minimum amount: €5.00</p>
                </div>

                {/* Quick Amount Buttons */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Quick Amounts</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {quickAmounts.map((quickAmount) => (
                      <button
                        key={quickAmount}
                        type="button"
                        onClick={() => setAmount(quickAmount.toString())}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-[#0066CC] hover:bg-[#0066CC]/5 transition-all font-semibold text-gray-700 hover:text-[#0066CC]"
                      >
                        €{quickAmount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Secure wallet payment</p>
                      <p className="text-xs text-blue-700">{mode === 'development' ? 'Development testing mode: funds are credited directly. No card is charged.' : mode === 'stripe' ? 'Continue to Stripe. Funds are credited after the server verifies your completed payment.' : mode === 'loading' ? 'Checking available payment methods…' : 'Wallet top-up is not available in this environment.'}</p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={processing || ['loading', 'unavailable'].includes(mode) || !amount || parseFloat(amount) < 5}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </span>
                  ) : (
                    `Top Up €${amount ? parseFloat(amount).toFixed(2) : '0.00'}`
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Why Top Up?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0066CC]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Faster Checkout</p>
                    <p className="text-xs text-gray-600 mt-1">Skip payment forms every time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#00CC66]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#00CC66]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Secure Storage</p>
                    <p className="text-xs text-gray-600 mt-1">Your funds are safe with us</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#f97316]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#f97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Easy Management</p>
                    <p className="text-xs text-gray-600 mt-1">Track all transactions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

export default function TopUpPage() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading..." />}>
      <TopUpForm />
    </Suspense>
  );
}

