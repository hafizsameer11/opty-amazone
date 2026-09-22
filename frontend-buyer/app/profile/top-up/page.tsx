'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAxiosErrorMessage } from '@/lib/api-client';
import { walletService } from '@/services/wallet-service';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

function TopUpForm() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const loadBalance = async () => {
    try {
      const data = await walletService.getBalance();
      setBalance(data.balance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  useLiveRefresh(loadBalance, isAuthenticated, 15000);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/profile/top-up');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) void loadBalance();
  }, [isAuthenticated]);

  const quickAmounts = [10, 25, 50, 100, 200, 500];

  const handleTopUp = async (event: React.FormEvent) => {
    event.preventDefault();
    const topUpAmount = Number.parseFloat(amount);

    if (!Number.isFinite(topUpAmount) || topUpAmount <= 0) {
      showToast('error', 'Please enter a valid amount.');
      return;
    }
    if (topUpAmount < 5) {
      showToast('error', 'Minimum top-up amount is €5.00.');
      return;
    }

    setProcessing(true);
    const slot = `opty-buyer-topup:${topUpAmount.toFixed(2)}`;
    const key = sessionStorage.getItem(slot) || crypto.randomUUID();
    sessionStorage.setItem(slot, key);

    try {
      await walletService.directTopUp(topUpAmount, key);
      sessionStorage.removeItem(slot);
      await loadBalance();
      setAmount('');
      showToast('success', 'Wallet topped up successfully.');
    } catch (error: unknown) {
      showToast('error', getAxiosErrorMessage(error) || 'Failed to top up wallet. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loader fullScreen text="Loading..." />;
  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6">
        <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-2 font-medium text-[#0066CC]">
          <span aria-hidden="true">←</span> Back
        </button>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Top Up Wallet</h1>
        <p className="text-gray-600">Add funds to your wallet for faster checkout.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
            {balance !== null && (
              <div className="mb-6 rounded-xl border border-[#0066CC]/20 bg-[#0066CC]/10 p-5">
                <p className="mb-1 text-sm text-gray-600">Current Balance</p>
                <p className="text-3xl font-bold text-[#0066CC]">€{balance.toFixed(2)}</p>
              </div>
            )}

            <form onSubmit={handleTopUp} className="space-y-6">
              <div>
                <label htmlFor="top-up-amount" className="mb-2 block text-sm font-semibold text-gray-900">Amount to Top Up</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-500">€</span>
                  <Input id="top-up-amount" type="number" step="0.01" min="5" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className="pl-10 text-lg font-semibold" required />
                </div>
                <p className="mt-2 text-xs text-gray-500">Minimum amount: €5.00</p>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-gray-700">Quick Amounts</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {quickAmounts.map(value => (
                    <button key={value} type="button" onClick={() => setAmount(value.toString())} className="rounded-lg border-2 border-gray-200 px-4 py-2 font-semibold text-gray-700 transition hover:border-[#0066CC] hover:bg-[#0066CC]/5 hover:text-[#0066CC]">€{value}</button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="mb-1 text-sm font-semibold text-blue-900">Wallet top-up</p>
                <p className="text-xs text-blue-700">Funds are added directly to your wallet and your transaction history is updated immediately.</p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={processing || !amount || Number.parseFloat(amount) < 5}>
                {processing ? 'Processing...' : `Top Up €${amount ? Number.parseFloat(amount).toFixed(2) : '0.00'}`}
              </Button>
            </form>
          </div>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md lg:col-span-1 lg:self-start lg:sticky lg:top-4">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Why Top Up?</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <p><strong className="text-gray-900">Faster checkout.</strong> Skip payment forms every time.</p>
            <p><strong className="text-gray-900">Secure storage.</strong> Keep funds ready for your purchases.</p>
            <p><strong className="text-gray-900">Easy management.</strong> Track your wallet transactions.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function TopUpPage() {
  return <Suspense fallback={<Loader fullScreen text="Loading..." />}><TopUpForm /></Suspense>;
}
