"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import PrescriptionEntry from "./PrescriptionEntry";
import LensThicknessStep from "./LensThicknessStep";
import TreatmentStep from "./TreatmentStep";

interface LensType {
  id: number;
  name: string;
  description: string;
  price: number;
  options?: string[];
}

interface LensIndex {
  id: number;
  index: string;
  description: string;
  price: number;
}

interface LensMaterial {
  id: number;
  name: string;
  price: number;
}

interface LensTreatment {
  id: number;
  name: string;
  price: number;
  categoryId?: number;
}

interface TreatmentCategory {
  id: number;
  name: string;
  icon?: string;
  treatments: LensTreatment[];
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

type Step = "lens-selection" | "prescription" | "thickness" | "treatment" | "summary";

interface LensTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lensTypes: LensType[];
  selectedLensType: LensType | null;
  onSelect: (lens: LensType) => void;
  onContinue: () => void;
  productImage: string;
  productName: string;
  productPrice: number;
  subtotal: number;
  shippingPrice: number;
  total: number;
  shippingOptions: Array<{ id: string; name: string; days: string; price: number }>;
  selectedShipping: string;
  onShippingChange: (shippingId: string) => void;
  couponCode: string;
  onCouponChange: (code: string) => void;
  onApplyCoupon: () => void;
  lensIndexOptions: LensIndex[];
  selectedLensIndex: LensIndex | null;
  onLensIndexSelect: (index: LensIndex) => void;
  treatmentOptions: LensTreatment[];
  selectedTreatments: number[];
  onTreatmentToggle: (treatmentId: number) => void;
  lensMaterials?: LensMaterial[];
}

export default function LensTypeModal({
  isOpen,
  onClose,
  lensTypes,
  selectedLensType,
  onSelect,
  onContinue,
  productImage,
  productName,
  productPrice,
  subtotal,
  shippingPrice,
  total,
  shippingOptions,
  selectedShipping,
  onShippingChange,
  couponCode,
  onCouponChange,
  onApplyCoupon,
  lensIndexOptions,
  selectedLensIndex,
  onLensIndexSelect,
  treatmentOptions,
  selectedTreatments,
  onTreatmentToggle,
  lensMaterials = [
    { id: 1, name: "Unbreakable", price: 10.0 },
    { id: 2, name: "vetro", price: 35.0 },
  ],
}: LensTypeModalProps) {
  const [step, setStep] = useState<Step>("lens-selection");
  const [prescription, setPrescription] = useState<PrescriptionData | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<LensMaterial | null>(null);

  // Group treatments by category
  const treatmentCategories: TreatmentCategory[] = [
    {
      id: 1,
      name: "Photochromic",
      icon: "sun",
      treatments: treatmentOptions.filter((t) => t.name.toLowerCase().includes("photochromic")),
    },
    {
      id: 2,
      name: "Prescription Sun Lenses",
      icon: "sun",
      treatments: treatmentOptions.filter((t) =>
        t.name.toLowerCase().includes("polarized") || t.name.toLowerCase().includes("sun")
      ),
    },
    {
      id: 3,
      name: "Standard Treatments",
      treatments: treatmentOptions.filter(
        (t) =>
          !t.name.toLowerCase().includes("photochromic") &&
          !t.name.toLowerCase().includes("polarized") &&
          !t.name.toLowerCase().includes("sun")
      ),
    },
  ];

  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle mount/unmount with animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Small delay to ensure DOM is ready for animation
      setTimeout(() => {
        setIsClosing(false);
      }, 10);
    } else {
      setIsClosing(true);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        // Reset step when modal closes
        setStep("lens-selection");
        setPrescription(null);
        setSelectedMaterial(null);
        // Restore body scroll
        document.body.style.overflow = 'unset';
      }, 200); // Match the transition duration
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleLensContinue = () => {
    if (selectedLensType) {
      setStep("prescription");
    }
  };

  const handlePrescriptionContinue = (prescriptionData: PrescriptionData) => {
    setPrescription(prescriptionData);
    setStep("thickness");
  };

  const handleThicknessContinue = () => {
    if (selectedMaterial && selectedLensIndex) {
      setStep("treatment");
    }
  };

  const handleTreatmentContinue = () => {
    setStep("summary");
  };

  const handleFinalContinue = () => {
    onContinue();
  };

  const handleBack = () => {
    if (step === "prescription") {
      setStep("lens-selection");
    } else if (step === "thickness") {
      setStep("prescription");
    } else if (step === "treatment") {
      setStep("thickness");
    } else if (step === "summary") {
      setStep("treatment");
    }
  };

  const handleClose = () => {
    setStep("lens-selection");
    setPrescription(null);
    setSelectedMaterial(null);
    onClose();
  };

  // Calculate modal width based on step
  const getModalWidth = () => {
    if (step === "lens-selection") {
      return "max-w-7xl"; // Increased width for first step
    }
    return "max-w-[95vw]"; // Much wider for other steps (95% of viewport width)
  };

  // Render Order Summary Column (Left)
  const renderOrderSummary = () => (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col flex-shrink-0">
      <div className="p-6 space-y-6">
        {/* Order Summary */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{productName}</span>
              <span className="text-sm font-semibold text-gray-900">
                €{productPrice.toFixed(2)}
              </span>
            </div>
            {selectedLensType && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{selectedLensType.name}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {selectedLensType.price > 0 ? `+€${Number(selectedLensType.price || 0).toFixed(2)}` : "Included"}
                </span>
              </div>
            )}
            {selectedMaterial && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{selectedMaterial.name}</span>
                <span className="text-sm font-semibold text-gray-900">
                  +€{Number(selectedMaterial.price || 0).toFixed(2)}
                </span>
              </div>
            )}
            {selectedLensIndex && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Lens Index {selectedLensIndex.index}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {selectedLensIndex.price > 0 ? `+€${Number(selectedLensIndex.price || 0).toFixed(2)}` : "Included"}
                </span>
              </div>
            )}
            {selectedTreatments.length > 0 && (
              <div className="space-y-1">
                {selectedTreatments.map((treatmentId) => {
                  const treatment = treatmentOptions.find((t) => t.id === treatmentId);
                  return treatment ? (
                    <div key={treatmentId} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{treatment.name}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        +€{Number(treatment.price || 0).toFixed(2)}
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Shipping */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Shipping</h3>
          <div className="space-y-3">
            {shippingOptions.map((shipping) => (
              <label
                key={shipping.id}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedShipping === shipping.id
                    ? "border-[#0066CC] bg-[#0066CC]/5"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="shipping"
                  value={shipping.id}
                  checked={selectedShipping === shipping.id}
                  onChange={() => onShippingChange(shipping.id)}
                  className="mt-1 w-4 h-4 text-[#0066CC] border-gray-300 focus:ring-[#0066CC]"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{shipping.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{shipping.days}</div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  €{Number(shipping.price || 0).toFixed(2)}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Coupon Code */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Have a coupon code?</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => onCouponChange(e.target.value)}
              placeholder="Enter coupon code"
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
            />
            <Button
              onClick={onApplyCoupon}
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
            >
              Apply
            </Button>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold text-gray-900">€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Shipping ({shippingOptions.find((s) => s.id === selectedShipping)?.name})
            </span>
            <span className="font-semibold text-gray-900">€{shippingPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-lg font-bold text-gray-900">Estimate Total</span>
            <span className="text-lg font-bold text-[#0066CC]">€{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Product Image Column (Center)
  const renderProductImage = () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-white px-1 py-2 relative flex-shrink-0">
      <div className="relative w-full max-w-md aspect-square mb-1">
        <Image src={productImage} alt={productName} fill className="object-contain" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">{productName}</p>
        <p className="text-lg font-bold text-[#0066CC]">€{productPrice.toFixed(2)}</p>
      </div>
    </div>
  );

  // Render Right Column Content based on step
  const renderRightColumn = () => {
    if (step === "prescription" && selectedLensType && prescription === null) {
      return (
        <div className="w-[500px] border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
          <PrescriptionEntry
            lensTypeName={selectedLensType.name}
            onBack={handleBack}
            onContinue={handlePrescriptionContinue}
            showInTripleStructure={true}
            productImage={productImage}
            productName={productName}
            productPrice={productPrice}
          />
        </div>
      );
    }

    if (step === "thickness" && prescription) {
      return (
        <div className="w-[500px] border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
          <LensThicknessStep
            prescription={prescription}
            lensMaterials={lensMaterials}
            selectedMaterial={selectedMaterial}
            onMaterialSelect={setSelectedMaterial}
            lensIndexOptions={lensIndexOptions}
            selectedLensIndex={selectedLensIndex}
            onLensIndexSelect={onLensIndexSelect}
            onBack={handleBack}
            onContinue={handleThicknessContinue}
          />
        </div>
      );
    }

    if (step === "treatment") {
      return (
        <div className="w-[500px] border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
          <TreatmentStep
            treatmentCategories={treatmentCategories}
            selectedTreatments={selectedTreatments}
            onTreatmentToggle={onTreatmentToggle}
            onBack={handleBack}
            onContinue={handleTreatmentContinue}
          />
        </div>
      );
    }

    if (step === "summary") {
      return (
        <div className="w-[500px] border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Review Your Selection</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Lens Type</h4>
                  <p className="text-sm text-gray-700">{selectedLensType?.name}</p>
                </div>
                {selectedMaterial && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Material</h4>
                    <p className="text-sm text-gray-700">{selectedMaterial.name}</p>
                  </div>
                )}
                {selectedLensIndex && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Lens Index</h4>
                    <p className="text-sm text-gray-700">{selectedLensIndex.index}</p>
                  </div>
                )}
                {selectedTreatments.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Treatments</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedTreatments.map((treatmentId) => {
                        const treatment = treatmentOptions.find((t) => t.id === treatmentId);
                        return treatment ? (
                          <li key={treatmentId} className="text-sm text-gray-700">
                            {treatment.name}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleFinalContinue}>Add to Cart</Button>
          </div>
        </div>
      );
    }

    // Default: Lens Selection
    return (
      <div className="w-[500px] border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900">Select Lens Type</h3>
            <div className="space-y-3">
              {lensTypes.map((lens) => (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => onSelect(lens)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                    selectedLensType?.id === lens.id
                      ? "border-[#0066CC] bg-[#0066CC]/5 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-gray-900 text-base">{lens.name}</h4>
                        {selectedLensType?.id === lens.id && (
                          <svg
                            className="w-5 h-5 text-[#0066CC] flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{lens.description}</p>
                      {lens.options && lens.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {lens.options.map((option, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case "lens-selection":
        return "Select Lens Type";
      case "prescription":
        return selectedLensType?.name || "Prescription";
      case "thickness":
        return "Lens Thickness";
      case "treatment":
        return "Treatment";
      case "summary":
        return "Review";
      default:
        return "Select Lens Type";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-2xl shadow-xl ${getModalWidth()} w-full max-h-[95vh] flex flex-col transition-all duration-200 ${
            isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-900">{getStepTitle()}</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Three Column Layout */}
          <div className="flex-1 overflow-y-auto flex min-h-0">
            {renderOrderSummary()}
            {renderProductImage()}
            {renderRightColumn()}
          </div>

          {/* Footer - Only show for lens-selection step */}
          {step === "lens-selection" && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleLensContinue} disabled={!selectedLensType}>
                Continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
