'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
// Layout components are now handled by app/template.tsx
import { pointsService, type PointsBalance, type PointTransaction } from '@/services/points-service';
import { useToast } from '@/components/ui/Toast';
import Loader from '@/components/ui/Loader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function PointsPage() {
  const { isAuthenticated, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/points');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [balanceData, transactionsData] = await Promise.all([
        pointsService.getBalance(),
        pointsService.getTransactions(50),
      ]);
      setBalance(balanceData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load points data:', error);
      showToast('error', 'Failed to load points data');
    } finally {
      setLoadingData(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      earn: 'Earned',
      redeem: 'Redeemed',
      expire: 'Expired',
      adjustment: 'Adjusted',
      referral: 'Referral Bonus',
      review: 'Review Bonus',
      signup: 'Sign-up Bonus',
      birthday: 'Birthday Bonus',
      social_share: 'Social Share',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    if (type === 'earn' || type === 'referral' || type === 'review' || type === 'signup' || type === 'birthday' || type === 'social_share') {
      return 'success';
    } else if (type === 'redeem') {
      return 'warning';
    } else {
      return 'default';
    }
  };

  if (loading || loadingData) {
    return <Loader fullScreen text="Loading points..." />;
  }

  if (!isAuthenticated || !balance) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Points</h1>

        {/* Points Balance Card */}
        <div className="bg-gradient-to-r from-[#0066CC] to-[#0052a3] rounded-xl shadow-lg p-8 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium opacity-90 mb-2">Available Points</h2>
              <div className="text-5xl font-bold">{balance.available.toFixed(0)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90 mb-1">Total Balance</div>
              <div className="text-2xl font-semibold">{balance.balance.toFixed(0)}</div>
              {balance.expired > 0 && (
                <div className="text-xs opacity-75 mt-2">
                  {balance.expired.toFixed(0)} expired
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm opacity-90">
              100 points = €1.00 discount
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Earn Points</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Make purchases</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Write product reviews</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Refer friends</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Share products on social media</span>
              </li>
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Redeem Points</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use your points at checkout to get discounts on your orders.
            </p>
            <Button
              onClick={() => router.push('/cart')}
              className="w-full"
            >
              Go to Cart
            </Button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No transactions yet</p>
                <p className="text-sm mt-2">Start earning points by making purchases!</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={getTransactionTypeColor(transaction.type) as any} size="sm">
                          {getTransactionTypeLabel(transaction.type)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {transaction.description && (
                        <p className="text-sm text-gray-600">{transaction.description}</p>
                      )}
                      {transaction.expires_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Expires: {new Date(transaction.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Balance: {transaction.balance_after.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
    </div>
  );
}
