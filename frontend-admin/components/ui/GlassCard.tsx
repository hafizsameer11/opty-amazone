import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'strong';
}

export default function GlassCard({ children, className = '', variant = 'default' }: GlassCardProps) {
  const variantClasses = {
    default: 'glass-card',
    strong: 'glass-strong',
  };

  return (
    <div className={`${variantClasses[variant]} rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}
