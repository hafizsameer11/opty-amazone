"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

interface LensMaterial {
  id: number;
  name: string;
  price: number;
}

interface LensIndex {
  id: number;
  index: string;
  description: string;
  price: number;
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

interface LensThicknessStepProps {
  prescription: PrescriptionData;
  lensMaterials: LensMaterial[];
  selectedMaterial: LensMaterial | null;
  onMaterialSelect: (material: LensMaterial) => void;
  lensIndexOptions: LensIndex[];
  selectedLensIndex: LensIndex | null;
  onLensIndexSelect: (index: LensIndex) => void;
  onBack: () => void;
  onContinue: () => void;
}

// Calculate recommended lens index based on prescription
const calculateRecommendedIndex = (prescription: PrescriptionData): string => {
  const getMaxPower = (eye: { sph: string; cyl: string }) => {
    const sph = parseFloat(eye.sph) || 0;
    const cyl = parseFloat(eye.cyl) || 0;
    return Math.abs(sph) + Math.abs(cyl);
  };

  const rightPower = getMaxPower(prescription.rightEye);
  const leftPower = getMaxPower(prescription.leftEye);
  const maxPower = Math.max(rightPower, leftPower);

  // Recommendation logic based on power
  if (maxPower <= 2.0) return "1.56";
  if (maxPower <= 4.0) return "1.60";
  if (maxPower <= 6.0) return "1.67";
  if (maxPower <= 8.0) return "1.74";
  return "1.74";
};

export default function LensThicknessStep({
  prescription,
  lensMaterials,
  selectedMaterial,
  onMaterialSelect,
  lensIndexOptions,
  selectedLensIndex,
  onLensIndexSelect,
  onBack,
  onContinue,
}: LensThicknessStepProps) {
  const [recommendedIndex, setRecommendedIndex] = useState<string>("1.56");
  const [showManualSelect, setShowManualSelect] = useState(false);

  useEffect(() => {
    const recommended = calculateRecommendedIndex(prescription);
    setRecommendedIndex(recommended);
    // Auto-select recommended index if not already selected
    if (!selectedLensIndex) {
      const recommendedOption = lensIndexOptions.find(
        (opt) => opt.index === recommended
      );
      if (recommendedOption) {
        onLensIndexSelect(recommendedOption);
      }
    }
  }, [prescription, lensIndexOptions, selectedLensIndex, onLensIndexSelect]);

  const handleContinue = () => {
    if (selectedMaterial && selectedLensIndex) {
      onContinue();
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Back"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900">Lens Thickness</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Lens Material Selection */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Lens Material</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lensMaterials.map((material) => (
                <label
                  key={material.id}
                  className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMaterial?.id === material.id
                      ? "border-[#0066CC] bg-[#0066CC]/5"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="lens-material"
                    checked={selectedMaterial?.id === material.id}
                    onChange={() => onMaterialSelect(material)}
                    className="w-5 h-5 text-[#0066CC] border-gray-300 focus:ring-[#0066CC]"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{material.name}</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    €{Number(material.price || 0).toFixed(2)}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Lens Index (Thickness) Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Lens Index (Thickness)</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                Auto-recommended: {recommendedIndex}
              </span>
            </div>

            {/* Recommended Box */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-lg">
                    Recommended lens thickness: {recommendedIndex}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Based on your prescription (SPH + CYL)
                  </p>
                </div>
              </div>
            </div>

            {/* Manual Selection Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Please select
              </label>
              <select
                value={selectedLensIndex?.id || ""}
                onChange={(e) => {
                  const selected = lensIndexOptions.find(
                    (opt) => opt.id === parseInt(e.target.value)
                  );
                  if (selected) {
                    onLensIndexSelect(selected);
                    setShowManualSelect(true);
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-gray-900 font-medium"
              >
                <option value="">Please select</option>
                {lensIndexOptions.map((index) => (
                  <option key={index.id} value={index.id}>
                    {index.index} - {index.description}
                    {index.price > 0 ? ` (+€${Number(index.price || 0).toFixed(2)})` : " (Included)"}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                You can override the recommendation by selecting a different option above.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectedMaterial || !selectedLensIndex}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
