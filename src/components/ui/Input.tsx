'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] dark:text-[#98989d] mb-1.5 ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-zinc-400 pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white placeholder:text-zinc-400 rounded-xl px-4 py-2.5 text-sm transition-all duration-150 border border-transparent focus:border-[#0071e3] focus:bg-white dark:focus:bg-[#1c1c1e] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20',
              icon && 'pl-10',
              error && 'border-[#ff3b30] focus:border-[#ff3b30] focus:ring-[#ff3b30]/20',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-[#ff3b30] mt-1 ml-1 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
