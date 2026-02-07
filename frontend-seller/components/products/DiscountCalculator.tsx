'use client';

import { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';

interface DiscountCalculatorProps {
  price: number;
  compareAtPrice?: number;
  onCompareAtPriceChange: (value: number | undefined) => void;
}

export default function DiscountCalculator({
  price,
  compareAtPrice,
  onCompareAtPriceChange,
}: DiscountCalculatorProps) {
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('');

  // Calculate discount percentage from compare_at_price
  useEffect(() => {
    if (compareAtPrice && price > 0 && compareAtPrice > price) {
      const percent = ((compareAtPrice - price) / compareAtPrice) * 100;
      setDiscountPercent(percent.toFixed(1));
      setDiscountAmount((compareAtPrice - price).toFixed(2));
    } else {
      setDiscountPercent('');
      setDiscountAmount('');
    }
  }, [compareAtPrice, price]);

  const handleDiscountPercentChange = (value: string) => {
    setDiscountPercent(value);
    if (value && price > 0) {
      const percent = parseFloat(value);
      if (!isNaN(percent) && percent > 0 && percent < 100) {
        const calculatedPrice = price / (1 - percent / 100);
        onCompareAtPriceChange(calculatedPrice);
        setDiscountAmount((calculatedPrice - price).toFixed(2));
      } else if (percent === 0 || value === '') {
        onCompareAtPriceChange(undefined);
        setDiscountAmount('');
      }
    }
  };

  const handleDiscountAmountChange = (value: string) => {
    setDiscountAmount(value);
    if (value && price > 0) {
      const amount = parseFloat(value);
      if (!isNaN(amount) && amount > 0) {
        const calculatedPrice = price + amount;
        onCompareAtPriceChange(calculatedPrice);
        const percent = (amount / calculatedPrice) * 100;
        setDiscountPercent(percent.toFixed(1));
      } else if (amount === 0 || value === '') {
        onCompareAtPriceChange(undefined);
        setDiscountPercent('');
      }
    }
  };

  const discountPercentage = compareAtPrice && price > 0 && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Discount Calculator</h3>
        {discountPercentage > 0 && (
          <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
            {discountPercentage}% OFF
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Discount Percentage
          </label>
          <div className="relative">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="99.9"
              value={discountPercent}
              onChange={(e) => handleDiscountPercentChange(e.target.value)}
              placeholder="0"
              className="w-full pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Discount Amount
          </label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={discountAmount}
              onChange={(e) => handleDiscountAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
          </div>
        </div>
      </div>

      {compareAtPrice && price > 0 && compareAtPrice > price && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Original Price:</span>
            <span className="text-gray-400 line-through">€{compareAtPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Sale Price:</span>
            <span className="text-[#0066CC] font-bold">€{price.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">You Save:</span>
            <span className="text-green-600 font-semibold">€{(compareAtPrice - price).toFixed(2)}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onCompareAtPriceChange(undefined);
          setDiscountPercent('');
          setDiscountAmount('');
        }}
        className="mt-3 text-xs text-red-600 hover:text-red-800 font-medium"
      >
        Clear Discount
      </button>
    </div>
  );
}
