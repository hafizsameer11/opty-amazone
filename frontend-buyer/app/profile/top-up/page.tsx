'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/contexts/AuthContext';
import { walletService } from '@/services/wallet-service';
import { useToast } from '@/components/ui/Toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 
  'pk_test_51SFZTeFZetT6fppMXO3CMbwUEfzCdEKbn9wlyDFnqMUGZWVQzsenp6jzWM3NAedklviHaCIl1P30Nc1n47aa6rwM00RYn3J6d4'
);

export default function TopUpPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
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
      
      // Check if redirected from Stripe success
      const sessionId = searchParams.get('session_id');
      const success = searchParams.get('success');
      const canceled = searchParams.get('canceled');
      
      if (canceled === 'true') {
        showToast('info', 'Payment was canceled');
        localStorage.removeItem('topup_amount');
        router.replace('/profile/top-up');
      } else if (success === 'true' && sessionId) {
        handleStripeSuccess(sessionId);
      }
    }
  }, [isAuthenticated, searchParams]);

  const loadBalance = async () => {
    try {
      const data = await walletService.getBalance();
      setBalance(data.balance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const quickAmounts = [10, 25, 50, 100, 200, 500];

  const handleStripeSuccess = async (sessionId: string) => {
    try {
      setProcessing(true);
      const storedAmount = localStorage.getItem('topup_amount');
      const topUpAmount = storedAmount ? parseFloat(storedAmount) : parseFloat(amount);
      
      if (!topUpAmount || topUpAmount <= 0) {
        showToast('error', 'Unable to retrieve top-up amount');
        router.replace('/profile/top-up');
        return;
      }
      
      await walletService.topUp({
        amount: topUpAmount,
        stripe_session_id: sessionId,
      });
      
      showToast('success', `Successfully topped up €${topUpAmount.toFixed(2)}`);
      await loadBalance();
      setAmount('');
      localStorage.removeItem('topup_amount');
      
      // Clean URL
      router.replace('/profile/top-up');
      
      // Redirect after delay
      setTimeout(() => {
        router.push('/profile?tab=wallet');
      }, 2000);
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to process top-up');
      router.replace('/profile/top-up');
    } finally {
      setProcessing(false);
    }
  };

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
      // Store amount for after Stripe redirect
      localStorage.setItem('topup_amount', topUpAmount.toString());
      
      // Initialize Stripe
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Please login to continue');
      }

      // Create Stripe Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: topUpAmount * 100, // Convert to cents
          currency: 'eur',
          success_url: `${window.location.origin}/profile/top-up?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/profile/top-up?canceled=true`,
        }),
      });

      const session = await response.json();
      
      if (session.error) {
        throw new Error(session.error);
      }

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error: any) {
      console.error('Stripe error:', error);
      showToast('error', error.message || 'Failed to initiate payment. Please try again.');
      setProcessing(false);
      localStorage.removeItem('topup_amount');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
        <Header />
        <Loader fullScreen text="Loading..." />
        <Footer />
        <BottomNav />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
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
                      <p className="text-sm font-semibold text-blue-900 mb-1">Secure Payment</p>
                      <p className="text-xs text-blue-700">You will be redirected to Stripe Checkout for secure payment processing.</p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={processing || !amount || parseFloat(amount) < 5}
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
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

