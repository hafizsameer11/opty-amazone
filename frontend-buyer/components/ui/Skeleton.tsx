'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export default function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 rounded';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

export function OrderSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <Skeleton variant="text" width="200px" height="24px" className="mb-2" />
          <Skeleton variant="text" width="150px" height="16px" />
        </div>
        <div className="text-right">
          <Skeleton variant="text" width="100px" height="24px" className="mb-2" />
          <Skeleton variant="text" width="80px" height="16px" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton variant="text" width="150px" height="20px" className="mb-2" />
                <Skeleton variant="text" width="100px" height="16px" />
              </div>
              <div className="text-right">
                <Skeleton variant="text" width="80px" height="20px" className="mb-2" />
                <Skeleton variant="text" width="60px" height="16px" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Skeleton variant="text" width="150px" height="16px" className="mt-4" />
    </div>
  );
}




