'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

  const variantClasses = {
    primary: 'qs-primary-btn text-white',
    secondary: 'bg-[#eaf4ff] hover:bg-[#dbe9fa] text-[#1677df] border border-[#dbe9fa] dark:bg-[#1d304a] dark:hover:bg-[#243c5c] dark:text-[#78bbff] dark:border-[#344b65]',
    outline: 'border border-[#dce7f4] dark:border-[#34465e] bg-white/80 dark:bg-[#17263b]/80 hover:border-[#a7cdf6] dark:hover:border-[#4778ae] hover:bg-[#f0f7ff] dark:hover:bg-[#1e324d] text-[#263a50] dark:text-[#e9f1fc] shadow-2xs',
    ghost: 'hover:bg-[#edf5fd] dark:hover:bg-[#1e324d] text-[#53667a] hover:text-[#1677df] dark:text-[#a4b5ce] dark:hover:text-[#78bbff]',
    destructive: 'bg-[#e11d48] hover:bg-[#be123c] text-white shadow-sm shadow-rose-500/20',
  };

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-1.5 h-8.5 gap-1.5 rounded-xl',
    md: 'text-sm px-4.5 py-2.5 h-10.5 gap-2 rounded-xl',
    lg: 'text-base px-6 py-3 h-12 gap-2.5 rounded-2xl',
    icon: 'w-9 h-9 p-0 rounded-xl',
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}
