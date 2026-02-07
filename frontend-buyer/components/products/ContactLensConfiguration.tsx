'use client';

import { useState } from 'react';
import { Product } from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ContactLensConfigurationProps {
  product: Product;
  onAddToCart: (config: {
    product_id: number;
    variant_id?: number;
    quantity: number;
    configuration?: {
      right_eye?: {
        base_curve: string;
        diameter: string;
        power: string;
        quantity: number;
      };
      left_eye?: {
        base_curve: string;
        diameter: string;
        power: string;
        quantity: number;
      };
    };
  }) => Promise<void>;
  addingToCart?: boolean;
}

interface EyeConfiguration {
  base_curve: string;
  diameter: string;
  power: string;
  quantity: number;
  enabled: boolean;
}

export default function ContactLensConfiguration({
  product,
  onAddToCart,
  addingToCart = false,
}: ContactLensConfigurationProps) {
  const [selectedPackSize, setSelectedPackSize] = useState<string>('unit');
  
  const [rightEye, setRightEye] = useState<EyeConfiguration>({
    base_curve: '',
    diameter: '',
    power: '',
    quantity: 1,
    enabled: true,
  });

  const [leftEye, setLeftEye] = useState<EyeConfiguration>({
    base_curve: '',
    diameter: '',
    power: '',
    quantity: 1,
    enabled: true,
  });

  // Generate power options from powers_range or create default range
  const generatePowerOptions = () => {
    if (product.powers_range && typeof product.powers_range === 'string') {
      // Parse powers_range string if it's a range like "-10.00 to +10.00"
      const range = product.powers_range.split(' to ');
      if (range.length === 2) {
        const min = parseFloat(range[0]);
        const max = parseFloat(range[1]);
        const step = 0.25;
        const options: string[] = [];
        for (let i = min; i <= max; i += step) {
          const value = i.toFixed(2);
          options.push(value.startsWith('-') ? value : `+${value}`);
        }
        return options;
      }
    }
    // Default power range
    const options: string[] = [];
    for (let i = -10.0; i <= 10.0; i += 0.25) {
      const value = i.toFixed(2);
      options.push(value.startsWith('-') ? value : `+${value}`);
    }
    return options;
  };

  const powerOptions = generatePowerOptions();

  const handleRightEyeChange = (field: keyof EyeConfiguration, value: string | number | boolean) => {
    setRightEye({ ...rightEye, [field]: value });
  };

  const handleLeftEyeChange = (field: keyof EyeConfiguration, value: string | number | boolean) => {
    setLeftEye({ ...leftEye, [field]: value });
  };

  const handleCopyRightToLeft = () => {
    setLeftEye({
      ...rightEye,
      quantity: leftEye.quantity, // Keep left eye quantity
    });
  };

  const handleAddToCart = async () => {
    // Validate required fields
    if (rightEye.enabled && (!rightEye.base_curve || !rightEye.diameter || !rightEye.power)) {
      alert('Please fill in all required fields for right eye (Base Curve, Diameter, and Power).');
      return;
    }

    if (leftEye.enabled && (!leftEye.base_curve || !leftEye.diameter || !leftEye.power)) {
      alert('Please fill in all required fields for left eye (Base Curve, Diameter, and Power).');
      return;
    }

    if (!rightEye.enabled && !leftEye.enabled) {
      alert('Please enable at least one eye.');
      return;
    }

    const config: any = {
      product_id: product.id,
      quantity: (rightEye.enabled ? rightEye.quantity : 0) + (leftEye.enabled ? leftEye.quantity : 0),
      configuration: {},
    };

    if (rightEye.enabled) {
      config.configuration.right_eye = {
        base_curve: rightEye.base_curve,
        diameter: rightEye.diameter,
        power: rightEye.power,
        quantity: rightEye.quantity,
      };
    }

    if (leftEye.enabled) {
      config.configuration.left_eye = {
        base_curve: leftEye.base_curve,
        diameter: leftEye.diameter,
        power: leftEye.power,
        quantity: leftEye.quantity,
      };
    }

    await onAddToCart(config);
  };

  const canAddToCart = 
    (!rightEye.enabled || (rightEye.base_curve && rightEye.diameter && rightEye.power)) &&
    (!leftEye.enabled || (leftEye.base_curve && leftEye.diameter && leftEye.power)) &&
    (rightEye.enabled || leftEye.enabled) &&
    product.stock_status === 'in_stock';

  // Pack size options - using product variants or default
  const packSizes = product.variants && product.variants.length > 0
    ? product.variants.map((v, index) => ({
        id: v.id,
        name: `Unit ${v.id}`,
        price: v.price || product.price,
      }))
    : [{ id: 1, name: 'Unit', price: product.price }];

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Select the parameters</h2>
        <p className="text-lg text-gray-700">{product.name}</p>
      </div>

      {/* Pack Size Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Select Pack Size (Units)
        </label>
        <div className="flex flex-wrap gap-3">
          {packSizes.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => setSelectedPackSize(pack.id.toString())}
              className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                selectedPackSize === pack.id.toString()
                  ? 'border-[#0066CC] bg-[#0066CC]/5 shadow-md'
                  : 'border-gray-300 hover:border-gray-400 bg-white'
              }`}
            >
              <span className="text-sm font-semibold text-gray-900">{pack.name}</span>
              <span className="text-xs text-gray-600">€{Number(pack.price).toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Eyes Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Right Eye (OD) */}
        <div className="border-2 border-blue-200 rounded-xl p-5 bg-blue-50/30">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="right-eye-enabled"
              checked={rightEye.enabled}
              onChange={(e) => handleRightEyeChange('enabled', e.target.checked)}
              className="w-5 h-5 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
            />
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              R
            </div>
            <h3 className="text-lg font-bold text-gray-900">Right Eye OD</h3>
          </div>

          <div className="space-y-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity (Qty)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRightEyeChange('quantity', Math.max(1, rightEye.quantity - 1))}
                  disabled={!rightEye.enabled}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-gray-700"
                >
                  −
                </button>
                <Input
                  type="number"
                  value={rightEye.quantity}
                  onChange={(e) => handleRightEyeChange('quantity', parseInt(e.target.value) || 1)}
                  disabled={!rightEye.enabled}
                  className="w-20 text-center"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => handleRightEyeChange('quantity', rightEye.quantity + 1)}
                  disabled={!rightEye.enabled}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-gray-700"
                >
                  +
                </button>
              </div>
            </div>

            {/* Base Curve */}
            {product.base_curve_options && product.base_curve_options.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Curve (B.C)
                </label>
                <select
                  value={rightEye.base_curve}
                  onChange={(e) => handleRightEyeChange('base_curve', e.target.value)}
                  disabled={!rightEye.enabled}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  <option value="">--</option>
                  {product.base_curve_options.map((bc) => (
                    <option key={bc} value={bc}>
                      {bc}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Diameter */}
            {product.diameter_options && product.diameter_options.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diameter (DIA)
                </label>
                <select
                  value={rightEye.diameter}
                  onChange={(e) => handleRightEyeChange('diameter', e.target.value)}
                  disabled={!rightEye.enabled}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  <option value="">--</option>
                  {product.diameter_options.map((dia) => (
                    <option key={dia} value={dia}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Power */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Power (PWR) <span className="text-red-500">*</span>
              </label>
              <select
                value={rightEye.power}
                onChange={(e) => handleRightEyeChange('power', e.target.value)}
                disabled={!rightEye.enabled}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                <option value="">00.00 (Power)</option>
                {powerOptions.map((power) => (
                  <option key={power} value={power}>
                    {power}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Left Eye (OS) */}
        <div className="border-2 border-purple-200 rounded-xl p-5 bg-purple-50/30">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="left-eye-enabled"
              checked={leftEye.enabled}
              onChange={(e) => handleLeftEyeChange('enabled', e.target.checked)}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-600"
            />
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
              L
            </div>
            <h3 className="text-lg font-bold text-gray-900">Left Eye OS</h3>
          </div>

          <div className="space-y-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity (Qty)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLeftEyeChange('quantity', Math.max(1, leftEye.quantity - 1))}
                  disabled={!leftEye.enabled}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-gray-700"
                >
                  −
                </button>
                <Input
                  type="number"
                  value={leftEye.quantity}
                  onChange={(e) => handleLeftEyeChange('quantity', parseInt(e.target.value) || 1)}
                  disabled={!leftEye.enabled}
                  className="w-20 text-center"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => handleLeftEyeChange('quantity', leftEye.quantity + 1)}
                  disabled={!leftEye.enabled}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-gray-700"
                >
                  +
                </button>
              </div>
            </div>

            {/* Base Curve */}
            {product.base_curve_options && product.base_curve_options.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Curve (B.C)
                </label>
                <select
                  value={leftEye.base_curve}
                  onChange={(e) => handleLeftEyeChange('base_curve', e.target.value)}
                  disabled={!leftEye.enabled}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  <option value="">--</option>
                  {product.base_curve_options.map((bc) => (
                    <option key={bc} value={bc}>
                      {bc}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Diameter */}
            {product.diameter_options && product.diameter_options.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diameter (DIA)
                </label>
                <select
                  value={leftEye.diameter}
                  onChange={(e) => handleLeftEyeChange('diameter', e.target.value)}
                  disabled={!leftEye.enabled}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  <option value="">--</option>
                  {product.diameter_options.map((dia) => (
                    <option key={dia} value={dia}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Power */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Power (PWR) <span className="text-red-500">*</span>
              </label>
              <select
                value={leftEye.power}
                onChange={(e) => handleLeftEyeChange('power', e.target.value)}
                disabled={!leftEye.enabled}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                <option value="">00.00 (Power)</option>
                {powerOptions.map((power) => (
                  <option key={power} value={power}>
                    {power}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Right to Left Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCopyRightToLeft}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Copy Right to Left
        </button>
      </div>

      {/* Add to Cart Button */}
      <Button
        onClick={handleAddToCart}
        disabled={!canAddToCart || addingToCart}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 text-lg"
        size="lg"
      >
        {addingToCart ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Adding to Cart...
          </span>
        ) : product.stock_status !== 'in_stock' ? (
          'Out of Stock'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add to Cart
          </span>
        )}
      </Button>
    </div>
  );
}
