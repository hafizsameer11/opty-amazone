"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { LensAreaCoordinates } from '@/services/product-service';
import { getFullImageUrl } from '@/lib/image-utils';

interface LensAreaMarkerProps {
  imageUrl: string;
  productId: number;
  initialCoordinates?: LensAreaCoordinates;
  onSave: (coordinates: LensAreaCoordinates) => Promise<void>;
}

/**
 * Tool to mark lens areas on product images
 * Click and drag to mark the left and right lens areas
 */
export default function LensAreaMarker({
  imageUrl,
  productId,
  initialCoordinates,
  onSave,
}: LensAreaMarkerProps) {
  const [coordinates, setCoordinates] = useState<LensAreaCoordinates>(
    initialCoordinates || {
      left: { x: 27, y: 45, width: 20, height: 22, shape: 'ellipse', borderRadius: 50 },
      right: { x: 73, y: 45, width: 20, height: 22, shape: 'ellipse', borderRadius: 50 },
    }
  );
  const [activeLens, setActiveLens] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, lens: 'left' | 'right') => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setActiveLens(lens);
    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !activeLens || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const width = Math.abs(currentX - dragStart.x);
    const height = Math.abs(currentY - dragStart.y);
    const x = Math.min(currentX, dragStart.x);
    const y = Math.min(currentY, dragStart.y);
    
    setCoordinates(prev => ({
      ...prev,
      [activeLens]: {
        ...prev[activeLens],
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        width: Math.max(2, Math.min(50, width)),
        height: Math.max(2, Math.min(50, height)),
      },
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveLens(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(coordinates);
      alert('Lens area coordinates saved successfully!');
    } catch (error) {
      alert('Failed to save coordinates');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const getLensStyle = (lens: 'left' | 'right') => {
    const lensData = coordinates[lens];
    return {
      position: 'absolute' as const,
      left: `${lensData.x}%`,
      top: `${lensData.y}%`,
      width: `${lensData.width}%`,
      height: `${lensData.height}%`,
      transform: 'translate(-50%, -50%)',
      border: '2px dashed #0066CC',
      backgroundColor: 'rgba(0, 102, 204, 0.1)',
      cursor: 'move',
      borderRadius: lensData.shape === 'circle' ? '50%' : `${lensData.borderRadius || 50}%`,
    };
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Mark Lens Areas</h3>
        <p className="text-sm text-gray-600 mb-4">
          Click and drag on the image to mark the left and right lens areas. The overlay will use these coordinates for accurate placement.
        </p>
        
        <div
          ref={imageRef}
          className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100"
          style={{ aspectRatio: '1/1', maxWidth: '600px' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Image
            src={getFullImageUrl(imageUrl)}
            alt="Product image for marking"
            fill
            className="object-contain"
            unoptimized={getFullImageUrl(imageUrl).includes('localhost')}
          />
          
          {/* Left lens marker */}
          <div
            style={getLensStyle('left')}
            onMouseDown={(e) => handleMouseDown(e, 'left')}
          >
            <div className="absolute top-0 left-0 bg-[#0066CC] text-white text-xs px-2 py-1 rounded-br">
              Left Lens
            </div>
          </div>
          
          {/* Right lens marker */}
          <div
            style={getLensStyle('right')}
            onMouseDown={(e) => handleMouseDown(e, 'right')}
          >
            <div className="absolute top-0 left-0 bg-[#0066CC] text-white text-xs px-2 py-1 rounded-br">
              Right Lens
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Left Lens</h4>
              <div className="space-y-1">
                <div>X: {coordinates.left.x.toFixed(1)}%</div>
                <div>Y: {coordinates.left.y.toFixed(1)}%</div>
                <div>Width: {coordinates.left.width.toFixed(1)}%</div>
                <div>Height: {coordinates.left.height.toFixed(1)}%</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Right Lens</h4>
              <div className="space-y-1">
                <div>X: {coordinates.right.x.toFixed(1)}%</div>
                <div>Y: {coordinates.right.y.toFixed(1)}%</div>
                <div>Width: {coordinates.right.width.toFixed(1)}%</div>
                <div>Height: {coordinates.right.height.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Coordinates'}
            </button>
            <button
              onClick={() => setCoordinates(initialCoordinates || {
                left: { x: 27, y: 45, width: 20, height: 22, shape: 'ellipse', borderRadius: 50 },
                right: { x: 73, y: 45, width: 20, height: 22, shape: 'ellipse', borderRadius: 50 },
              })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

