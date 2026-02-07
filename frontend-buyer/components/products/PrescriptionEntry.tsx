"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

interface PrescriptionData {
  pd: string;
  pd_right?: string;
  pd_left?: string;
  h?: string; // Height for progressive lenses
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

interface PrescriptionEntryProps {
  lensTypeName: string;
  onBack: () => void;
  onContinue: (prescription: PrescriptionData) => void;
  showInTripleStructure?: boolean;
  productImage?: string;
  productName?: string;
  productPrice?: number;
  isProgressive?: boolean;
}

// Generate options for SPH, CYL, AXIS
const generateSPHOptions = () => {
  const options = [];
  for (let i = -20.0; i <= 20.0; i += 0.25) {
    options.push(i.toFixed(2));
  }
  return options;
};

const generateCYLOptions = () => {
  const options = ["--"];
  for (let i = -6.0; i <= 6.0; i += 0.25) {
    options.push(i.toFixed(2));
  }
  return options;
};

const generateAXISOptions = () => {
  const options = ["--"];
  for (let i = 0; i <= 180; i += 1) {
    options.push(i.toString());
  }
  return options;
};

const generatePDOptions = () => {
  const options = [];
  for (let i = 50.0; i <= 75.0; i += 0.5) {
    options.push(i.toFixed(2));
  }
  return options;
};

export default function PrescriptionEntry({
  lensTypeName,
  onBack,
  onContinue,
  showInTripleStructure = false,
  productImage,
  productName,
  productPrice,
  isProgressive = false,
}: PrescriptionEntryProps) {
  const [prescription, setPrescription] = useState<PrescriptionData>({
    pd: "55.00",
    rightEye: {
      sph: "--",
      cyl: "--",
      axis: "--",
    },
    leftEye: {
      sph: "--",
      cyl: "--",
      axis: "--",
    },
  });

  const [showAxisGuide, setShowAxisGuide] = useState(false);
  const [rightAxisAngle, setRightAxisAngle] = useState(0);
  const [leftAxisAngle, setLeftAxisAngle] = useState(0);
  
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
  
  // Sync axis angles with prescription when they change
  useEffect(() => {
    if (prescription.rightEye.axis !== "--") {
      setRightAxisAngle(parseInt(prescription.rightEye.axis) || 0);
    }
    if (prescription.leftEye.axis !== "--") {
      // Left eye stores in INT, but we display TABO
      const intValue = parseInt(prescription.leftEye.axis) || 0;
      setLeftAxisAngle(intValue);
    }
  }, [prescription.leftEye.axis, prescription.rightEye.axis]);

  const sphOptions = generateSPHOptions();
  const cylOptions = generateCYLOptions();
  const axisOptions = generateAXISOptions();
  const pdOptions = generatePDOptions();

  const handleCopyRightToLeft = () => {
    setPrescription({
      ...prescription,
      leftEye: { ...prescription.rightEye },
    });
    if (prescription.rightEye.axis !== "--") {
      const rightAxis = parseInt(prescription.rightEye.axis) || 0;
      setRightAxisAngle(rightAxis);
      setLeftAxisAngle(rightAxis);
    }
  };

  const handleContinue = () => {
    onContinue(prescription);
  };

  // If shown in triple structure, only render content (no header/footer)
  if (showInTripleStructure) {
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
          <h2 className="text-xl font-bold text-gray-900">{lensTypeName}</h2>
          <div className="ml-auto">
            <a
              href="#"
              className="text-sm text-[#0066CC] hover:underline flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Need help? Contact Customer Support
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Pupillary Distance - Different for Progressive */}
          {isProgressive ? (
            <>
              {/* Binocular PD */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100 shadow-sm">
                <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-b from-[#0066CC] to-blue-600 rounded-full"></span>
                  PD
                  <button
                    type="button"
                    className="ml-auto text-[#0066CC] hover:text-blue-700 transition-colors"
                    aria-label="What is PD?"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </label>
                <select
                  value={prescription.pd}
                  onChange={(e) => setPrescription({ ...prescription, pd: e.target.value })}
                  style={{ color: '#111827' }}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] font-semibold bg-white shadow-sm hover:border-gray-300 transition-all"
                >
                  {pdOptions.map((pd) => (
                    <option key={pd} value={pd} style={{ color: '#111827' }}>
                      {pd} mm
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Right PD */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100 shadow-sm">
                <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-b from-[#0066CC] to-blue-600 rounded-full"></span>
                  Enter Your Right Pupillary distance
                </label>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <input
                    type="text"
                    value={prescription.pd_right || ""}
                    onChange={(e) => setPrescription({ ...prescription, pd_right: e.target.value })}
                    placeholder="Enter Your Right Pupillary distance"
                    className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] font-semibold bg-white shadow-sm hover:border-gray-300 transition-all"
                  />
                  <span className="text-sm text-gray-600 font-medium">mm</span>
                  <button
                    type="button"
                    className="text-[#0066CC] hover:text-blue-700 transition-colors"
                    aria-label="What is PD?"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* H (Height) */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100 shadow-sm">
                <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-b from-[#0066CC] to-blue-600 rounded-full"></span>
                  H
                  <button
                    type="button"
                    className="ml-auto text-[#0066CC] hover:text-blue-700 transition-colors"
                    aria-label="What is H?"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </label>
                <select
                  value={prescription.h || ""}
                  onChange={(e) => setPrescription({ ...prescription, h: e.target.value })}
                  style={{ color: '#111827' }}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] font-semibold bg-white shadow-sm hover:border-gray-300 transition-all"
                >
                  <option value="">- Select -</option>
                  {Array.from({ length: 31 }, (_, i) => i + 10).map((h) => (
                    <option key={h} value={h.toString()} style={{ color: '#111827' }}>
                      {h} mm
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100 shadow-sm">
              <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-[#0066CC] to-blue-600 rounded-full"></span>
                Pupillary Distance (PD)
                <button
                  type="button"
                  className="ml-auto text-[#0066CC] hover:text-blue-700 transition-colors"
                  aria-label="What is PD?"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </button>
              </label>
              <select
                value={prescription.pd}
                onChange={(e) => setPrescription({ ...prescription, pd: e.target.value })}
                style={{ color: '#111827' }}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] font-semibold bg-white shadow-sm hover:border-gray-300 transition-all"
              >
                {pdOptions.map((pd) => (
                  <option key={pd} value={pd} style={{ color: '#111827' }}>
                    {pd} mm
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Eyes Prescription */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Right Eye OD */}
            <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-white border-2 border-[#0066CC]/30 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-4 h-4 rounded-full bg-[#0066CC] shadow-sm"></div>
                <h3 className="font-bold text-gray-900 text-lg">Right Eye OD</h3>
                <button
                  type="button"
                  className="ml-auto text-[#0066CC] hover:text-[#0052A3] transition-colors"
                  aria-label="What is OD?"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">SPH</label>
                  <select
                    value={prescription.rightEye.sph}
                    onChange={(e) =>
                      setPrescription({
                        ...prescription,
                        rightEye: { ...prescription.rightEye, sph: e.target.value },
                      })
                    }
                    style={{ color: '#111827' }}
                    className={`w-full px-3 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold transition-all bg-white ${
                      prescription.rightEye.sph !== "--"
                        ? "border-[#0066CC] shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <option value="--">--</option>
                    {sphOptions.map((sph) => (
                      <option key={sph} value={sph} style={{ color: '#111827' }}>
                        {sph}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">CYL</label>
                  <select
                    value={prescription.rightEye.cyl}
                    onChange={(e) =>
                      setPrescription({
                        ...prescription,
                        rightEye: { ...prescription.rightEye, cyl: e.target.value },
                      })
                    }
                    style={{ color: '#111827' }}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold bg-white hover:border-gray-300 transition-all"
                  >
                    {cylOptions.map((cyl) => (
                      <option key={cyl} value={cyl} style={{ color: '#111827' }}>
                        {cyl}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">AXIS</label>
                  <select
                    value={prescription.rightEye.axis}
                    onChange={(e) => {
                      const newAxis = e.target.value;
                      setPrescription({
                        ...prescription,
                        rightEye: { ...prescription.rightEye, axis: newAxis },
                      });
                      if (newAxis !== "--") {
                        setRightAxisAngle(parseInt(newAxis) || 0);
                      }
                    }}
                    style={{ color: '#111827' }}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold bg-white pr-10 hover:border-gray-300 transition-all"
                  >
                    {axisOptions.map((axis) => (
                      <option key={axis} value={axis} style={{ color: '#111827' }}>
                        {axis}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAxisGuide(!showAxisGuide)}
                    className="absolute right-2 top-9 text-[#0066CC] hover:text-[#0052A3] transition-colors"
                    aria-label="Axis guide"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Left Eye OS */}
            <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-white border-2 border-blue-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm"></div>
                <h3 className="font-bold text-gray-900 text-lg">Left Eye OS</h3>
                <button
                  type="button"
                  className="ml-auto text-blue-500 hover:text-blue-700 transition-colors"
                  aria-label="What is OS?"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">SPH</label>
                  <select
                    value={prescription.leftEye.sph}
                    onChange={(e) =>
                      setPrescription({
                        ...prescription,
                        leftEye: { ...prescription.leftEye, sph: e.target.value },
                      })
                    }
                    style={{ color: '#111827' }}
                    className={`w-full px-3 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold transition-all bg-white ${
                      prescription.leftEye.sph !== "--"
                        ? "border-[#0066CC] shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <option value="--">--</option>
                    {sphOptions.map((sph) => (
                      <option key={sph} value={sph} style={{ color: '#111827' }}>
                        {sph}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">CYL</label>
                  <select
                    value={prescription.leftEye.cyl}
                    onChange={(e) =>
                      setPrescription({
                        ...prescription,
                        leftEye: { ...prescription.leftEye, cyl: e.target.value },
                      })
                    }
                    style={{ color: '#111827' }}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold bg-white hover:border-gray-300 transition-all"
                  >
                    {cylOptions.map((cyl) => (
                      <option key={cyl} value={cyl} style={{ color: '#111827' }}>
                        {cyl}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">AXIS</label>
                  <select
                    value={prescription.leftEye.axis}
                    onChange={(e) => {
                      const newAxis = e.target.value;
                      setPrescription({
                        ...prescription,
                        leftEye: { ...prescription.leftEye, axis: newAxis },
                      });
                      if (newAxis !== "--") {
                        setRightAxisAngle(parseInt(newAxis) || 0);
                      }
                    }}
                    style={{ color: '#111827' }}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold bg-white pr-10 hover:border-gray-300 transition-all"
                  >
                    {axisOptions.map((axis) => (
                      <option key={axis} value={axis} style={{ color: '#111827' }}>
                        {axis}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAxisGuide(!showAxisGuide)}
                    className="absolute right-2 top-9 text-[#0066CC] hover:text-[#0052A3] transition-colors"
                    aria-label="Axis guide"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Copy Right to Left Button */}
          <div className="mb-6 mt-6">
            <button
              type="button"
              onClick={handleCopyRightToLeft}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Copy Right to Left</span>
            </button>
          </div>

          {/* Show Axis Diagram Button */}
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

          {/* Axis Diagrams - Two Separate */}
          {showAxisGuide && (
            <div className="mt-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200" style={{ overflow: 'visible', width: '100%' }}>
                <div className="text-center mb-3">
                  <h3 className="text-base font-semibold text-gray-800 mb-2">Axis Measurements</h3>
                  <div className="flex justify-center items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs font-medium text-purple-600 mb-1">Right Eye (OD)</div>
                      <div className="text-lg font-bold text-gray-800">{prescription.rightEye.axis !== "--" ? prescription.rightEye.axis : "0"}°</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-600 mb-1">Left Eye (OS)</div>
                      <div className="text-lg font-bold text-gray-800">{prescription.leftEye.axis !== "--" ? intToTabo(parseInt(prescription.leftEye.axis)) : "0"}°</div>
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
                              <marker id="arrowhead-right" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto">
                                <polygon points="0 0, 14 7, 0 14" fill="#2563eb" />
                              </marker>
                            </defs>
                            <rect width="800" height="500" fill="white" />
                            {/* Semi-circle arc from 0 to 180 */}
                            <path d="M 620 420 A 220 220 0 0 0 180 420" fill="none" stroke="#000" strokeWidth="3" />
                            
                            {/* Minor tick marks (every degree) */}
                            {Array.from({ length: 181 }, (_, i) => i).map((deg) => {
                              if (deg % 10 === 0) return null; // Skip major marks
                              const angle = (deg - 90) * (Math.PI / 180);
                              const x1 = 400 + 210 * Math.cos(angle);
                              const y1 = 420 + 210 * Math.sin(angle);
                              const x2 = 400 + 220 * Math.cos(angle);
                              const y2 = 420 + 220 * Math.sin(angle);
                              return (
                                <line key={`minor-${deg}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ccc" strokeWidth="0.8" />
                              );
                            })}
                            
                            {/* Major tick marks and labels (every 10 degrees) */}
                            {Array.from({ length: 181 }, (_, i) => i).map((deg) => {
                              if (deg % 10 !== 0) return null;
                              const angle = (deg - 90) * (Math.PI / 180);
                              const x = 400 + 220 * Math.cos(angle);
                              const y = 420 + 220 * Math.sin(angle);
                              const textX = 400 + 180 * Math.cos(angle);
                              const textY = 420 + 180 * Math.sin(angle);
                              // Calculate rotation to align text horizontally along the curve
                              // For horizontal alignment, rotate by (deg - 90) to make text parallel to the arc
                              const textRotation = deg - 90;
                              return (
                                <g key={deg}>
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
                                  {deg < 180 && deg % 30 === 0 && (
                                    <text 
                                      x={400 + 180 * Math.cos((180 - deg - 90) * (Math.PI / 180))} 
                                      y={420 + 180 * Math.sin((180 - deg - 90) * (Math.PI / 180))} 
                                      textAnchor="middle" 
                                      dominantBaseline="middle" 
                                      fontSize="18" 
                                      fill="#444" 
                                      fontWeight="600" 
                                      fontFamily="Arial, sans-serif"
                                      transform={`rotate(${90 - deg}, ${400 + 180 * Math.cos((180 - deg - 90) * (Math.PI / 180))}, ${420 + 180 * Math.sin((180 - deg - 90) * (Math.PI / 180))})`}
                                    >
                                      {180 - deg}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                            {/* Arrow for right eye */}
                            <line 
                              x1="400" 
                              y1="420" 
                              x2={400 + 220 * Math.cos((rightAxisAngle - 90) * (Math.PI / 180))} 
                              y2={420 + 220 * Math.sin((rightAxisAngle - 90) * (Math.PI / 180))} 
                              stroke="#2563eb" 
                              strokeWidth="6" 
                              markerEnd="url(#arrowhead-right)" 
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
                                let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
                                if (angle < 0) angle += 360;
                                angle = Math.round(angle);
                                if (angle > 180) angle = 180;
                                setRightAxisAngle(angle);
                                setPrescription({
                                  ...prescription,
                                  rightEye: {
                                    ...prescription.rightEye,
                                    axis: angle.toString(),
                                  },
                                });
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
                              <marker id="arrowhead-left" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto">
                                <polygon points="0 0, 14 7, 0 14" fill="#2563eb" />
                              </marker>
                            </defs>
                            <rect width="800" height="500" fill="white" />
                            {/* Semi-circle arc from 0 to 180 */}
                            <path d="M 620 420 A 220 220 0 0 0 180 420" fill="none" stroke="#000" strokeWidth="3" />
                            
                            {/* Minor tick marks (every degree) */}
                            {Array.from({ length: 181 }, (_, i) => i).map((deg) => {
                              if (deg % 10 === 0) return null; // Skip major marks
                              const angle = (deg - 90) * (Math.PI / 180);
                              const x1 = 400 + 210 * Math.cos(angle);
                              const y1 = 420 + 210 * Math.sin(angle);
                              const x2 = 400 + 220 * Math.cos(angle);
                              const y2 = 420 + 220 * Math.sin(angle);
                              return (
                                <line key={`minor-left-${deg}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ccc" strokeWidth="0.8" />
                              );
                            })}
                            
                            {/* Major tick marks and labels with TABO notation */}
                            {Array.from({ length: 181 }, (_, i) => i).map((deg) => {
                              if (deg % 10 !== 0) return null;
                              const angle = (deg - 90) * (Math.PI / 180);
                              const taboValue = intToTabo(deg);
                              const x = 400 + 220 * Math.cos(angle);
                              const y = 420 + 220 * Math.sin(angle);
                              const textX = 400 + 180 * Math.cos(angle);
                              const textY = 420 + 180 * Math.sin(angle);
                              // Calculate rotation to align text horizontally along the curve
                              // For horizontal alignment, rotate by (deg - 90) to make text parallel to the arc
                              const textRotation = deg - 90;
                              return (
                                <g key={deg}>
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
                                  {deg < 180 && deg % 30 === 0 && (
                                    <text 
                                      x={400 + 180 * Math.cos((180 - deg - 90) * (Math.PI / 180))} 
                                      y={420 + 180 * Math.sin((180 - deg - 90) * (Math.PI / 180))} 
                                      textAnchor="middle" 
                                      dominantBaseline="middle" 
                                      fontSize="18" 
                                      fill="#444" 
                                      fontWeight="600" 
                                      fontFamily="Arial, sans-serif"
                                      transform={`rotate(${90 - deg}, ${400 + 180 * Math.cos((180 - deg - 90) * (Math.PI / 180))}, ${420 + 180 * Math.sin((180 - deg - 90) * (Math.PI / 180))})`}
                                    >
                                      {taboValue}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                            {/* Arrow for left eye - convert INT to display angle */}
                            <line 
                              x1="400" 
                              y1="420" 
                              x2={400 + 220 * Math.cos((leftAxisAngle - 90) * (Math.PI / 180))} 
                              y2={420 + 220 * Math.sin((leftAxisAngle - 90) * (Math.PI / 180))} 
                              stroke="#2563eb" 
                              strokeWidth="6" 
                              markerEnd="url(#arrowhead-left)" 
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
                                let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
                                if (angle < 0) angle += 360;
                                angle = Math.round(angle);
                                if (angle > 180) angle = 180;
                                // Store as INT, but display TABO
                                setLeftAxisAngle(angle);
                                setPrescription({
                                  ...prescription,
                                  leftEye: {
                                    ...prescription.leftEye,
                                    axis: angle.toString(),
                                  },
                                });
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
                  
                  {/* Prescription Table */}
                  <div className="mt-4 overflow-x-auto">
                    <div className="min-w-full">
                      <table className="w-full border-collapse border-2 border-gray-300 text-base table-auto">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                            <th className="border-2 border-gray-300 px-4 py-3 text-left font-bold text-gray-800 text-sm w-[25%]"></th>
                            <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-gray-800 text-sm w-[25%]">Sphere</th>
                            <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-gray-800 text-sm w-[25%]">Cylinder</th>
                            <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-gray-800 text-sm w-[25%]">Axis<span className="block text-xs font-normal text-blue-600 mt-1">(Left: TABO)</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-blue-50 transition-colors">
                            <td className="border-2 border-gray-300 px-4 py-3 font-bold text-blue-700 text-sm">Right Eye</td>
                            <td className="border-2 border-gray-300 px-4 py-3 text-center">
                              <input 
                                inputMode="decimal" 
                                className="w-full text-center text-blue-700 font-semibold text-sm border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg px-3 py-2 transition-all" 
                                placeholder="0,00" 
                                type="text" 
                                value={prescription.rightEye.sph !== "--" ? prescription.rightEye.sph : ""}
                                onChange={(e) => setPrescription({
                                  ...prescription,
                                  rightEye: { ...prescription.rightEye, sph: e.target.value },
                                })}
                              />
                            </td>
                            <td className="border-2 border-gray-300 px-4 py-3 text-center">
                              <input 
                                inputMode="decimal" 
                                className="w-full text-center text-blue-700 font-semibold text-sm border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg px-3 py-2 transition-all" 
                                placeholder="0,00" 
                                type="text" 
                                value={prescription.rightEye.cyl !== "--" ? prescription.rightEye.cyl : ""}
                                onChange={(e) => setPrescription({
                                  ...prescription,
                                  rightEye: { ...prescription.rightEye, cyl: e.target.value },
                                })}
                              />
                            </td>
                            <td className="border-2 border-gray-300 px-4 py-3 text-center">
                              <input 
                                inputMode="numeric" 
                                min="0" 
                                max="180" 
                                step="1" 
                                className="w-full text-center text-blue-700 font-bold text-sm border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg px-3 py-2 transition-all" 
                                placeholder="--" 
                                type="number" 
                                value={prescription.rightEye.axis !== "--" ? prescription.rightEye.axis : ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPrescription({
                                    ...prescription,
                                    rightEye: { ...prescription.rightEye, axis: val || "--" },
                                  });
                                  if (val) setRightAxisAngle(parseInt(val) || 0);
                                }}
                              />
                            </td>
                          </tr>
                          <tr className="hover:bg-blue-50 transition-colors">
                            <td className="border-2 border-gray-300 px-4 py-3 font-bold text-blue-700 text-sm">Left Eye</td>
                            <td className="border-2 border-gray-300 px-4 py-3 text-center">
                              <input 
                                inputMode="decimal" 
                                className="w-full text-center text-blue-700 font-semibold text-sm border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg px-3 py-2 transition-all" 
                                placeholder="0,00" 
                                type="text" 
                                value={prescription.leftEye.sph !== "--" ? prescription.leftEye.sph : ""}
                                onChange={(e) => setPrescription({
                                  ...prescription,
                                  leftEye: { ...prescription.leftEye, sph: e.target.value },
                                })}
                              />
                            </td>
                            <td className="border-2 border-gray-300 px-4 py-3 text-center">
                              <input 
                                inputMode="decimal" 
                                className="w-full text-center text-blue-700 font-semibold text-sm border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg px-3 py-2 transition-all" 
                                placeholder="0,00" 
                                type="text" 
                                value={prescription.leftEye.cyl !== "--" ? prescription.leftEye.cyl : ""}
                                onChange={(e) => setPrescription({
                                  ...prescription,
                                  leftEye: { ...prescription.leftEye, cyl: e.target.value },
                                })}
                              />
                            </td>
                            <td className="border-2 border-gray-300 px-4 py-3 text-center">
                              <div className="relative">
                                <input 
                                  inputMode="numeric" 
                                  min="0" 
                                  max="180" 
                                  step="1" 
                                  className="w-full text-center text-blue-700 font-bold text-sm border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg px-3 py-2 pr-12 transition-all" 
                                  placeholder="--" 
                                  type="number" 
                                  value={prescription.leftEye.axis !== "--" ? intToTabo(parseInt(prescription.leftEye.axis)) : ""}
                                  onChange={(e) => {
                                    const taboVal = e.target.value;
                                    if (taboVal) {
                                      const intVal = taboToInt(parseInt(taboVal));
                                      setPrescription({
                                        ...prescription,
                                        leftEye: { ...prescription.leftEye, axis: intVal.toString() },
                                      });
                                      setLeftAxisAngle(intVal);
                                    } else {
                                      setPrescription({
                                        ...prescription,
                                        leftEye: { ...prescription.leftEye, axis: "--" },
                                      });
                                    }
                                  }}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-bold whitespace-nowrap pointer-events-none bg-blue-50 px-2 py-1 rounded">TABO</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Standalone version (for non-triple structure)
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
        <h2 className="text-xl font-bold text-gray-900">{lensTypeName}</h2>
        <div className="ml-auto">
          <a
            href="#"
            className="text-sm text-[#0066CC] hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Need help? Contact Customer Support
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Same content as triple structure version */}
          {/* Pupillary Distance */}
          <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100 shadow-sm">
            <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-[#0066CC] to-blue-600 rounded-full"></span>
              Pupillary Distance (PD)
              <button
                type="button"
                className="ml-auto text-[#0066CC] hover:text-blue-700 transition-colors"
                aria-label="What is PD?"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            </label>
            <select
              value={prescription.pd}
              onChange={(e) => setPrescription({ ...prescription, pd: e.target.value })}
              style={{ color: '#111827' }}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] font-semibold bg-white shadow-sm hover:border-gray-300 transition-all"
            >
              {pdOptions.map((pd) => (
                <option key={pd} value={pd} style={{ color: '#111827' }}>
                  {pd} mm
                </option>
              ))}
            </select>
          </div>

          {/* Eyes Prescription - Same as triple structure version */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Right Eye OD */}
            <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-white border-2 border-[#0066CC]/30 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-4 h-4 rounded-full bg-[#0066CC] shadow-sm"></div>
                <h3 className="font-bold text-gray-900 text-lg">Right Eye OD</h3>
                <button
                  type="button"
                  className="ml-auto text-[#0066CC] hover:text-[#0052A3] transition-colors"
                  aria-label="What is OD?"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">SPH</label>
                  <select
                    value={prescription.rightEye.sph}
                    onChange={(e) =>
                      setPrescription({
                        ...prescription,
                        rightEye: { ...prescription.rightEye, sph: e.target.value },
                      })
                    }
                    style={{ color: '#111827' }}
                    className={`w-full px-3 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold transition-all bg-white ${
                      prescription.rightEye.sph !== "--"
                        ? "border-[#0066CC] shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <option value="--">--</option>
                    {sphOptions.map((sph) => (
                      <option key={sph} value={sph} style={{ color: '#111827' }}>
                        {sph}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">CYL</label>
                  <select
                    value={prescription.rightEye.cyl}
                    onChange={(e) =>
                      setPrescription({
                        ...prescription,
                        rightEye: { ...prescription.rightEye, cyl: e.target.value },
                      })
                    }
                    style={{ color: '#111827' }}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold bg-white hover:border-gray-300 transition-all"
                  >
                    {cylOptions.map((cyl) => (
                      <option key={cyl} value={cyl} style={{ color: '#111827' }}>
                        {cyl}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">AXIS</label>
                  <select
                    value={prescription.rightEye.axis}
                    onChange={(e) => {
                      const newAxis = e.target.value;
                      setPrescription({
                        ...prescription,
                        rightEye: { ...prescription.rightEye, axis: newAxis },
                      });
                      if (newAxis !== "--") {
                        setRightAxisAngle(parseInt(newAxis) || 0);
                      }
                    }}
                    style={{ color: '#111827' }}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold bg-white pr-10 hover:border-gray-300 transition-all"
                  >
                    {axisOptions.map((axis) => (
                      <option key={axis} value={axis} style={{ color: '#111827' }}>
                        {axis}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAxisGuide(!showAxisGuide)}
                    className="absolute right-2 top-9 text-[#0066CC] hover:text-[#0052A3] transition-colors"
                    aria-label="Axis guide"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Left Eye OS */}
            <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-white border-2 border-blue-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm"></div>
                <h3 className="font-bold text-gray-900 text-lg">Left Eye OS</h3>
                <button
                  type="button"
                  className="ml-auto text-blue-500 hover:text-blue-700 transition-colors"
                  aria-label="What is OS?"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">SPH</label>
                  <select
                    value={prescription.leftEye.sph}
                    onChange={(e) =>
                      setPrescription({
                        ...prescription,
                        leftEye: { ...prescription.leftEye, sph: e.target.value },
                      })
                    }
                    style={{ color: '#111827' }}
                    className={`w-full px-3 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold transition-all bg-white ${
                      prescription.leftEye.sph !== "--"
                        ? "border-[#0066CC] shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <option value="--">--</option>
                    {sphOptions.map((sph) => (
                      <option key={sph} value={sph} style={{ color: '#111827' }}>
                        {sph}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">CYL</label>
                  <select
                    value={prescription.leftEye.cyl}
                    onChange={(e) =>
                      setPrescription({
                        ...prescription,
                        leftEye: { ...prescription.leftEye, cyl: e.target.value },
                      })
                    }
                    style={{ color: '#111827' }}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold bg-white hover:border-gray-300 transition-all"
                  >
                    {cylOptions.map((cyl) => (
                      <option key={cyl} value={cyl} style={{ color: '#111827' }}>
                        {cyl}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">AXIS</label>
                  <select
                    value={prescription.leftEye.axis}
                    onChange={(e) => {
                      const newAxis = e.target.value;
                      setPrescription({
                        ...prescription,
                        leftEye: { ...prescription.leftEye, axis: newAxis },
                      });
                      if (newAxis !== "--") {
                        setRightAxisAngle(parseInt(newAxis) || 0);
                      }
                    }}
                    style={{ color: '#111827' }}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm font-semibold bg-white pr-10 hover:border-gray-300 transition-all"
                  >
                    {axisOptions.map((axis) => (
                      <option key={axis} value={axis} style={{ color: '#111827' }}>
                        {axis}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAxisGuide(!showAxisGuide)}
                    className="absolute right-2 top-9 text-[#0066CC] hover:text-[#0052A3] transition-colors"
                    aria-label="Axis guide"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Copy Right to Left Button */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={handleCopyRightToLeft}
              className="bg-gradient-to-r from-[#0066CC] via-[#0052A3] to-[#0066CC] text-white border-0 hover:from-[#0052A3] hover:via-[#003d7a] hover:to-[#0052A3] shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Copy Right to Left
            </Button>
          </div>

          {/* Axis Measurement Guide - Same as triple structure version */}
          <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-5 shadow-md">
            <button
              type="button"
              onClick={() => setShowAxisGuide(!showAxisGuide)}
              className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  showAxisGuide ? "bg-[#0066CC] border-[#0066CC] shadow-md" : "border-gray-300 bg-white"
                }`}>
                  {showAxisGuide && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-base">Axis Measurement Guide</p>
                  <p className="text-xs text-gray-600 font-medium">For Customer Support</p>
                </div>
              </div>
              <svg
                className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${
                  showAxisGuide ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showAxisGuide && (
              <div className="mt-5 pt-5 border-t border-gray-200">
                <div className="flex flex-col items-center gap-5">
                  <div className="bg-gradient-to-r from-[#0066CC] to-blue-600 text-white px-6 py-2 rounded-full shadow-md">
                    <p className="text-base font-bold">
                      Current Axis: {prescription.leftEye.axis !== "--" ? prescription.leftEye.axis : prescription.rightEye.axis !== "--" ? prescription.rightEye.axis : "0"}°
                    </p>
                  </div>
                  <div className="relative w-[400px] h-[400px] bg-white rounded-full shadow-2xl border-2 border-gray-300">
                    <svg viewBox="0 0 400 400" className="w-full h-full">
                      <defs>
                        <marker id="arrowhead-red-standalone" markerWidth="16" markerHeight="16" refX="12" refY="4" orient="auto">
                          <polygon points="0 0, 16 4, 0 8" fill="#ef4444" />
                        </marker>
                        <marker id="arrowhead-red-shadow-standalone" markerWidth="16" markerHeight="16" refX="12" refY="4" orient="auto">
                          <polygon points="0 0, 16 4, 0 8" fill="#dc2626" />
                        </marker>
                        <radialGradient id="centerGradientStandalone" cx="50%" cy="50%">
                          <stop offset="0%" stopColor="#fecaca" stopOpacity="0.4" />
                          <stop offset="50%" stopColor="#fee2e2" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#fee2e2" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <circle cx="200" cy="200" r="180" fill="white" stroke="#d1d5db" strokeWidth="2" />
                      <circle cx="200" cy="200" r="180" fill="url(#centerGradientStandalone)" />
                      {Array.from({ length: 181 }, (_, i) => i).map((deg) => {
                        const angle = (deg - 90) * (Math.PI / 180);
                        const isMajor = deg % 10 === 0;
                        const isMinor = deg % 5 === 0;
                        if (!isMinor) return null;
                        const outerRadius = 180;
                        const innerRadius = isMajor ? 165 : 170;
                        const x1 = 200 + innerRadius * Math.cos(angle);
                        const y1 = 200 + innerRadius * Math.sin(angle);
                        const x2 = 200 + outerRadius * Math.cos(angle);
                        const y2 = 200 + outerRadius * Math.sin(angle);
                        const textX = 200 + 150 * Math.cos(angle);
                        const textY = 200 + 150 * Math.sin(angle);
                        // Rotate text to be horizontal along the arc (deg - 90)
                        const textRotation = deg - 90;
                        return (
                          <g key={deg}>
                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isMajor ? "#111827" : "#6b7280"} strokeWidth={isMajor ? "2" : "1"} />
                            {isMajor && (
                              <text 
                                x={textX} 
                                y={textY} 
                                textAnchor="middle" 
                                dominantBaseline="middle" 
                                fill="#111827" 
                                fontSize="14" 
                                fontWeight="bold" 
                                fontFamily="system-ui, -apple-system, sans-serif"
                                transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                              >
                                {deg}
                              </text>
                            )}
                          </g>
                        );
                      })}
                      <g>
                        <line x1="200" y1="200" x2={200 + 140 * Math.cos((rightAxisAngle - 90) * (Math.PI / 180))} y2={200 + 140 * Math.sin((rightAxisAngle - 90) * (Math.PI / 180))} stroke="#dc2626" strokeWidth="6" opacity="0.4" markerEnd="url(#arrowhead-red-shadow-standalone)" />
                        <line x1="200" y1="200" x2={200 + 140 * Math.cos((rightAxisAngle - 90) * (Math.PI / 180))} y2={200 + 140 * Math.sin((rightAxisAngle - 90) * (Math.PI / 180))} stroke="#ef4444" strokeWidth="5" markerEnd="url(#arrowhead-red-standalone)" />
                      </g>
                      <circle cx="200" cy="200" r="8" fill="#ef4444" />
                      <circle cx="200" cy="200" r="4" fill="white" />
                      <text x="200" y="200" textAnchor="middle" dominantBaseline="middle" fill="#374151" fontSize="18" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">
                        {prescription.leftEye.axis !== "--" ? "Left Eye" : prescription.rightEye.axis !== "--" ? "Right Eye" : "Select Eye"}
                      </text>
                    </svg>
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
                          let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
                          if (angle < 0) angle += 360;
                          angle = Math.round(angle);
                          if (angle > 180) angle = 180;
                          setRightAxisAngle(angle);
                          setPrescription({
                            ...prescription,
                            rightEye: {
                              ...prescription.rightEye,
                              axis: angle.toString(),
                            },
                          });
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
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 max-w-md">
                    <p className="text-sm text-gray-700 text-center font-medium">
                      <span className="font-bold text-[#0066CC]">💡 Tip:</span> Drag the red arrow around the circle or use the dropdown above to set the axis angle. The axis ranges from <span className="font-bold">0° to 180°</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
