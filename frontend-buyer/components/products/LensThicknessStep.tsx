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
      <div className="flex items-center gap-2 mb-4 px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-xl font-bold text-gray-900">Lens Thickness</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pr-2">
        <div className="mb-6">
          {/* Lens Material Selection */}
          <div className="space-y-3">
            {lensMaterials.map((material) => (
              <label
                key={material.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMaterial?.id === material.id
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="lens-material"
                    checked={selectedMaterial?.id === material.id}
                    onChange={() => onMaterialSelect(material)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-medium text-gray-900">{material.name}</span>
                </div>
                <div className="text-base font-semibold text-gray-900">
                  ${Number(material.price || 0).toFixed(2)}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Lens Index (Thickness) Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-bold text-gray-900">Lens Index (Thickness)</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              Auto-recommended: {recommendedIndex}
            </span>
          </div>

          {/* Recommended Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
            <p className="font-bold text-gray-900 text-base mb-1">
              Recommended lens thickness: {recommendedIndex}
            </p>
            <p className="text-sm text-gray-600">
              Based on your prescription (SPH + CYL)
            </p>
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium appearance-none bg-white"
            >
              <option value="">Please select</option>
              {lensIndexOptions.map((index) => (
                <option key={index.id} value={index.id}>
                  {index.index} - {index.description}
                  {index.price > 0 ? ` (+$${Number(index.price || 0).toFixed(2)})` : " (Included)"}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              You can override the recommendation by selecting a different option above.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
        <button
          onClick={handleContinue}
          disabled={!selectedMaterial || !selectedLensIndex}
          className="w-full bg-blue-950 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}
