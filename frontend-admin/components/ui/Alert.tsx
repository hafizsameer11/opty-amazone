import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AlertProps {
  variant?: 'success' | 'error' | 'info' | 'warning';
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export default function Alert({ variant = 'info', children, onClose, className = '' }: AlertProps) {
  const { t } = useLanguage();
  const variantClasses = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  };

  return (
    <div
      className={`border rounded-lg p-4 ${variantClasses[variant]} flex items-center justify-between gap-3 ${className}`}
    >
      <span className="flex-1 font-medium text-sm">{children}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current opacity-70 hover:opacity-100 transition-opacity font-bold text-lg leading-none"
          aria-label={t('close')}
        >
          ×
        </button>
      )}
    </div>
  );
}
