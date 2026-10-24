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

  const addToast = useCallback((message: string, type: ToastType, duration = 2500) => {
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
      {/* Quick Share-inspired floating toast container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 pointer-events-none px-4 max-w-md w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-2xl shadow-[0_14px_38px_-12px_rgba(24,80,145,0.28)] border text-sm font-semibold transition-all duration-200 transform translate-y-0 scale-100 backdrop-blur-md',
              t.type === 'success' && 'bg-white/95 dark:bg-[#142033]/95 text-[#0f172b] dark:text-[#e9f1fc] border-[#cce9dc] dark:border-[#2e634c]',
              t.type === 'error' && 'bg-[#fff1f2]/95 dark:bg-[#3e2124]/95 text-[#be123c] dark:text-[#ffb9af] border-[#fecdd3] dark:border-[#7f2d36]',
              t.type === 'info' && 'bg-white/95 dark:bg-[#142033]/95 text-[#0f172b] dark:text-[#e9f1fc] border-[#dce7f4] dark:border-[#34465e]'
            )}
          >
            {t.type === 'success' && (
              <span className="w-6 h-6 rounded-full bg-[#ecfdf5] dark:bg-[#193b2d] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#34d399]" />
              </span>
            )}
            {t.type === 'error' && (
              <span className="w-6 h-6 rounded-full bg-[#ffe4e6] dark:bg-[#582229] flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-[#e11d48] dark:text-[#fb7185]" />
              </span>
            )}
            {t.type === 'info' && (
              <span className="w-6 h-6 rounded-full bg-[#eaf4ff] dark:bg-[#1d304a] flex items-center justify-center shrink-0">
                <Info className="w-4 h-4 text-[#1677df] dark:text-[#60a5fa]" />
              </span>
            )}
            <span className="truncate">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-1 text-[#74859d] hover:text-[#0f172b] dark:hover:text-white cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {/* Bottom glowing fuse accent line inspired by quick-share.app */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute bottom-0 inset-x-0 h-[2px]',
                t.type === 'success' && 'bg-gradient-to-r from-transparent via-[#10b981] to-transparent',
                t.type === 'error' && 'bg-gradient-to-r from-transparent via-[#f43f5e] to-transparent',
                t.type === 'info' && 'bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent'
              )}
            />
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
