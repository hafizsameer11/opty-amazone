'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Product, type LensColor } from '@/services/product-service';
import { lensDataService, type LensType, type LensTreatment, type LensCoating, type LensThicknessMaterial, type LensThicknessOption, type ProgressiveVariant } from '@/services/lens-data-service';
import { getPrescriptionOptions, type PrescriptionOptions } from '@/services/prescription-options-service';
import { cartService, type AddToCartData } from '@/services/cart-service';
import { shouldShowLensOptions } from '@/utils/product-utils';
import Button from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';
import PrescriptionEntry from './PrescriptionEntry';
import LensThicknessStep from './LensThicknessStep';
import LensColorOverlay from './LensColorOverlay';

type CheckoutStep = 'lens_type' | 'progressive_variant' | 'prescription' | 'lens_thickness' | 'treatments' | 'frame_size' | 'summary';

interface ProductCheckoutModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  initialSelectedVariantId?: number | null;
  initialSelectedLensColor?: LensColor | null;
  onAddToCart?: (data: AddToCartData) => Promise<void>;
}

interface PrescriptionData {
  pd: string;
  rightEye: {
    sph: string;
    cyl: string;
    axis: string;
  };
  leftEye: {
    sph: string;
    cyl: string;
    axis: string;
  };
}

interface OrderSummaryItem {
  id: string | number;
  name: string;
  price: number;
  type: 'product' | 'lens_type' | 'treatment' | 'lens_thickness' | 'frame_size' | 'shipping';
  removable?: boolean;
}

export default function ProductCheckoutModal({
  product,
  isOpen,
  onClose,
  initialSelectedVariantId,
  initialSelectedLensColor,
  onAddToCart,
}: ProductCheckoutModalProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('lens_type');
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // Lens data
  const [lensTypes, setLensTypes] = useState<LensType[]>([]);
  const [prescriptionLensTypes, setPrescriptionLensTypes] = useState<LensType[]>([]);
  const [progressiveVariants, setProgressiveVariants] = useState<any[]>([]);
  const [loadingProgressiveVariants, setLoadingProgressiveVariants] = useState(false);
  const [treatments, setTreatments] = useState<LensTreatment[]>([]);
  const [coatings, setCoatings] = useState<LensCoating[]>([]);
  const [thicknessMaterials, setThicknessMaterials] = useState<LensThicknessMaterial[]>([]);
  const [thicknessOptions, setThicknessOptions] = useState<LensThicknessOption[]>([]);
  const [prescriptionOptions, setPrescriptionOptions] = useState<PrescriptionOptions | null>(null);
  const [loadingLensData, setLoadingLensData] = useState(true);

  // Selections
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(initialSelectedVariantId || null);
  const [selectedLensColor, setSelectedLensColor] = useState<LensColor | null>(initialSelectedLensColor || null);
  const [selectedLensType, setSelectedLensType] = useState<LensType | null>(null);
  const [selectedProgressiveVariant, setSelectedProgressiveVariant] = useState<any | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionData | null>(null);
  const [selectedLensIndex, setSelectedLensIndex] = useState<LensThicknessOption | null>(null);
  const [selectedThicknessMaterial, setSelectedThicknessMaterial] = useState<LensThicknessMaterial | null>(null);
  const [selectedTreatments, setSelectedTreatments] = useState<number[]>([]);
  const [selectedFrameSize, setSelectedFrameSize] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  // Shipping
  const [selectedShipping, setSelectedShipping] = useState<string>('standard');
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  // Order summary
  const [orderSummary, setOrderSummary] = useState<OrderSummaryItem[]>([]);

  // Get selected variant
  const selectedVariant = selectedVariantId && product.variants
    ? product.variants.find(v => v.id === selectedVariantId)
    : null;

  // Get product images
  const productImages = selectedVariant?.images && selectedVariant.images.length > 0
    ? selectedVariant.images
    : (product.images || []);
  const mainImage = productImages[0] || '/file.svg';

  // Base price
  const basePrice = Number(selectedVariant?.price || product.price || 0);

  // Load lens data
  useEffect(() => {
    if (isOpen && shouldShowLensOptions(product)) {
      loadLensData();
    }
  }, [isOpen, product.product_type, product.category, product.id]);

  const loadLensData = async () => {
    try {
      setLoadingLensData(true);
      
      let lensTypesData: LensType[] = [];
      let treatmentsData: LensTreatment[] = [];
      let coatingsData: LensCoating[] = [];
      let materialsData: LensThicknessMaterial[] = [];
      let optionsData: LensThicknessOption[] = [];
      
      // Try to get category-specific lens config first
      try {
        const categoryConfig = await lensDataService.getLensConfigForProduct(product.id);
        
        if (categoryConfig.source === 'category') {
          // Use category-specific configuration
          lensTypesData = categoryConfig.lens_types;
          treatmentsData = categoryConfig.treatments;
          coatingsData = categoryConfig.coatings;
          materialsData = categoryConfig.thickness_materials;
          optionsData = categoryConfig.thickness_options;
        } else {
          // Use global configuration
          lensTypesData = categoryConfig.lens_types;
          treatmentsData = categoryConfig.treatments;
          coatingsData = categoryConfig.coatings;
          materialsData = categoryConfig.thickness_materials;
          optionsData = categoryConfig.thickness_options;
        }
        
        // Get prescription options (included in categoryConfig or fetch separately)
        if (categoryConfig.prescription_options) {
          setPrescriptionOptions(categoryConfig.prescription_options);
        } else {
          const prescriptionOpts = await getPrescriptionOptions(product.id);
          setPrescriptionOptions(prescriptionOpts);
        }
      } catch (error) {
        console.warn('Failed to load category config, using global:', error);
        // Fallback to global lens options
        const [lensTypes, treatments, coatings, materials, options] = await Promise.all([
          lensDataService.getLensTypes(),
          lensDataService.getLensTreatments(),
          lensDataService.getLensCoatings(),
          lensDataService.getThicknessMaterials(),
          lensDataService.getThicknessOptions(),
        ]);
        lensTypesData = lensTypes;
        treatmentsData = treatments;
        coatingsData = coatings;
        materialsData = materials;
        optionsData = options;
        
        // Still try to fetch prescription options
        try {
          const prescriptionOpts = await getPrescriptionOptions(product.id);
          setPrescriptionOptions(prescriptionOpts);
        } catch (presError) {
          console.warn('Failed to load prescription options:', presError);
          setPrescriptionOptions(null);
        }
      }
      
      setLensTypes(lensTypesData);
      setTreatments(treatmentsData);
      setCoatings(coatingsData);
      setThicknessMaterials(materialsData);
      setThicknessOptions(optionsData);
      
      // Filter to only show the three prescription lens types: Distance Vision, Near Vision, Progressive
      const prescriptionTypes = lensTypesData.filter(lens => {
        const nameLower = lens.name.toLowerCase();
        return nameLower === 'distance vision' || 
               nameLower === 'near vision' || 
               nameLower === 'progressive' ||
               (nameLower.includes('distance') && nameLower.includes('vision')) ||
               (nameLower.includes('near') && nameLower.includes('vision')) ||
               (nameLower.includes('progressive') && !nameLower.includes('variant') && !nameLower.includes('premium') && !nameLower.includes('standard') && !nameLower.includes('basic'));
      });
      
      // If we don't have exactly 3, create default ones
      if (prescriptionTypes.length < 3) {
        const defaultTypes: LensType[] = [
          {
            id: 1,
            name: 'Distance Vision',
            slug: 'distance-vision',
            description: 'For distance (Thin, anti-glare, blue-cut options)',
            index: 1.5,
            price_adjustment: 0,
            is_active: true,
          },
          {
            id: 2,
            name: 'Near Vision',
            slug: 'near-vision',
            description: 'For near/reading (Thin, anti-glare, blue-cut options)',
            index: 1.5,
            price_adjustment: 0,
            is_active: true,
          },
          {
            id: 3,
            name: 'Progressive',
            slug: 'progressive',
            description: 'Progressives (For two powers in same lenses)',
            index: 1.5,
            price_adjustment: 0,
            is_active: true,
          },
        ];
        setPrescriptionLensTypes(defaultTypes);
      } else {
        setPrescriptionLensTypes(prescriptionTypes.slice(0, 3));
      }
      
      // Load progressive variants if progressive type exists
      const progressiveType = prescriptionTypes.find(t => t.name.toLowerCase().includes('progressive'));
      if (progressiveType) {
        try {
          const prescriptionLensTypesData = await lensDataService.getLensTypes();
          const filteredPrescriptionTypes = (prescriptionLensTypesData || []).filter(lens => {
            const nameLower = lens.name.toLowerCase();
            return nameLower.includes('distance vision') ||
                   nameLower.includes('near vision') ||
                   nameLower.includes('progressive');
          });
          if (filteredPrescriptionTypes.length > 0) {
            setPrescriptionLensTypes(filteredPrescriptionTypes);
            
            const progressiveTypeData = filteredPrescriptionTypes.find(t => t.name.toLowerCase().includes('progressive'));
            if (progressiveTypeData) {
              const variants = await lensDataService.getProgressiveVariants(progressiveTypeData.id);
              setProgressiveVariants(variants || []);
            }
          }
        } catch (error) {
          console.warn('Failed to load progressive variants:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load lens data:', error);
      // Set default prescription types on error
      setPrescriptionLensTypes([
        {
          id: 1,
          name: 'Distance Vision',
          slug: 'distance-vision',
          description: 'For distance (Thin, anti-glare, blue-cut options)',
          index: 1.5,
          price_adjustment: 0,
          is_active: true,
        },
        {
          id: 2,
          name: 'Near Vision',
          slug: 'near-vision',
          description: 'For near/reading (Thin, anti-glare, blue-cut options)',
          index: 1.5,
          price_adjustment: 0,
          is_active: true,
        },
        {
          id: 3,
          name: 'Progressive',
          slug: 'progressive',
          description: 'Progressives (For two powers in same lenses)',
          index: 1.5,
          price_adjustment: 0,
          is_active: true,
        },
      ]);
    } finally {
      setLoadingLensData(false);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('lens_type');
      setSelectedLensType(null);
      setPrescription(null);
      setSelectedLensIndex(null);
      setSelectedThicknessMaterial(null);
      setSelectedTreatments([]);
      setSelectedFrameSize(null);
      setQuantity(1);
      setSelectedVariantId(initialSelectedVariantId || null);
    }
  }, [isOpen, initialSelectedVariantId]);

  // Calculate order summary
  useEffect(() => {
    const summary: OrderSummaryItem[] = [];

    // Base product
    summary.push({
      id: 'product',
      name: product.name,
      price: basePrice,
      type: 'product',
    });

    // Lens type
    if (selectedLensType && Number(selectedLensType.price_adjustment || 0) > 0) {
      summary.push({
        id: `lens_type_${selectedLensType.id}`,
        name: `Lens Type: ${selectedLensType.name}`,
        price: Number(selectedLensType.price_adjustment),
        type: 'lens_type',
        removable: true,
      });
    }

    // Progressive variant
    if (selectedProgressiveVariant && Number(selectedProgressiveVariant.price || 0) > 0) {
      summary.push({
        id: `progressive_variant_${selectedProgressiveVariant.id}`,
        name: selectedProgressiveVariant.name,
        price: Number(selectedProgressiveVariant.price),
        type: 'lens_type',
        removable: true,
      });
    }

    // Lens thickness material
    if (selectedThicknessMaterial && Number(selectedThicknessMaterial.price || 0) > 0) {
      summary.push({
        id: `material_${selectedThicknessMaterial.id}`,
        name: `Material: ${selectedThicknessMaterial.name}`,
        price: Number(selectedThicknessMaterial.price),
        type: 'lens_thickness',
        removable: true,
      });
    }

    // Lens index/thickness
    if (selectedLensIndex) {
      // Note: thickness options might not have price, check if they do
      const indexPrice = 0; // Adjust if thickness options have prices
      if (indexPrice > 0) {
        summary.push({
          id: `lens_index_${selectedLensIndex.id}`,
          name: `Lens Index: ${selectedLensIndex.name}`,
          price: indexPrice,
          type: 'lens_thickness',
          removable: true,
        });
      }
    }

    // Treatments
    selectedTreatments.forEach(treatmentId => {
      const treatment = treatments.find(t => t.id === treatmentId);
      if (treatment && Number(treatment.price || 0) > 0) {
        summary.push({
          id: `treatment_${treatment.id}`,
          name: `Treatment: ${treatment.name}`,
          price: Number(treatment.price),
          type: 'treatment',
          removable: true,
        });
      }
    });

    // Shipping (mock - should come from backend)
    const shippingPrice = selectedShipping === 'express' ? 5.90 : 3.90;
    summary.push({
      id: 'shipping',
      name: `Shipping (${selectedShipping === 'express' ? 'Express' : 'Standard'})`,
      price: shippingPrice,
      type: 'shipping',
    });

    setOrderSummary(summary);
  }, [product.name, basePrice, selectedLensType, selectedThicknessMaterial, selectedLensIndex, selectedTreatments, treatments, selectedShipping]);

  // Calculate totals using useMemo
  const { subtotal, shipping, discount, total } = useMemo(() => {
    const sub = orderSummary
      .filter(item => item.type !== 'shipping')
      .reduce((sum, item) => sum + item.price, 0);
    const ship = orderSummary.find(item => item.type === 'shipping')?.price || 0;
    const disc = appliedCoupon ? (sub * (appliedCoupon.discount_percent / 100)) : 0;
    const tot = sub + ship - disc;
    return { subtotal: sub, shipping: ship, discount: disc, total: tot };
  }, [orderSummary, appliedCoupon]);

  // Handle lens type selection
  const handleLensTypeSelect = async (lensType: LensType) => {
    setSelectedLensType(lensType);
    const isProgressive = 
      lensType.name.toLowerCase().includes('progressive') ||
      lensType.slug?.includes('progressive');
    
    // Check if lens type requires prescription by name or slug
    const requiresPrescription = 
      lensType.name.toLowerCase().includes('distance') ||
      lensType.name.toLowerCase().includes('near') ||
      lensType.name.toLowerCase().includes('reading') ||
      isProgressive ||
      lensType.slug?.includes('distance') ||
      lensType.slug?.includes('near');
    
    if (isProgressive) {
      // For progressive, fetch variants first
      setLoadingProgressiveVariants(true);
      try {
        const variants = await lensDataService.getProgressiveVariants(lensType.id);
        setProgressiveVariants(variants);
        if (variants.length > 0) {
          setCurrentStep('progressive_variant');
        } else {
          alert('No progressive options available. Please check the admin panel to ensure variants are added and active.');
        }
      } catch (error) {
        console.error('Failed to fetch progressive variants:', error);
        alert('Failed to load progressive options. Please try again.');
      } finally {
        setLoadingProgressiveVariants(false);
      }
    } else if (requiresPrescription) {
      setCurrentStep('prescription');
    } else {
      // For other types, skip to thickness
      setCurrentStep('lens_thickness');
    }
  };

  // Handle prescription continue
  const handlePrescriptionContinue = (prescriptionData: PrescriptionData) => {
    setPrescription(prescriptionData);
    setCurrentStep('lens_thickness');
  };

  // Handle prescription back
  const handlePrescriptionBack = () => {
    setCurrentStep('lens_type');
    setPrescription(null);
  };

  // Handle thickness continue
  const handleThicknessContinue = () => {
    setCurrentStep('treatments');
  };

  // Handle thickness back
  const handleThicknessBack = () => {
    if (prescription) {
      setCurrentStep('prescription');
    } else {
      setCurrentStep('lens_type');
    }
  };

  // Handle treatments continue
  const handleTreatmentsContinue = () => {
    // Skip frame size if not needed, or go to frame size
    if (product.frame_sizes && product.frame_sizes.length > 0) {
      setCurrentStep('frame_size');
    } else {
      setCurrentStep('summary');
    }
  };

  // Handle frame size continue
  const handleFrameSizeContinue = () => {
    setCurrentStep('summary');
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      const cartData: AddToCartData = {
        product_id: product.id,
        variant_id: selectedVariantId || undefined,
        quantity,
        lens_color_id: selectedLensColor?.id,
        frame_size_id: selectedFrameSize?.id,
        prescription_id: undefined, // Will be created on backend if needed
        lens_index: selectedLensIndex?.thickness_value || selectedLensType?.index,
        lens_type: selectedLensType?.name,
        lens_thickness_material_id: selectedThicknessMaterial?.id,
        lens_thickness_option_id: selectedLensIndex?.id,
        treatment_ids: selectedTreatments.length > 0 ? selectedTreatments : undefined,
        progressive_variant_id: selectedProgressiveVariant?.id,
      };

      if (onAddToCart) {
        await onAddToCart(cartData);
      } else {
        await cartService.addItem(cartData);
      }
      onClose();
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      alert(error.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  // Convert thickness options to format expected by LensThicknessStep
  const lensIndexOptions = thicknessOptions.map(opt => ({
    id: opt.id,
    index: opt.thickness_value?.toString() || opt.name,
    description: opt.description || opt.name,
    price: 0, // Adjust if thickness options have prices
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-[90vw] max-h-[90vh] overflow-hidden border-2 border-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-800 px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <h2 className="text-3xl font-bold text-gray-900">{product.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="flex gap-6 p-6 items-start">
            {/* Left Column: Order Summary */}
            <div className="w-80 flex-shrink-0 flex flex-col">
              <div className="bg-white rounded-lg p-4 border border-gray-200 sticky top-4 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
                
                {/* Items List */}
                <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                  {orderSummary.filter(item => item.type !== 'shipping').map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm pb-2 border-b border-gray-100 last:border-0 group">
                      <span className="text-gray-700 flex-1 pr-2">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-medium whitespace-nowrap">
                          {item.price > 0 ? `+$${item.price.toFixed(2)}` : 'Included'}
                        </span>
                        {item.removable && (
                          <button
                            onClick={() => {
                              // Handle remove logic
                              if (item.type === 'lens_type') setSelectedLensType(null);
                              if (item.type === 'lens_thickness') {
                                setSelectedThicknessMaterial(null);
                                setSelectedLensIndex(null);
                              }
                              if (item.type === 'treatment') {
                                const treatmentId = Number(item.id.toString().replace('treatment_', ''));
                                setSelectedTreatments(prev => prev.filter(id => id !== treatmentId));
                              }
                            }}
                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping Options */}
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Shipping</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedShipping === 'standard' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="shipping-method"
                        value="standard"
                        checked={selectedShipping === 'standard'}
                        onChange={(e) => setSelectedShipping(e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">Gls</div>
                            <div className="text-xs text-gray-600 mt-0.5 truncate">Laboris ut cillum au</div>
                            <div className="text-xs text-gray-500 mt-0.5">4 business days</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 whitespace-nowrap ml-2">${shipping.toFixed(2)}</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Coupon Code */}
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Have a coupon code?</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter coupon code"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Implement coupon validation
                        alert('Coupon functionality coming soon');
                      }}
                      disabled={!couponCode}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Totals */}
                <div className="pt-4 border-t-2 border-gray-300 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-500">Subtotal ({quantity} items)</div>
                    <div className="text-sm font-medium text-gray-900">${subtotal.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-500">
                      Shipping<span className="ml-1 text-xs text-gray-400">(Gls)</span><span className="ml-1 text-xs text-gray-400">- 4 business days</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900">${shipping.toFixed(2)}</div>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-gray-500">Discount</div>
                      <div className="text-sm font-medium text-green-600">-${discount.toFixed(2)}</div>
                    </div>
                  )}
                  <div className="text-sm text-gray-500 mb-1 mt-3">Estimate Total</div>
                  <div className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Center Column: Product Image */}
            <div className="flex-1 flex flex-col items-center justify-center flex-shrink-0">
              <div className="bg-gray-100 rounded-lg overflow-hidden relative cursor-crosshair group/preview" style={{ height: '500px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem' }}>
                <LensColorOverlay
                  imageUrl={mainImage}
                  alt={product.name}
                  selectedLensColor={selectedLensColor}
                  lensAreaCoordinates={(product as any).lens_area_coordinates}
                  className="transition-transform duration-500 group-hover/preview:scale-[1.02]"
                />
              </div>
              <div className="mt-4">
                <div className="text-lg font-semibold text-gray-900">{product.name}</div>
                <div className="text-xl font-bold text-gray-900">${basePrice.toFixed(2)}</div>
              </div>
              {/* Lens Color Selection */}
              {(product as any).lens_colors && (product as any).lens_colors.length > 0 && (
                <div className="mt-4 w-full px-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lens Color:</label>
                  <div className="flex gap-2 flex-wrap">
                    {(product as any).lens_colors.map((lensColor: LensColor) => (
                      <button
                        key={lensColor.id}
                        type="button"
                        onClick={() => setSelectedLensColor(lensColor)}
                        className={`h-10 w-10 rounded-full border-2 transition-all ${
                          selectedLensColor?.id === lensColor.id
                            ? "border-[#0066CC] ring-2 ring-[#0066CC]/30 scale-110"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                        style={{ backgroundColor: lensColor.color_code }}
                        aria-label={`Select lens color ${lensColor.name}`}
                        title={lensColor.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Customization Steps */}
            <div className="w-[600px] flex-shrink-0 flex flex-col overflow-hidden min-h-0">
            {loadingLensData ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader text="Loading options..." />
              </div>
            ) : (
              <>
                {currentStep === 'lens_type' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 px-4 py-3 border-b border-gray-200 flex-shrink-0">
                      <h3 className="text-xl font-bold text-gray-900">Select Lens Type</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 pr-2">
                      <div className="space-y-2">
                        {prescriptionLensTypes.map((lens) => (
                            <button
                              key={lens.id}
                              type="button"
                              onClick={() => handleLensTypeSelect(lens)}
                              className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${
                                selectedLensType?.id === lens.id
                                  ? 'border-[#0066CC] bg-[#0066CC]/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{lens.name}</div>
                                  {lens.description && (
                                    <div className="text-xs text-gray-600 mt-1">{lens.description}</div>
                                  )}
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'prescription' && selectedLensType && (
                  <PrescriptionEntry
                    lensTypeName={selectedLensType.name}
                    onBack={handlePrescriptionBack}
                    onContinue={handlePrescriptionContinue}
                    showInTripleStructure={true}
                    productImage={mainImage}
                    productName={product.name}
                    productPrice={basePrice}
                    isProgressive={selectedLensType.name.toLowerCase().includes('progressive')}
                    prescriptionOptions={prescriptionOptions || undefined}
                  />
                )}

                {currentStep === 'lens_thickness' && (
                  <LensThicknessStep
                    prescription={prescription || {
                      pd: '55.00',
                      rightEye: { sph: '--', cyl: '--', axis: '--' },
                      leftEye: { sph: '--', cyl: '--', axis: '--' },
                    }}
                    lensMaterials={thicknessMaterials && thicknessMaterials.length > 0 
                      ? thicknessMaterials.map(m => ({
                          id: m.id,
                          name: m.name,
                          price: Number(m.price || 0),
                        }))
                      : [
                          { id: 1, name: "Standard", price: 0 },
                          { id: 2, name: "Premium", price: 25.0 },
                        ]}
                    selectedMaterial={selectedThicknessMaterial ? {
                      id: selectedThicknessMaterial.id,
                      name: selectedThicknessMaterial.name,
                      price: Number(selectedThicknessMaterial.price || 0),
                    } : null}
                    onMaterialSelect={(material) => {
                      const thicknessMat = thicknessMaterials?.find(m => m.id === material.id);
                      if (thicknessMat) setSelectedThicknessMaterial(thicknessMat);
                    }}
                    lensIndexOptions={lensIndexOptions}
                    selectedLensIndex={lensIndexOptions.find(opt => opt.id === selectedLensIndex?.id) || null}
                    onLensIndexSelect={(opt) => {
                      const thicknessOpt = thicknessOptions.find(t => t.id === opt.id);
                      if (thicknessOpt) setSelectedLensIndex(thicknessOpt);
                    }}
                    onBack={handleThicknessBack}
                    onContinue={handleThicknessContinue}
                  />
                )}

                {currentStep === 'treatments' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 flex-shrink-0">
                      <button
                        onClick={() => setCurrentStep('lens_thickness')}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h2 className="text-lg font-bold text-gray-900">Treatment</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-2">
                        {treatments.map((treatment) => (
                          <label
                            key={treatment.id}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedTreatments.includes(treatment.id)
                                ? 'border-[#0066CC] bg-[#0066CC]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedTreatments.includes(treatment.id)}
                                onChange={() => {
                                  setSelectedTreatments(prev =>
                                    prev.includes(treatment.id)
                                      ? prev.filter(id => id !== treatment.id)
                                      : [...prev, treatment.id]
                                  );
                                }}
                                className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                              />
                              <span className="font-medium text-sm">{treatment.name}</span>
                            </div>
                            {Number(treatment.price || 0) > 0 && (
                              <span className="text-sm text-gray-600">
                                +€{Number(treatment.price).toFixed(2)}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
                      <Button variant="outline" onClick={() => setCurrentStep('lens_thickness')}>
                        Back
                      </Button>
                      <Button onClick={handleTreatmentsContinue}>
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'frame_size' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 flex-shrink-0">
                      <button
                        onClick={() => setCurrentStep('treatments')}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h2 className="text-lg font-bold text-gray-900">Frame Size</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {product.frame_sizes?.map((size) => (
                          <button
                            key={size.id}
                            onClick={() => setSelectedFrameSize(size)}
                            className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${
                              selectedFrameSize?.id === size.id
                                ? 'border-[#0066CC] bg-[#0066CC]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="font-medium text-sm">{size.size_label}</span>
                            <p className="text-xs text-gray-500 mt-1">
                              {size.lens_width}mm-{size.bridge_width}mm-{size.temple_length}mm
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
                      <Button variant="outline" onClick={() => setCurrentStep('treatments')}>
                        Back
                      </Button>
                      <Button onClick={handleFrameSizeContinue} disabled={!selectedFrameSize}>
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'summary' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 flex-shrink-0">
                      <h2 className="text-lg font-bold text-gray-900">Review Your Order</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-3">
                        {orderSummary.map((item) => (
                          <div key={item.id} className="flex justify-between items-center text-sm pb-2 border-b border-gray-100">
                            <span className="text-gray-700">{item.name}</span>
                            <span className="text-gray-900 font-medium">
                              {item.price > 0 ? `+€${item.price.toFixed(2)}` : 'Included'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
                      <Button variant="outline" onClick={() => {
                        if (product.frame_sizes && product.frame_sizes.length > 0) {
                          setCurrentStep('frame_size');
                        } else {
                          setCurrentStep('treatments');
                        }
                      }}>
                        Back
                      </Button>
                      <Button onClick={handleAddToCart} disabled={addingToCart}>
                        {addingToCart ? 'Adding...' : 'Add to Cart'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
