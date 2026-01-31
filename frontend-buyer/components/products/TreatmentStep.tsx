"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface TreatmentCategory {
  id: number;
  name: string;
  icon?: string;
  treatments: Treatment[];
}

interface Treatment {
  id: number;
  name: string;
  description?: string;
  price: number;
  categoryId?: number;
}

interface TreatmentStepProps {
  treatmentCategories: TreatmentCategory[];
  selectedTreatments: number[];
  onTreatmentToggle: (treatmentId: number) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function TreatmentStep({
  treatmentCategories,
  selectedTreatments,
  onTreatmentToggle,
  onBack,
  onContinue,
}: TreatmentStepProps) {
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleContinue = () => {
    onContinue();
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
        <h2 className="text-xl font-bold text-gray-900">Treatment</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {treatmentCategories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id);
            const hasSelectedTreatment = category.treatments.some((treatment) =>
              selectedTreatments.includes(treatment.id)
            );

            return (
              <div
                key={category.id}
                className={`bg-white border-2 rounded-xl overflow-hidden transition-all ${
                  hasSelectedTreatment
                    ? "border-[#0066CC] shadow-md"
                    : "border-gray-200"
                }`}
              >
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {category.icon && (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>
                    )}
                    <h3 className="font-bold text-gray-900 text-lg">{category.name}</h3>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Category Treatments */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-5 space-y-3">
                    {category.treatments.map((treatment) => {
                      const isSelected = selectedTreatments.includes(treatment.id);
                      return (
                        <label
                          key={treatment.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-[#0066CC] bg-[#0066CC]/5"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onTreatmentToggle(treatment.id)}
                              className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {treatment.name}
                                {treatment.price > 0 && (
                                  <span className="text-sm text-gray-600 ml-2">
                                    (+€{Number(treatment.price || 0).toFixed(2)})
                                  </span>
                                )}
                              </div>
                              {treatment.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {treatment.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {treatment.price > 0 && (
                            <div className="text-sm font-semibold text-gray-900 ml-4">
                              €{Number(treatment.price || 0).toFixed(2)}
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Individual Treatments (if any without category) */}
          {/* This can be added if there are treatments that don't belong to categories */}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
