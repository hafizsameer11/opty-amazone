'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Alert from './Alert';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
  title?: string;
  imageUrl?: string | null;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number, action?: Toast['action'], options?: Pick<Toast, 'title' | 'imageUrl'>) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000, action?: Toast['action'], options?: Pick<Toast, 'title' | 'imageUrl'>) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, type, message, duration, action, ...options };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-slide-in-right"
            style={{
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            <div className="flex items-start gap-2">
              {toast.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={toast.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              )}
              <div className="min-w-0 flex-1">
                {toast.title && <p className="mb-1 text-sm font-semibold text-gray-900">{toast.title}</p>}
                <Alert type={toast.type} message={toast.message} onClose={() => removeToast(toast.id)} />
              </div>
            </div>
            {toast.action && (
              <button
                type="button"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-[#0066CC] shadow-sm hover:bg-blue-50"
                onClick={async () => {
                  try {
                    await toast.action?.onClick();
                  } finally {
                    removeToast(toast.id);
                  }
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}














