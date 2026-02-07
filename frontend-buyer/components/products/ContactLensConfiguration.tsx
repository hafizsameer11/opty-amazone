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
        sphere: string;
        cylinder?: string;
        axis?: number;
        quantity: number;
      };
      left_eye?: {
        base_curve: string;
        diameter: string;
        sphere: string;
        cylinder?: string;
        axis?: number;
        quantity: number;
      };
    };
  }) => Promise<void>;
  addingToCart?: boolean;
}

interface EyeConfiguration {
  base_curve: string;
  diameter: string;
  sphere: string;
  cylinder: string;
  axis: string;
  quantity: number;
}

export default function ContactLensConfiguration({
  product,
  onAddToCart,
  addingToCart = false,
}: ContactLensConfigurationProps) {
  const [rightEye, setRightEye] = useState<EyeConfiguration>({
    base_curve: product.base_curve_options?.[0] || '',
    diameter: product.diameter_options?.[0] || '',
    sphere: '',
    cylinder: '',
    axis: '',
    quantity: 1,
  });

  const [leftEye, setLeftEye] = useState<EyeConfiguration>({
    base_curve: product.base_curve_options?.[0] || '',
    diameter: product.diameter_options?.[0] || '',
    sphere: '',
    cylinder: '',
    axis: '',
    quantity: 1,
  });

  const [useSameForBoth, setUseSameForBoth] = useState(false);

  const handleRightEyeChange = (field: keyof EyeConfiguration, value: string | number) => {
    const updated = { ...rightEye, [field]: value };
    setRightEye(updated);
    if (useSameForBoth) {
      setLeftEye(updated);
    }
  };

  const handleLeftEyeChange = (field: keyof EyeConfiguration, value: string | number) => {
    setLeftEye({ ...leftEye, [field]: value });
  };

  const handleAddToCart = async () => {
    // Validate required fields
    if (!rightEye.base_curve || !rightEye.diameter || !rightEye.sphere) {
      alert('Please fill in all required fields for right eye (Base Curve, Diameter, and Sphere).');
      return;
    }

    if (!useSameForBoth && (!leftEye.base_curve || !leftEye.diameter || !leftEye.sphere)) {
      alert('Please fill in all required fields for left eye (Base Curve, Diameter, and Sphere).');
      return;
    }

    const config: any = {
      product_id: product.id,
      quantity: useSameForBoth ? rightEye.quantity : rightEye.quantity + leftEye.quantity,
      configuration: {
        right_eye: {
          base_curve: rightEye.base_curve,
          diameter: rightEye.diameter,
          sphere: rightEye.sphere,
          quantity: rightEye.quantity,
        },
      },
    };

    if (rightEye.cylinder) {
      config.configuration.right_eye.cylinder = rightEye.cylinder;
    }
    if (rightEye.axis) {
      config.configuration.right_eye.axis = parseInt(rightEye.axis);
    }

    if (!useSameForBoth) {
      config.configuration.left_eye = {
        base_curve: leftEye.base_curve,
        diameter: leftEye.diameter,
        sphere: leftEye.sphere,
        quantity: leftEye.quantity,
      };
      if (leftEye.cylinder) {
        config.configuration.left_eye.cylinder = leftEye.cylinder;
      }
      if (leftEye.axis) {
        config.configuration.left_eye.axis = parseInt(leftEye.axis);
      }
    } else {
      config.configuration.left_eye = config.configuration.right_eye;
    }

    await onAddToCart(config);
  };

  const canAddToCart = rightEye.base_curve && rightEye.diameter && rightEye.sphere &&
    (useSameForBoth || (leftEye.base_curve && leftEye.diameter && leftEye.sphere));

  return (
    <div className="space-y-6">
      {/* Contact Lens Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Contact Lens Information</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {product.contact_lens_brand && (
            <div>
              <span className="text-gray-600">Brand:</span>
              <span className="ml-2 font-medium">{product.contact_lens_brand}</span>
            </div>
          )}
          {product.contact_lens_type && (
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2 font-medium capitalize">{product.contact_lens_type}</span>
            </div>
          )}
          {product.contact_lens_material && (
            <div>
              <span className="text-gray-600">Material:</span>
              <span className="ml-2 font-medium">{product.contact_lens_material}</span>
            </div>
          )}
          {product.replacement_frequency && (
            <div>
              <span className="text-gray-600">Replacement:</span>
              <span className="ml-2 font-medium capitalize">{product.replacement_frequency}</span>
            </div>
          )}
          {product.has_uv_filter && (
            <div>
              <span className="text-gray-600">UV Protection:</span>
              <span className="ml-2 font-medium text-green-600">Yes</span>
            </div>
          )}
          {product.water_content && (
            <div>
              <span className="text-gray-600">Water Content:</span>
              <span className="ml-2 font-medium">{product.water_content}%</span>
            </div>
          )}
        </div>
        {product.is_medical_device && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            ⚠️ Medical Device - Please consult with your eye care professional before use.
          </div>
        )}
      </div>

      {/* Same for Both Eyes Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="same-for-both"
          checked={useSameForBoth}
          onChange={(e) => setUseSameForBoth(e.target.checked)}
          className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
        />
        <label htmlFor="same-for-both" className="text-sm font-medium text-gray-700">
          Use same prescription for both eyes
        </label>
      </div>

      {/* Right Eye Configuration */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Right Eye (OD)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Base Curve */}
          {product.base_curve_options && product.base_curve_options.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Curve (BC) <span className="text-red-500">*</span>
              </label>
              <select
                value={rightEye.base_curve}
                onChange={(e) => handleRightEyeChange('base_curve', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
              >
                <option value="">Select Base Curve</option>
                {product.base_curve_options.map((bc) => (
                  <option key={bc} value={bc}>
                    {bc}mm
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Diameter */}
          {product.diameter_options && product.diameter_options.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diameter (DIA) <span className="text-red-500">*</span>
              </label>
              <select
                value={rightEye.diameter}
                onChange={(e) => handleRightEyeChange('diameter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
              >
                <option value="">Select Diameter</option>
                {product.diameter_options.map((dia) => (
                  <option key={dia} value={dia}>
                    {dia}mm
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sphere */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sphere (SPH) <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., -2.50"
              value={rightEye.sphere}
              onChange={(e) => handleRightEyeChange('sphere', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Cylinder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cylinder (CYL) <span className="text-gray-400">(Optional)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., -0.75"
              value={rightEye.cylinder}
              onChange={(e) => handleRightEyeChange('cylinder', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Axis */}
          {rightEye.cylinder && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Axis <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                type="number"
                placeholder="0-180"
                min="0"
                max="180"
                value={rightEye.axis}
                onChange={(e) => handleRightEyeChange('axis', e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleRightEyeChange('quantity', Math.max(1, rightEye.quantity - 1))}
                className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
              >
                −
              </button>
              <span className="text-lg font-semibold w-12 text-center">
                {rightEye.quantity}
              </span>
              <button
                type="button"
                onClick={() => handleRightEyeChange('quantity', rightEye.quantity + 1)}
                className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Left Eye Configuration */}
      {!useSameForBoth && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Left Eye (OS)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Base Curve */}
            {product.base_curve_options && product.base_curve_options.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Curve (BC) <span className="text-red-500">*</span>
                </label>
                <select
                  value={leftEye.base_curve}
                  onChange={(e) => handleLeftEyeChange('base_curve', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
                >
                  <option value="">Select Base Curve</option>
                  {product.base_curve_options.map((bc) => (
                    <option key={bc} value={bc}>
                      {bc}mm
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Diameter */}
            {product.diameter_options && product.diameter_options.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diameter (DIA) <span className="text-red-500">*</span>
                </label>
                <select
                  value={leftEye.diameter}
                  onChange={(e) => handleLeftEyeChange('diameter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
                >
                  <option value="">Select Diameter</option>
                  {product.diameter_options.map((dia) => (
                    <option key={dia} value={dia}>
                      {dia}mm
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sphere */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sphere (SPH) <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., -2.50"
                value={leftEye.sphere}
                onChange={(e) => handleLeftEyeChange('sphere', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Cylinder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cylinder (CYL) <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., -0.75"
                value={leftEye.cylinder}
                onChange={(e) => handleLeftEyeChange('cylinder', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Axis */}
            {leftEye.cylinder && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Axis <span className="text-gray-400">(Optional)</span>
                </label>
                <Input
                  type="number"
                  placeholder="0-180"
                  min="0"
                  max="180"
                  value={leftEye.axis}
                  onChange={(e) => handleLeftEyeChange('axis', e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLeftEyeChange('quantity', Math.max(1, leftEye.quantity - 1))}
                  className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
                >
                  −
                </button>
                <span className="text-lg font-semibold w-12 text-center">
                  {leftEye.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleLeftEyeChange('quantity', leftEye.quantity + 1)}
                  className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Cart Button */}
      <Button
        onClick={handleAddToCart}
        disabled={!canAddToCart || addingToCart || product.stock_status !== 'in_stock'}
        className="w-full"
        size="lg"
      >
        {addingToCart ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Adding to Cart...
          </span>
        ) : product.stock_status !== 'in_stock' ? (
          'Out of Stock'
        ) : (
          'Add to Cart'
        )}
      </Button>
    </div>
  );
}
