'use client';

import { useEffect, ReactNode, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
}: ModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle mount/unmount with animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      // Small delay to ensure DOM is ready for animation
      setTimeout(() => {
        setIsClosing(false);
      }, 10);
    } else {
      setIsClosing(true);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 200); // Match the transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4',
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex h-full items-end justify-center p-0 sm:min-h-full sm:items-center sm:p-4">
        <div
          className={`relative flex max-h-[92dvh] w-full flex-col ${sizeClasses[size]} transform overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl transition-all duration-200 sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl ${
            isClosing ? 'translate-y-8 opacity-0 sm:scale-95 sm:translate-y-0' : 'translate-y-0 opacity-100 sm:scale-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5 sm:px-6 sm:py-4">
              <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
              {title && (
                <h2 className="min-w-0 truncate pr-3 text-lg font-bold text-gray-900 sm:text-xl">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-auto rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                  aria-label="Close modal"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

