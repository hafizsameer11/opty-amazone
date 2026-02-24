"use client";

import { LensColor, LensAreaCoordinates } from "@/services/product-service";
import Image from "next/image";
import { getFullImageUrl, isLocalhostImage } from "@/lib/image-utils";

interface LensColorOverlayProps {
  imageUrl: string;
  alt: string;
  selectedLensColor: LensColor | null;
  lensAreaCoordinates?: LensAreaCoordinates;
  className?: string;
}

export default function LensColorOverlay({
  imageUrl,
  alt,
  selectedLensColor,
  lensAreaCoordinates,
  className = "",
}: LensColorOverlayProps) {
  const fullImageUrl = getFullImageUrl(imageUrl);
  const shouldUnoptimize = isLocalhostImage(fullImageUrl);
  
  if (!selectedLensColor) {
    return (
      <div className="relative w-full h-full">
        <Image
          src={fullImageUrl}
          alt={alt}
          fill
          className={className}
          priority
          unoptimized={shouldUnoptimize}
        />
      </div>
    );
  }

  // Use precise coordinates if available, otherwise use default positioning
  const leftLens = lensAreaCoordinates?.left || {
    x: 27,
    y: 45,
    width: 20,
    height: 22,
    shape: 'ellipse',
    borderRadius: 50,
  };

  const rightLens = lensAreaCoordinates?.right || {
    x: 73, // 100 - 27 (mirror of left)
    y: 45,
    width: 20,
    height: 22,
    shape: 'ellipse',
    borderRadius: 50,
  };

  const getLensStyle = (lens: typeof leftLens, isRight: boolean = false) => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: 'none',
      left: `${lens.x}%`,
      top: `${lens.y}%`,
      width: `${lens.width}%`,
      height: `${lens.height}%`,
      transform: 'translate(-50%, -50%)',
      background: `radial-gradient(ellipse 75% 80% at center, ${selectedLensColor.color_code}EE 0%, ${selectedLensColor.color_code}CC 15%, ${selectedLensColor.color_code}AA 30%, ${selectedLensColor.color_code}88 45%, ${selectedLensColor.color_code}66 55%, transparent 75%)`,
      mixBlendMode: 'multiply',
      filter: 'blur(0.5px)',
    };

    // Apply shape-specific styling
    if (lens.shape === 'circle') {
      baseStyle.borderRadius = '50%';
      baseStyle.clipPath = 'circle(50% at center)';
    } else if (lens.shape === 'ellipse') {
      baseStyle.borderRadius = '50%';
      baseStyle.clipPath = 'ellipse(75% 80% at center)';
    } else {
      baseStyle.borderRadius = `${lens.borderRadius || 50}%`;
    }

    return baseStyle;
  };

  const getSecondaryLensStyle = (lens: typeof leftLens, isRight: boolean = false) => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: 'none',
      left: `${lens.x}%`,
      top: `${lens.y}%`,
      width: `${lens.width}%`,
      height: `${lens.height}%`,
      transform: 'translate(-50%, -50%)',
      background: `radial-gradient(ellipse 70% 75% at center, ${selectedLensColor.color_code}BB 0%, ${selectedLensColor.color_code}99 20%, ${selectedLensColor.color_code}77 35%, ${selectedLensColor.color_code}55 45%, transparent 65%)`,
      mixBlendMode: 'overlay',
      opacity: 0.4,
    };

    if (lens.shape === 'circle') {
      baseStyle.borderRadius = '50%';
      baseStyle.clipPath = 'circle(50% at center)';
    } else if (lens.shape === 'ellipse') {
      baseStyle.borderRadius = '50%';
      baseStyle.clipPath = 'ellipse(70% 75% at center)';
    } else {
      baseStyle.borderRadius = `${lens.borderRadius || 50}%`;
    }

    return baseStyle;
  };

  return (
    <div className="relative w-full h-full">
      {/* Base image */}
      <Image
        src={fullImageUrl}
        alt={alt}
        fill
        className={className}
        priority
        unoptimized={shouldUnoptimize}
      />
      
      {/* Left lens color overlay - using precise coordinates */}
      <div style={getLensStyle(leftLens, false)} />
      
      {/* Right lens color overlay - using precise coordinates */}
      <div style={getLensStyle(rightLens, true)} />
      
      {/* Additional subtle overlay for realistic lens tint effect - left */}
      <div style={getSecondaryLensStyle(leftLens, false)} />
      
      {/* Additional subtle overlay for realistic lens tint effect - right */}
      <div style={getSecondaryLensStyle(rightLens, true)} />
    </div>
  );
}

