import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', size = 'md', children, className = '' }: BadgeProps) {
  const variantClasses = {
    success: 'bg-success/30 text-white border border-success/50',
    error: 'bg-error/30 text-white border border-error/50',
    warning: 'bg-warning/30 text-white border border-warning/50',
    info: 'bg-primary/30 text-white border border-primary/50',
    default: 'bg-white/20 text-white border border-white/30',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-semibold backdrop-blur-sm ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}
