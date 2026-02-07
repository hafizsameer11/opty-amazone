'use client';

import { useState } from 'react';
import { couponService, type CouponValidation } from '@/services/coupon-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface CouponInputProps {
  orderTotal: number;
  onCouponApplied: (validation: CouponValidation) => void;
  onCouponRemoved: () => void;
  appliedCoupon?: CouponValidation;
}

export default function CouponInput({
  orderTotal,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const { showToast } = useToast();

  const handleApply = async () => {
    if (!code.trim()) {
      showToast('warning', 'Please enter a coupon code');
      return;
    }

    setValidating(true);
    try {
      const validation = await couponService.validate(code.trim(), orderTotal);
      if (validation.valid) {
        onCouponApplied(validation);
        setCode('');
        showToast('success', validation.message);
      } else {
        showToast('error', validation.message);
      }
    } catch (error) {
      showToast('error', 'Failed to validate coupon');
    } finally {
      setValidating(false);
    }
  };

  const handleRemove = () => {
    setCode('');
    onCouponRemoved();
    showToast('success', 'Coupon removed');
  };

  if (appliedCoupon?.valid) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-800">
                Coupon Applied: {appliedCoupon.coupon?.code}
              </span>
              <span className="text-sm text-green-600">
                -€{appliedCoupon.discount_amount?.toFixed(2)}
              </span>
            </div>
            {appliedCoupon.coupon?.discount_type === 'percentage' && (
              <p className="text-xs text-green-600 mt-1">
                {appliedCoupon.coupon.discount_value}% discount
              </p>
            )}
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

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Have a coupon code?
      </label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="flex-1"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApply();
            }
          }}
        />
        <Button
          type="button"
          onClick={handleApply}
          disabled={validating || !code.trim()}
          size="sm"
        >
          {validating ? 'Validating...' : 'Apply'}
        </Button>
      </div>
    </div>
  );
}
