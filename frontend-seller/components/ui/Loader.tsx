'use client';

import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export default function Loader({ size = 'md', text, fullScreen = false }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-[#0066CC]/20 rounded-full`}></div>
        <div className={`${sizeClasses[size]} border-transparent border-t-[#0066CC] rounded-full animate-spin absolute inset-0`}></div>
      </div>
      {text && (
        <p className="text-gray-700 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      {spinner}
    </div>
  );
}






