'use client';

import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import Alert from './Alert';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
  title?: string;
  imageUrl?: string | null;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number, action?: ToastAction, options?: { title?: string; imageUrl?: string | null }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000, action?: ToastAction, options?: { title?: string; imageUrl?: string | null }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((current) => [...current, { id, type, message, action, ...options }]);
    if (duration > 0) {
      window.setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] w-full max-w-md space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto animate-slide-in-right">
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
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
