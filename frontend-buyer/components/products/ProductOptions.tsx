"use client";

import { Product } from "@/types/product";
import { shouldShowLensOptions } from "@/utils/product-utils";

interface ProductOptionsProps {
  product: Product;
  selectedColor?: string;
  onColorChange?: (color: string) => void;
  selectedSize?: any;
  onSizeChange?: (size: any) => void;
  selectedLensType?: any;
  onLensTypeChange?: (lens: any) => void;
  selectedLensIndex?: any;
  onLensIndexChange?: (index: any) => void;
  selectedTreatments?: number[];
  onTreatmentToggle?: (treatmentId: number) => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}

export default function ProductOptions({
  product,
  selectedColor,
  onColorChange,
  selectedSize,
  onSizeChange,
  selectedLensType,
  onLensTypeChange,
  selectedLensIndex,
  onLensIndexChange,
  selectedTreatments = [],
  onTreatmentToggle,
  quantity,
  onQuantityChange,
}: ProductOptionsProps) {
  // Render frame/sunglasses options
  if (shouldShowLensOptions(product)) {
    const frameProduct = product as any;
    
    return (
      <>
        {/* Frame Color Selection */}
        {frameProduct.frame_colors && frameProduct.frame_colors.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Frame Color
            </label>
            <div className="flex gap-2">
              {frameProduct.frame_colors.map((color: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onColorChange?.(color)}
                  className={`h-10 w-10 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? "border-[#0066CC] ring-2 ring-[#0066CC]/30 scale-110"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Frame Size Selection */}
        {frameProduct.frame_sizes && frameProduct.frame_sizes.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Frame Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {frameProduct.frame_sizes.map((size: any) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => onSizeChange?.(size)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedSize?.id === size.id
                      ? "border-[#0066CC] bg-[#0066CC]/5 text-[#0066CC]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold">{size.size_label}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {size.lens_width}mm • {size.bridge_width}mm • {size.temple_length}mm
                  </div>
                  {size.stock_quantity < 5 && (
                    <div className="text-xs text-orange-600 mt-1">
                      Only {size.stock_quantity} left
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lens Type Selection */}
        {frameProduct.lens_types && frameProduct.lens_types.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Lens Type
            </label>
            <div className="space-y-2">
              {frameProduct.lens_types.map((lens: any) => (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => onLensTypeChange?.(lens)}
                  className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${
                    selectedLensType?.id === lens.id
                      ? "border-[#0066CC] bg-[#0066CC]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{lens.name}</span>
                    <span className="text-sm text-gray-600">
                      {(lens.price_adjustment || lens.price || 0) > 0 
                        ? `+€${Number(lens.price_adjustment || lens.price || 0).toFixed(2)}` 
                        : "Included"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lens Index Selection - Use lens_types from API or product */}
        {frameProduct.lens_types && frameProduct.lens_types.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Lens Index (Thickness)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {frameProduct.lens_types.map((lensType: any) => (
                <button
                  key={lensType.id}
                  type="button"
                  onClick={() => onLensIndexChange?.(lensType)}
                  className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${
                    selectedLensIndex?.id === lensType.id
                      ? "border-[#0066CC] bg-[#0066CC]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">Index {lensType.index}</div>
                  <div className="text-xs text-gray-600">{lensType.description || `Thinner lenses`}</div>
                  <div className="text-sm text-gray-700 mt-1">
                    {(lensType.price_adjustment || 0) > 0 
                      ? `+€${Number(lensType.price_adjustment || 0).toFixed(2)}` 
                      : "Included"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Fallback: Use lens_index_options from product if lens_types not available */}
        {(!frameProduct.lens_types || frameProduct.lens_types.length === 0) && 
         frameProduct.lens_index_options && Array.isArray(frameProduct.lens_index_options) && frameProduct.lens_index_options.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Lens Index (Thickness)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {frameProduct.lens_index_options.map((indexOption: any, idx: number) => {
                // Handle both string and object formats
                const indexValue = typeof indexOption === 'string' ? indexOption : (indexOption.index || indexOption);
                const indexId = typeof indexOption === 'object' ? indexOption.id : idx;
                return (
                  <button
                    key={indexId}
                    type="button"
                    onClick={() => onLensIndexChange?.(typeof indexOption === 'object' ? indexOption : { id: idx, index: indexValue })}
                    className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${
                      selectedLensIndex?.id === indexId || selectedLensIndex?.index === indexValue
                        ? "border-[#0066CC] bg-[#0066CC]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">Index {indexValue}</div>
                    <div className="text-xs text-gray-600">Thinner lenses</div>
                    <div className="text-sm text-gray-700 mt-1">
                      {(typeof indexOption === 'object' && indexOption.price) > 0 
                        ? `+€${Number(indexOption.price || 0).toFixed(2)}` 
                        : "Included"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lens Treatments - Use treatments from API or product */}
        {frameProduct.treatment_options && frameProduct.treatment_options.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Lens Treatments (Optional)
            </label>
            <div className="space-y-2">
              {frameProduct.treatment_options.map((treatment: any) => {
                // Handle both object and string formats
                const treatmentId = typeof treatment === 'object' ? treatment.id : treatment;
                const treatmentName = typeof treatment === 'object' ? treatment.name : treatment;
                const treatmentPrice = typeof treatment === 'object' ? (treatment.price || 0) : 0;
                
                return (
                  <label
                    key={treatmentId}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTreatments.includes(treatmentId)}
                        onChange={() => onTreatmentToggle?.(treatmentId)}
                        className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                      />
                      <span className="font-medium">{treatmentName}</span>
                    </div>
                    {treatmentPrice > 0 && (
                      <span className="text-sm text-gray-600">
                        +€{Number(treatmentPrice).toFixed(2)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Sunglasses specific: UV Protection & Polarization */}
        {product.product_type === "sunglasses" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Sunglasses Features</h3>
            <div className="space-y-2 text-sm">
              {frameProduct.uv_protection && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-800">
                    UV Protection {frameProduct.uv_protection_level || "UV400"}
                  </span>
                </div>
              )}
              {frameProduct.polarization && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-800">Polarized Lenses</span>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // Render contact lens options
  if (product.product_type === "contact_lens") {
    const contactProduct = product as any;
    
    return (
      <>
        {/* Contact Lens Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Replacement Schedule
          </label>
          <div className="px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50">
            <span className="font-medium">{contactProduct.replacement_frequency}</span>
            <p className="text-xs text-gray-600 mt-1">
              {contactProduct.replacement_frequency === "daily" && "Dispose after one day of wear"}
              {contactProduct.replacement_frequency === "monthly" && "Replace monthly"}
              {contactProduct.replacement_frequency === "yearly" && "Replace yearly"}
            </p>
          </div>
        </div>

        {/* Base Curve */}
        {contactProduct.base_curve_options && contactProduct.base_curve_options.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Base Curve (BC)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {contactProduct.base_curve_options.map((bc: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  className="px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 text-sm font-medium"
                >
                  {bc}mm
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Diameter */}
        {contactProduct.diameter_options && contactProduct.diameter_options.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Diameter (DIA)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {contactProduct.diameter_options.map((dia: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  className="px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 text-sm font-medium"
                >
                  {dia}mm
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Power Selection */}
        {contactProduct.powers_range && contactProduct.powers_range.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Power (Prescription)
            </label>
            <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
              {contactProduct.powers_range.map((power: any) => (
                <button
                  key={power.id}
                  type="button"
                  className={`w-full px-4 py-2 rounded-lg border-2 text-left transition-all ${
                    power.stock_quantity > 0
                      ? "border-gray-200 hover:border-[#0066CC]"
                      : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                  }`}
                  disabled={power.stock_quantity === 0}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {power.sphere}
                      {power.cylinder && ` / ${power.cylinder}`}
                      {power.axis && ` x ${power.axis}°`}
                    </span>
                    {power.stock_quantity > 0 ? (
                      <span className="text-xs text-green-600">
                        {power.stock_quantity} in stock
                      </span>
                    ) : (
                      <span className="text-xs text-red-600">Out of stock</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contact Lens Features */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Lens Features</h3>
          <div className="space-y-2 text-sm">
            {contactProduct.has_uv_filter && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-blue-800">UV Protection</span>
              </div>
            )}
            {contactProduct.can_sleep_with && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-blue-800">Extended Wear (Can sleep with)</span>
              </div>
            )}
            {contactProduct.water_content && (
              <div className="text-blue-800">
                Water Content: {contactProduct.water_content}
              </div>
            )}
            {contactProduct.is_medical_device && (
              <div className="text-xs text-orange-600 font-medium">
                ⚠️ Medical Device - Requires Prescription
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Render eye hygiene options
  if (product.product_type === "eye_hygiene") {
    const hygieneProduct = product as any;
    
    return (
      <>
        {/* Size/Volume */}
        {hygieneProduct.size_volume && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Size/Volume
            </label>
            <div className="px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50">
              <span className="font-medium">{hygieneProduct.size_volume}</span>
            </div>
          </div>
        )}

        {/* Pack Type */}
        {hygieneProduct.pack_type && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Pack Type
            </label>
            <div className="px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50">
              <span className="font-medium">{hygieneProduct.pack_type}</span>
            </div>
          </div>
        )}

        {/* Expiry Date */}
        {hygieneProduct.expiry_date && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-900">Expiry Date</p>
                <p className="text-sm text-yellow-800">
                  {new Date(hygieneProduct.expiry_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Render accessory options
  if (product.product_type === "accessory") {
    const accessoryProduct = product as any;
    
    return (
      <>
        {accessoryProduct.compatible_with && accessoryProduct.compatible_with.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Compatible With
            </label>
            <div className="flex flex-wrap gap-2">
              {accessoryProduct.compatible_with.map((type: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium"
                >
                  {type.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
