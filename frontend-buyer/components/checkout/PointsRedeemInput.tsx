'use client';

import { useState, useEffect } from 'react';
import { pointsService, type PointsBalance } from '@/services/points-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface PointsRedeemInputProps {
  orderTotal: number;
  onPointsRedeemed: (discountAmount: number, pointsUsed: number) => void;
  onPointsRemoved: () => void;
  appliedPoints?: number;
}

export default function PointsRedeemInput({
  orderTotal,
  onPointsRedeemed,
  onPointsRemoved,
  appliedPoints,
}: PointsRedeemInputProps) {
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      setLoadingBalance(true);
      const data = await pointsService.getBalance();
      setBalance(data);
    } catch (error) {
      console.error('Failed to load points balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleRedeem = async () => {
    if (!pointsToRedeem || parseFloat(pointsToRedeem) <= 0) {
      showToast('warning', 'Please enter a valid amount of points');
      return;
    }

    const points = parseFloat(pointsToRedeem);
    
    if (!balance || points > balance.available) {
      showToast('error', 'Insufficient points balance');
      return;
    }

    setLoading(true);
    try {
      const result = await pointsService.redeem(points);
      onPointsRedeemed(result.discount_amount, result.points_used);
      setPointsToRedeem('');
      showToast('success', `Redeemed ${result.points_used} points for €${result.discount_amount.toFixed(2)} discount`);
      loadBalance(); // Refresh balance
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to redeem points');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setPointsToRedeem('');
    onPointsRemoved();
    showToast('success', 'Points redemption removed');
  };

  if (loadingBalance) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!balance || balance.available <= 0) {
    return null;
  }

  if (appliedPoints) {
    const discountAmount = appliedPoints / 100; // Assuming 100 points = €1
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-800">
                Points Redeemed: {appliedPoints}
              </span>
              <span className="text-sm text-green-600">
                -€{discountAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Remaining balance: {balance.available - appliedPoints} points
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  const maxRedeemable = Math.min(balance.available, orderTotal * 100); // 100 points = €1
  const maxDiscount = maxRedeemable / 100;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Redeem Points (Available: {balance.available.toFixed(0)})
      </label>
      <div className="flex gap-2">
        <Input
          type="number"
          value={pointsToRedeem}
          onChange={(e) => {
            const value = e.target.value;
            const numValue = parseFloat(value);
            if (value === '' || (numValue >= 0 && numValue <= maxRedeemable)) {
              setPointsToRedeem(value);
            }
          }}
          placeholder={`Max: ${maxRedeemable.toFixed(0)} (€${maxDiscount.toFixed(2)})`}
          className="flex-1"
          min="0"
          max={maxRedeemable}
        />
        <Button
          type="button"
          onClick={handleRedeem}
          disabled={loading || !pointsToRedeem || parseFloat(pointsToRedeem) <= 0}
          size="sm"
        >
          {loading ? 'Redeeming...' : 'Redeem'}
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        100 points = €1.00 discount
      </p>
    </div>
  );
}
