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
            className="block text-[13px] font-medium text-[#3c3c43] dark:text-[#ebebf5]/80 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-[#8e8e93] dark:text-[#8e8e93] pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-[#767680]/[0.08] dark:bg-[#767680]/[0.24] text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#8e8e93] dark:placeholder:text-[#636366] rounded-[10px] px-3.5 py-2.25 text-[15px] leading-snug transition-all duration-150 border border-transparent focus:border-[#007aff] dark:focus:border-[#0a84ff] focus:bg-white dark:focus:bg-[#1c1c1e] focus:outline-none focus:ring-3 focus:ring-[#007aff]/15 dark:focus:ring-[#0a84ff]/20',
              icon && 'pl-9.5',
              error && 'border-[#ff3b30] focus:border-[#ff3b30] focus:ring-[#ff3b30]/15',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[12px] text-[#ff3b30] dark:text-[#ff453a] mt-1 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
