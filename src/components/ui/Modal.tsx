'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* iOS Dimming Backdrop */}
      <div
        className="fixed inset-0 bg-black/35 dark:bg-black/60 backdrop-blur-[6px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* iOS Sheet / Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-white dark:bg-[#1c1c1e] rounded-[20px] ios-sheet-shadow border border-black/[0.08] dark:border-white/[0.12] overflow-hidden z-10 animate-ios-sheet flex flex-col max-h-[90vh]',
          maxWidthClasses[maxWidth]
        )}
      >
        {/* Subtle iOS Grabber Indicator (visible on small screens) */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5">
          <div className="w-9 h-1 rounded-full bg-black/15 dark:bg-white/20" />
        </div>

        {/* Sheet Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.07] dark:border-white/[0.09]">
            <div className="min-w-0">
              {title && (
                <h3 className="text-[16px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-[-0.015em] truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[12px] text-[#8e8e93] mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-[#767680]/[0.12] dark:bg-[#767680]/[0.28] text-[#6c6c70] dark:text-[#ebebf5]/70 hover:text-[#1c1c1e] dark:hover:text-white transition-colors cursor-pointer shrink-0 ml-3"
                aria-label="Close dialog"
              >
                <X className="w-3.5 h-3.5 stroke-[2.25]" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
