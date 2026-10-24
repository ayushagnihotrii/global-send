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
            className="block text-xs font-semibold text-[#33465d] dark:text-[#c1d5ec] mb-1.5 ml-0.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-[#68788c] dark:text-[#8bb5dc] pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-[#fbfdff] dark:bg-[#142237] text-[#0f172b] dark:text-[#e9f1fc] placeholder:text-[#8292a7] dark:placeholder:text-[#62748e] rounded-xl px-4 py-2.5 text-sm transition-all duration-200 border border-[#dfe8f3] dark:border-[#344b65] focus:border-[#1677df] dark:focus:border-[#60a5fa] focus:bg-white dark:focus:bg-[#17263b] focus:outline-none focus:ring-3 focus:ring-[#1677df]/12',
              icon && 'pl-10',
              error && 'border-[#e11d48] focus:border-[#e11d48] focus:ring-[#e11d48]/15',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-[#e11d48] mt-1 ml-1 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
