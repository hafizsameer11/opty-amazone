'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { walletService } from '@/services/wallet-service';
import { useToast } from '@/components/ui/Toast';
// Layout components are now handled by app/template.tsx
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';

export default function WithdrawPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/profile/withdraw');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadBalance();
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

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    if (balance !== null && withdrawAmount > balance) {
      showToast('error', 'Insufficient balance');
      return;
    }

    if (withdrawAmount < 10) {
      showToast('error', 'Minimum withdrawal amount is €10.00');
      return;
    }

    if (!accountNumber || !accountName || !bankName) {
      showToast('error', 'Please fill in all bank details');
      return;
    }

    setProcessing(true);
    try {
      await walletService.withdraw({
        amount: withdrawAmount,
        account_number: accountNumber,
        account_name: accountName,
        bank_name: bankName,
      });
      showToast('success', `Withdrawal request of €${withdrawAmount.toFixed(2)} submitted successfully`);
      await loadBalance();
      setAmount('');
      setAccountNumber('');
      setAccountName('');
      setBankName('');
      // Optionally redirect after successful withdrawal
      setTimeout(() => {
        router.push('/profile?tab=wallet');
      }, 1500);
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Withdrawal failed. Please try again.');
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

  const maxWithdraw = balance !== null ? balance : 0;
  const canWithdraw = maxWithdraw >= 10;

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Withdraw Funds</h1>
          <p className="text-gray-600">Transfer funds from your wallet to your bank account</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              {/* Current Balance */}
              {balance !== null && (
                <div className={`rounded-xl p-5 mb-6 border ${
                  canWithdraw 
                    ? 'bg-gradient-to-r from-[#0066CC]/10 to-[#00CC66]/5 border-[#0066CC]/20' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                  <p className={`text-3xl font-bold ${canWithdraw ? 'text-[#0066CC]' : 'text-gray-400'}`}>
                    €{Number(balance || 0).toFixed(2)}
                  </p>
                  {!canWithdraw && (
                    <p className="text-xs text-red-600 mt-2">Minimum withdrawal: €10.00</p>
                  )}
                </div>
              )}

              <form onSubmit={handleWithdraw} className="space-y-6">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Withdrawal Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-semibold">
                      €
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="10"
                      max={maxWithdraw}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-10 text-lg font-semibold"
                      required
                      disabled={!canWithdraw}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">Minimum: €10.00</p>
                    {maxWithdraw > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(maxWithdraw.toFixed(2))}
                        className="text-xs text-[#0066CC] hover:text-[#0052a3] font-semibold"
                        disabled={!canWithdraw}
                      >
                        Withdraw All
                      </button>
                    )}
                  </div>
                </div>

                {/* Bank Details */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Bank Account Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Bank Name
                      </label>
                      <Input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g., Bank of Ireland"
                        required
                        disabled={!canWithdraw}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Account Name
                      </label>
                      <Input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Account holder name"
                        required
                        disabled={!canWithdraw}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Account Number
                      </label>
                      <Input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Account number"
                        required
                        disabled={!canWithdraw}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={processing || !amount || parseFloat(amount) < 10 || !canWithdraw || !accountNumber || !accountName || !bankName}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </span>
                  ) : (
                    `Withdraw €${amount ? parseFloat(amount).toFixed(2) : '0.00'}`
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Withdrawal Info</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Processing Time</p>
                    <p className="text-xs text-gray-600 mt-1">1-3 business days</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Secure Transfer</p>
                    <p className="text-xs text-gray-600 mt-1">Bank-level encryption</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Minimum Amount</p>
                    <p className="text-xs text-gray-600 mt-1">€10.00 per withdrawal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

