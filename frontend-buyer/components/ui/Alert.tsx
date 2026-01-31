import React from 'react';

interface AlertProps {
  type?: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
}

export default function Alert({ type = 'info', message, onClose }: AlertProps) {
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${typeClasses[type]} flex items-center justify-between gap-3`}>
      <span className="flex-1 font-medium text-sm">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current opacity-70 hover:opacity-100 transition-opacity font-bold text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}
