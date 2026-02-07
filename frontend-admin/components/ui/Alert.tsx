import React from 'react';

interface AlertProps {
  variant?: 'success' | 'error' | 'info' | 'warning';
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export default function Alert({ variant = 'info', children, onClose, className = '' }: AlertProps) {
  const variantClasses = {
    success: 'bg-success/20 border-success/50 text-white',
    error: 'bg-error/20 border-error/50 text-white',
    info: 'bg-primary/20 border-primary/50 text-white',
    warning: 'bg-warning/20 border-warning/50 text-white',
  };

  return (
    <div className={`glass border-2 rounded-lg p-4 ${variantClasses[variant]} flex items-center justify-between gap-3 ${className}`}>
      <span className="flex-1 font-medium text-sm">{children}</span>
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
