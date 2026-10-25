'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (msg: string, duration?: number) => void;
    error: (msg: string, duration?: number) => void;
    info: (msg: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType, duration = 2400) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = Object.assign(
    (msg: string, type: ToastType = 'info') => addToast(msg, type),
    {
      success: (msg: string, dur?: number) => addToast(msg, 'success', dur),
      error: (msg: string, dur?: number) => addToast(msg, 'error', dur),
      info: (msg: string, dur?: number) => addToast(msg, 'info', dur),
    }
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* iOS HUD Pill Toast Container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none px-4 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full ios-material ios-sheet-shadow border border-black/[0.08] dark:border-white/[0.14] text-[13px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7] animate-ios-sheet'
            )}
          >
            {t.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-[#34c759] dark:text-[#30d158] shrink-0" />
            )}
            {t.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-[#ff3b30] dark:text-[#ff453a] shrink-0" />
            )}
            {t.type === 'info' && (
              <Info className="w-4 h-4 text-[#007aff] dark:text-[#0a84ff] shrink-0" />
            )}
            <span className="truncate">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-1 text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    ...context.toast,
    toast: context.toast,
  };
}
