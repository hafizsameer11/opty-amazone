'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/services/product-service';
import { getPrescriptionOptions, type PrescriptionOptions } from '@/services/prescription-options-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ContactLensConfigurationProps {
  product: Product;
  onAddToCart: (config: {
    product_id: number;
    variant_id?: number;
    quantity: number;
    contact_lens_right_base_curve?: number;
    contact_lens_right_diameter?: number;
    contact_lens_right_power?: number;
    contact_lens_right_qty?: number;
    contact_lens_right_cylinder?: number;
    contact_lens_right_axis?: number;
    contact_lens_left_base_curve?: number;
    contact_lens_left_diameter?: number;
    contact_lens_left_power?: number;
    contact_lens_left_qty?: number;
    contact_lens_left_cylinder?: number;
    contact_lens_left_axis?: number;
  }) => Promise<void>;
  addingToCart?: boolean;
}

interface EyeConfiguration {
  base_curve: string;
  diameter: string;
  sph: string; // SPH (Power)
  cyl: string; // CYL (Cylinder) - for astigmatism
  axis: string; // AXIS - for astigmatism
  quantity: number;
  enabled: boolean;
}


// TABO to International conversion: INT = 180 - TABO
const taboToInt = (taboValue: number): number => {
  if (isNaN(taboValue)) return 0;
  const normalized = taboValue % 180;
  return 180 - normalized;
};

// International to TABO conversion: TABO = 180 - INT
const intToTabo = (intValue: number): number => {
  if (isNaN(intValue)) return 0;
  const normalized = intValue % 180;
  return 180 - normalized;
};

export default function ContactLensConfiguration({
  product,
  onAddToCart,
  addingToCart = false,
}: ContactLensConfigurationProps) {
  const [selectedPackSize, setSelectedPackSize] = useState<string>('unit');
  
  // Check if this is an astigmatism contact lens
  const isAstigmatism = product.name?.toLowerCase().includes('astigmatism') || 
                        product.category?.name?.toLowerCase().includes('astigmatism') ||
                        product.category?.slug?.toLowerCase().includes('astigmatism');
  
  const [rightEye, setRightEye] = useState<EyeConfiguration>({
    base_curve: '',
    diameter: '',
    sph: '--',
    cyl: '--',
    axis: '--',
    quantity: 1,
    enabled: true,
  });

  const [leftEye, setLeftEye] = useState<EyeConfiguration>({
    base_curve: '',
    diameter: '',
    sph: '--',
    cyl: '--',
    axis: '--',
    quantity: 1,
    enabled: true,
  });

  const [showAxisGuide, setShowAxisGuide] = useState(false);
  const [rightAxisAngle, setRightAxisAngle] = useState(0);
  const [leftAxisAngle, setLeftAxisAngle] = useState(0);
  const [prescriptionOptions, setPrescriptionOptions] = useState<PrescriptionOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Fetch prescription options on mount
  useEffect(() => {
    const loadPrescriptionOptions = async () => {
      try {
        setLoadingOptions(true);
        const options = await getPrescriptionOptions(product.id);
        setPrescriptionOptions(options);
      } catch (error) {
        console.error('Failed to load prescription options:', error);
        setPrescriptionOptions(null);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    loadPrescriptionOptions();
  }, [product.id]);

  // Use API options if available, otherwise empty arrays
  const rightSphOptions = prescriptionOptions?.sph?.right || prescriptionOptions?.sph?.both || [];
  const leftSphOptions = prescriptionOptions?.sph?.left || prescriptionOptions?.sph?.both || [];
  const rightCylOptions = prescriptionOptions?.cyl?.right || prescriptionOptions?.cyl?.both || [];
  const leftCylOptions = prescriptionOptions?.cyl?.left || prescriptionOptions?.cyl?.both || [];
  const rightAxisOptions = prescriptionOptions?.axis?.right || prescriptionOptions?.axis?.both || [];
  const leftAxisOptions = prescriptionOptions?.axis?.left || prescriptionOptions?.axis?.both || [];

  const handleRightEyeChange = (field: keyof EyeConfiguration, value: string | number | boolean) => {
    const updated = { ...rightEye, [field]: value };
    setRightEye(updated);
    
    // Update axis angle when axis changes
    if (field === 'axis' && typeof value === 'string' && value !== '--') {
      setRightAxisAngle(parseInt(value) || 0);
    }
  };

  const handleLeftEyeChange = (field: keyof EyeConfiguration, value: string | number | boolean) => {
    const updated = { ...leftEye, [field]: value };
    setLeftEye(updated);
    
    // Update axis angle when axis changes
    if (field === 'axis' && typeof value === 'string' && value !== '--') {
      setLeftAxisAngle(parseInt(value) || 0);
    }
  };

  const handleCopyRightToLeft = () => {
    setLeftEye({
      ...rightEye,
      quantity: leftEye.quantity, // Keep left eye quantity
    });
    setLeftAxisAngle(rightAxisAngle);
  };

  const handleAddToCart = async () => {
    // Validate required fields - only check if product has those options
    const hasBaseCurveOptions = product.base_curve_options && product.base_curve_options.length > 0;
    const hasDiameterOptions = product.diameter_options && product.diameter_options.length > 0;
    
    if (rightEye.enabled) {
      if (hasBaseCurveOptions && !rightEye.base_curve) {
        alert('Please fill in Base Curve for right eye.');
        return;
      }
      if (hasDiameterOptions && !rightEye.diameter) {
        alert('Please fill in Diameter for right eye.');
        return;
      }
    }

    if (leftEye.enabled) {
      if (hasBaseCurveOptions && !leftEye.base_curve) {
        alert('Please fill in Base Curve for left eye.');
        return;
      }
      if (hasDiameterOptions && !leftEye.diameter) {
        alert('Please fill in Diameter for left eye.');
        return;
      }
    }

    if (!rightEye.enabled && !leftEye.enabled) {
      alert('Please enable at least one eye.');
      return;
    }

    // For astigmatism, validate CYL and AXIS
    if (isAstigmatism) {
      // For astigmatism, if CYL is provided, both CYL and AXIS are required
      if (rightEye.enabled && rightEye.cyl !== '--') {
        if (rightEye.axis === '--') {
          alert('Please enter AXIS for right eye when CYL is specified.');
          return;
        }
      }
      if (leftEye.enabled && leftEye.cyl !== '--') {
        if (leftEye.axis === '--') {
          alert('Please enter AXIS for left eye when CYL is specified.');
          return;
        }
      }
    } else {
      // For non-astigmatism (spherical), SPH is required
      if (rightEye.enabled && rightEye.sph === '--') {
        alert('Please fill in SPH (Power) for right eye.');
        return;
      }
      if (leftEye.enabled && leftEye.sph === '--') {
        alert('Please fill in SPH (Power) for left eye.');
        return;
      }
    }

    const config: any = {
      product_id: product.id,
      quantity: (rightEye.enabled ? rightEye.quantity : 0) + (leftEye.enabled ? leftEye.quantity : 0),
    };

    if (rightEye.enabled) {
      // Only include base_curve and diameter if they are provided
      if (rightEye.base_curve && rightEye.base_curve !== '') {
        config.contact_lens_right_base_curve = parseFloat(rightEye.base_curve);
      }
      if (rightEye.diameter && rightEye.diameter !== '') {
        config.contact_lens_right_diameter = parseFloat(rightEye.diameter);
      }
      // For astigmatism, if SPH is '--' but CYL is provided, default to 0.00
      const rightSph = rightEye.sph === '--' && isAstigmatism && rightEye.cyl !== '--' ? '0.00' : rightEye.sph;
      if (rightSph !== '--') {
        config.contact_lens_right_power = parseFloat(rightSph);
      }
      config.contact_lens_right_qty = rightEye.quantity;
      if (isAstigmatism && rightEye.cyl !== '--') {
        config.contact_lens_right_cylinder = parseFloat(rightEye.cyl);
      }
      if (isAstigmatism && rightEye.axis !== '--') {
        config.contact_lens_right_axis = parseInt(rightEye.axis);
      }
    }

    if (leftEye.enabled) {
      // Only include base_curve and diameter if they are provided
      if (leftEye.base_curve && leftEye.base_curve !== '') {
        config.contact_lens_left_base_curve = parseFloat(leftEye.base_curve);
      }
      if (leftEye.diameter && leftEye.diameter !== '') {
        config.contact_lens_left_diameter = parseFloat(leftEye.diameter);
      }
      // For astigmatism, if SPH is '--' but CYL is provided, default to 0.00
      const leftSph = leftEye.sph === '--' && isAstigmatism && leftEye.cyl !== '--' ? '0.00' : leftEye.sph;
      if (leftSph !== '--') {
        config.contact_lens_left_power = parseFloat(leftSph);
      }
      config.contact_lens_left_qty = leftEye.quantity;
      if (isAstigmatism && leftEye.cyl !== '--') {
        config.contact_lens_left_cylinder = parseFloat(leftEye.cyl);
      }
      if (isAstigmatism && leftEye.axis !== '--') {
        config.contact_lens_left_axis = parseInt(leftEye.axis);
      }
    }

    await onAddToCart(config);
  };

  // Validation for canAddToCart button
  const canAddToCart = (() => {
    // Check if at least one eye is enabled
    if (!rightEye.enabled && !leftEye.enabled) return false;
    
    // Check stock status
    if (product.stock_status !== 'in_stock') return false;
    
    // Check required fields for enabled eyes
    const hasBaseCurveOptions = product.base_curve_options && product.base_curve_options.length > 0;
    const hasDiameterOptions = product.diameter_options && product.diameter_options.length > 0;
    
    if (rightEye.enabled) {
      // Base Curve and Diameter are only required if the product has those options
      if (hasBaseCurveOptions && (!rightEye.base_curve || rightEye.base_curve === '')) return false;
      if (hasDiameterOptions && (!rightEye.diameter || rightEye.diameter === '')) return false;
      
      // For astigmatism: if CYL is provided, AXIS must be provided (SPH can be defaulted to 0.00)
      // OR if SPH is provided, that's also valid
      if (isAstigmatism) {
        if (rightEye.cyl !== '--' && rightEye.axis === '--') return false;
        // If CYL is not provided, SPH must be provided
        if (rightEye.cyl === '--' && rightEye.sph === '--') return false;
      } else {
        // For non-astigmatism, SPH is required
        if (rightEye.sph === '--') return false;
      }
    }
    
    if (leftEye.enabled) {
      // Base Curve and Diameter are only required if the product has those options
      if (hasBaseCurveOptions && (!leftEye.base_curve || leftEye.base_curve === '')) return false;
      if (hasDiameterOptions && (!leftEye.diameter || leftEye.diameter === '')) return false;
      
      // For astigmatism: if CYL is provided, AXIS must be provided (SPH can be defaulted to 0.00)
      // OR if SPH is provided, that's also valid
      if (isAstigmatism) {
        if (leftEye.cyl !== '--' && leftEye.axis === '--') return false;
        // If CYL is not provided, SPH must be provided
        if (leftEye.cyl === '--' && leftEye.sph === '--') return false;
      } else {
        // For non-astigmatism, SPH is required
        if (leftEye.sph === '--') return false;
      }
    }
    
    return true;
  })();

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
        <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-white border-2 border-blue-200 rounded-xl p-5 shadow-md">
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

            {/* SPH, CYL, AXIS Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* SPH */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">SPH</label>
                <select
                  value={rightEye.sph}
                  onChange={(e) => handleRightEyeChange('sph', e.target.value)}
                  disabled={!rightEye.enabled}
                  className={`w-full px-2 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none pr-8 bg-white ${
                    rightEye.sph !== "--"
                      ? "border-blue-500 bg-blue-100 font-bold text-blue-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="--">--</option>
                  {rightSphOptions.length > 0 ? (
                    rightSphOptions.map((sph) => (
                      <option key={sph} value={sph}>
                        {sph}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No options configured</option>
                  )}
                </select>
              </div>

              {/* CYL - Only for astigmatism */}
              {isAstigmatism && (
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">CYL</label>
                  <select
                    value={rightEye.cyl}
                    onChange={(e) => handleRightEyeChange('cyl', e.target.value)}
                    disabled={!rightEye.enabled}
                    className={`w-full px-2 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none pr-8 bg-white ${
                      rightEye.cyl !== "--"
                        ? "border-blue-500 bg-blue-100 font-bold text-blue-900"
                        : "border-gray-200 hover:border-gray-300 text-gray-900"
                    }`}
                  >
                    {rightCylOptions.length > 0 ? (
                      rightCylOptions.map((cyl) => (
                        <option key={cyl} value={cyl}>
                          {cyl}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No options configured</option>
                    )}
                  </select>
                </div>
              )}

              {/* AXIS - Only for astigmatism */}
              {isAstigmatism && (
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">AXIS</label>
                  <select
                    value={rightEye.axis}
                    onChange={(e) => {
                      const newAxis = e.target.value;
                      handleRightEyeChange('axis', newAxis);
                      if (newAxis !== "--") {
                        setRightAxisAngle(parseInt(newAxis) || 0);
                      }
                    }}
                    disabled={!rightEye.enabled}
                    className={`w-full px-2 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none pr-8 bg-white ${
                      rightEye.axis !== "--"
                        ? "border-blue-500 bg-blue-100 font-bold text-blue-900"
                        : "border-gray-200 hover:border-gray-300 text-gray-900"
                    }`}
                  >
                    {rightAxisOptions.length > 0 ? (
                      rightAxisOptions.map((axis) => (
                        <option key={axis} value={axis}>
                          {axis}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No options configured</option>
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Left Eye (OS) */}
        <div className="bg-gradient-to-br from-purple-50 via-purple-50/50 to-white border-2 border-purple-200 rounded-xl p-5 shadow-md">
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

            {/* SPH, CYL, AXIS Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* SPH */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">SPH</label>
                <select
                  value={leftEye.sph}
                  onChange={(e) => handleLeftEyeChange('sph', e.target.value)}
                  disabled={!leftEye.enabled}
                  className={`w-full px-2 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all appearance-none pr-8 bg-white ${
                    leftEye.sph !== "--"
                      ? "border-purple-500 bg-purple-100 font-bold text-purple-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="--">--</option>
                  {leftSphOptions.length > 0 ? (
                    leftSphOptions.map((sph) => (
                      <option key={sph} value={sph}>
                        {sph}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No options configured</option>
                  )}
                </select>
              </div>

              {/* CYL - Only for astigmatism */}
              {isAstigmatism && (
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">CYL</label>
                  <select
                    value={leftEye.cyl}
                    onChange={(e) => handleLeftEyeChange('cyl', e.target.value)}
                    disabled={!leftEye.enabled}
                    className={`w-full px-2 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all appearance-none pr-8 bg-white ${
                      leftEye.cyl !== "--"
                        ? "border-purple-500 bg-purple-100 font-bold text-purple-900"
                        : "border-gray-200 hover:border-gray-300 text-gray-900"
                    }`}
                  >
                    {leftCylOptions.length > 0 ? (
                      leftCylOptions.map((cyl) => (
                        <option key={cyl} value={cyl}>
                          {cyl}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No options configured</option>
                    )}
                  </select>
                </div>
              )}

              {/* AXIS - Only for astigmatism */}
              {isAstigmatism && (
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">AXIS</label>
                  <select
                    value={leftEye.axis}
                    onChange={(e) => {
                      const newAxis = e.target.value;
                      handleLeftEyeChange('axis', newAxis);
                      if (newAxis !== "--") {
                        setLeftAxisAngle(parseInt(newAxis) || 0);
                      }
                    }}
                    disabled={!leftEye.enabled}
                    className={`w-full px-2 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all appearance-none pr-8 bg-white ${
                      leftEye.axis !== "--"
                        ? "border-purple-500 bg-purple-100 font-bold text-purple-900"
                        : "border-gray-200 hover:border-gray-300 text-gray-900"
                    }`}
                  >
                    {leftAxisOptions.length > 0 ? (
                      leftAxisOptions.map((axis) => (
                        <option key={axis} value={axis}>
                          {axis}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No options configured</option>
                    )}
                  </select>
                </div>
              )}
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

      {/* Show Axis Diagram Button - Only for astigmatism */}
      {isAstigmatism && (
        <div className="mb-6 mt-6">
          <button
            type="button"
            onClick={() => setShowAxisGuide(!showAxisGuide)}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>{showAxisGuide ? 'Hide Axis Diagram' : 'Show Axis Diagram'}</span>
          </button>
        </div>
      )}

      {/* Axis Diagrams - Only for astigmatism */}
      {isAstigmatism && showAxisGuide && (
        <div className="mt-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200" style={{ overflow: 'visible', width: '100%' }}>
            <div className="text-center mb-3">
              <h3 className="text-base font-semibold text-gray-800 mb-2">Axis Measurements</h3>
              <div className="flex justify-center items-center gap-6">
                <div className="text-center">
                  <div className="text-xs font-medium text-blue-600 mb-1">Right Eye (OD)</div>
                  <div className="text-lg font-bold text-gray-800">{rightEye.axis !== "--" ? rightEye.axis : "0"}°</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-purple-600 mb-1">Left Eye (OS)</div>
                  <div className="text-lg font-bold text-gray-800">{leftEye.axis !== "--" ? intToTabo(parseInt(leftEye.axis)) : "0"}°</div>
                </div>
              </div>
            </div>
            
            <div className="w-full overflow-x-auto">
              <div className="flex flex-col gap-4 justify-center items-center mb-6" style={{ overflow: 'visible', width: '100%' }}>
                {/* Right Eye Diagram */}
                <div className="text-center w-full" style={{ overflow: 'visible', minWidth: '400px' }}>
                  <div className="font-bold text-lg mb-4 text-blue-700">Right Eye</div>
                  <div className="flex justify-center items-center" style={{ overflow: 'visible', minHeight: '380px' }}>
                    <div className="relative w-[400px] h-[400px] bg-white rounded-full shadow-2xl border-2 border-gray-300">
                      <svg width="800" height="500" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer', userSelect: 'none', display: 'block', width: '100%', maxWidth: '100%', height: 'auto', overflow: 'visible', margin: '0px auto' }}>
                        <defs>
                          <marker id="arrowhead-right-cl" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto">
                            <polygon points="0 0, 14 7, 0 14" fill="#2563eb" />
                          </marker>
                        </defs>
                        <rect width="800" height="500" fill="white" />
                        {/* Semi-circle arc at the bottom: 0° on right, 180° on left */}
                        <path d="M 620 420 A 220 220 0 0 0 180 420" fill="none" stroke="#000" strokeWidth="3" />
                        
                        {/* Minor tick marks (every degree) */}
                        {Array.from({ length: 181 }, (_, i) => i).map((deg) => {
                          if (deg % 10 === 0) return null;
                          // 0° is on the right (0 radians), 180° is on the left (π radians)
                          // Arc is at bottom, so angle goes from 0 (right) to π (left)
                          const angle = deg * (Math.PI / 180);
                          const x1 = 400 + 210 * Math.cos(angle);
                          const y1 = 420 + 210 * Math.sin(angle);
                          const x2 = 400 + 220 * Math.cos(angle);
                          const y2 = 420 + 220 * Math.sin(angle);
                          return (
                            <line key={`minor-right-cl-${deg}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ccc" strokeWidth="0.8" />
                          );
                        })}
                        
                        {/* Major tick marks and labels */}
                        {Array.from({ length: 181 }, (_, i) => i).map((deg) => {
                          if (deg % 10 !== 0) return null;
                          // 0° is on the right (0 radians), 180° is on the left (π radians)
                          const angle = deg * (Math.PI / 180);
                          const x = 400 + 220 * Math.cos(angle);
                          const y = 420 + 220 * Math.sin(angle);
                          // Position text above the arc (smaller radius) to align with the curve
                          const textX = 400 + 180 * Math.cos(angle);
                          const textY = 420 + 180 * Math.sin(angle);
                          // Rotate text to be horizontal along the curve - reverse rotation for bottom arc
                          const textRotation = -deg;
                          return (
                            <g key={`right-cl-${deg}`}>
                              <line x1={400 + 200 * Math.cos(angle)} y1={420 + 200 * Math.sin(angle)} x2={x} y2={y} stroke="#000" strokeWidth={deg % 30 === 0 ? "3.5" : "1.8"} />
                              <text 
                                x={textX} 
                                y={textY} 
                                textAnchor="middle" 
                                dominantBaseline="middle" 
                                fontSize={deg % 30 === 0 ? "22" : "18"} 
                                fill="#000" 
                                fontWeight={deg % 30 === 0 ? "bold" : "600"} 
                                fontFamily="Arial, sans-serif"
                                transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                              >
                                {deg}
                              </text>
                            </g>
                          );
                        })}
                        {/* Arrow for right eye - 0° points right, 180° points left */}
                        <line 
                          x1="400" 
                          y1="420" 
                          x2={400 + 220 * Math.cos(rightAxisAngle * (Math.PI / 180))} 
                          y2={420 + 220 * Math.sin(rightAxisAngle * (Math.PI / 180))} 
                          stroke="#2563eb" 
                          strokeWidth="6" 
                          markerEnd="url(#arrowhead-right-cl)" 
                          style={{ pointerEvents: 'none' }} 
                        />
                        <circle cx="400" cy="420" r="6" fill="#000" stroke="#fff" strokeWidth="2" />
                        <text x="400" y="465" textAnchor="middle" dominantBaseline="middle" fontSize="22" fill="#333" fontFamily="Arial, sans-serif" fontWeight="600">{rightAxisAngle}°</text>
                        <text x="290" y="220" fontSize="26" fill="#22c55e" fontWeight="bold" fontFamily="Arial, sans-serif">R</text>
                        <text x="290" y="255" fontSize="26" fill="#22c55e" fontWeight="bold" fontFamily="Arial, sans-serif">I</text>
                      </svg>
                      {/* Interactive area for right eye */}
                      <div
                        className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-full"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;
                            const x = moveEvent.clientX - centerX;
                            const y = moveEvent.clientY - centerY;
                            // Calculate angle: 0° is right (x positive), 180° is left (x negative)
                            // Arc is at bottom, so we use atan2 with positive y
                            let angle = Math.atan2(y, x) * (180 / Math.PI);
                            if (angle < 0) angle += 360;
                            // Convert to 0-180 range: 0° stays 0°, 180° stays 180°
                            if (angle > 180) angle = 360 - angle;
                            angle = Math.round(angle);
                            setRightAxisAngle(angle);
                            handleRightEyeChange('axis', angle.toString());
                          };
                          const handleMouseUp = () => {
                            document.removeEventListener("mousemove", handleMouseMove);
                            document.removeEventListener("mouseup", handleMouseUp);
                          };
                          document.addEventListener("mousemove", handleMouseMove);
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Left Eye Diagram with TABO */}
                <div className="text-center w-full" style={{ overflow: 'visible', minWidth: '400px' }}>
                  <div className="font-bold text-lg mb-4 text-blue-700">Left Eye</div>
                  <div className="flex justify-center items-center" style={{ overflow: 'visible', minHeight: '380px' }}>
                    <div className="relative w-[400px] h-[400px] bg-white rounded-full shadow-2xl border-2 border-gray-300">
                      <svg width="800" height="500" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer', userSelect: 'none', display: 'block', width: '100%', maxWidth: '100%', height: 'auto', overflow: 'visible', margin: '0px auto' }}>
                        <defs>
                          <marker id="arrowhead-left-cl" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto">
                            <polygon points="0 0, 14 7, 0 14" fill="#2563eb" />
                          </marker>
                        </defs>
                        <rect width="800" height="500" fill="white" />
                        {/* Semi-circle arc at the bottom: 0° on right, 180° on left */}
                        <path d="M 620 420 A 220 220 0 0 0 180 420" fill="none" stroke="#000" strokeWidth="3" />
                        
                        {/* Minor tick marks */}
                        {Array.from({ length: 181 }, (_, i) => i).map((deg) => {
                          if (deg % 10 === 0) return null;
                          const angle = deg * (Math.PI / 180);
                          const x1 = 400 + 210 * Math.cos(angle);
                          const y1 = 420 + 210 * Math.sin(angle);
                          const x2 = 400 + 220 * Math.cos(angle);
                          const y2 = 420 + 220 * Math.sin(angle);
                          return (
                            <line key={`minor-left-cl-${deg}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ccc" strokeWidth="0.8" />
                          );
                        })}
                        
                        {/* Major tick marks with TABO notation */}
                        {Array.from({ length: 181 }, (_, i) => i).map((deg) => {
                          if (deg % 10 !== 0) return null;
                          const angle = deg * (Math.PI / 180);
                          const taboValue = intToTabo(deg);
                          const x = 400 + 220 * Math.cos(angle);
                          const y = 420 + 220 * Math.sin(angle);
                          // Position text above the arc (smaller radius) to align with the curve
                          const textX = 400 + 180 * Math.cos(angle);
                          const textY = 420 + 180 * Math.sin(angle);
                          // Rotate text to be horizontal along the curve - reverse rotation for bottom arc
                          const textRotation = -deg;
                          return (
                            <g key={`left-cl-${deg}`}>
                              <line x1={400 + 200 * Math.cos(angle)} y1={420 + 200 * Math.sin(angle)} x2={x} y2={y} stroke="#000" strokeWidth={deg % 30 === 0 ? "3.5" : "1.8"} />
                              <text 
                                x={textX} 
                                y={textY} 
                                textAnchor="middle" 
                                dominantBaseline="middle" 
                                fontSize={deg % 30 === 0 ? "22" : "18"} 
                                fill="#000" 
                                fontWeight={deg % 30 === 0 ? "bold" : "600"} 
                                fontFamily="Arial, sans-serif"
                                transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                              >
                                {deg}
                              </text>
                            </g>
                          );
                        })}
                        {/* Arrow for left eye - 0° points right, 180° points left */}
                        <line 
                          x1="400" 
                          y1="420" 
                          x2={400 + 220 * Math.cos(leftAxisAngle * (Math.PI / 180))} 
                          y2={420 + 220 * Math.sin(leftAxisAngle * (Math.PI / 180))} 
                          stroke="#2563eb" 
                          strokeWidth="6" 
                          markerEnd="url(#arrowhead-left-cl)" 
                          style={{ pointerEvents: 'none' }} 
                        />
                        <circle cx="400" cy="420" r="6" fill="#000" stroke="#fff" strokeWidth="2" />
                        <text x="400" y="465" textAnchor="middle" dominantBaseline="middle" fontSize="22" fill="#333" fontFamily="Arial, sans-serif" fontWeight="600">0°</text>
                        <text x="230" y="465" fontSize="22" fill="#000" fontWeight="700" fontFamily="Arial, sans-serif" textAnchor="middle">TABO 0</text>
                        <text x="650" y="435" fontSize="22" fill="#000" fontWeight="700" fontFamily="Arial, sans-serif" textAnchor="start">INT.</text>
                        <text x="400" y="115" fontSize="24" fill="#2563eb" fontWeight="bold" fontFamily="Arial, sans-serif" textAnchor="middle">TABO: {intToTabo(leftAxisAngle)}°</text>
                      </svg>
                      <div className="mt-3 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">Uses TABO system</div>
                      {/* Interactive area for left eye */}
                      <div
                        className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-full"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;
                            const x = moveEvent.clientX - centerX;
                            const y = moveEvent.clientY - centerY;
                            // Calculate angle: 0° is right (x positive), 180° is left (x negative)
                            // Arc is at bottom, so we use atan2 with positive y
                            let angle = Math.atan2(y, x) * (180 / Math.PI);
                            if (angle < 0) angle += 360;
                            // Convert to 0-180 range
                            if (angle > 180) angle = 360 - angle;
                            angle = Math.round(angle);
                            setLeftAxisAngle(angle);
                            handleLeftEyeChange('axis', angle.toString());
                          };
                          const handleMouseUp = () => {
                            document.removeEventListener("mousemove", handleMouseMove);
                            document.removeEventListener("mouseup", handleMouseUp);
                          };
                          document.addEventListener("mousemove", handleMouseMove);
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
