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
    'inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-all duration-150 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none select-none cursor-pointer';

  const variantClasses = {
    primary:
      'bg-[#007aff] hover:bg-[#0062cc] active:bg-[#0051a8] dark:bg-[#0a84ff] dark:hover:bg-[#409cff] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]',
    secondary:
      'bg-[#007aff]/10 hover:bg-[#007aff]/16 text-[#007aff] dark:bg-[#0a84ff]/16 dark:hover:bg-[#0a84ff]/24 dark:text-[#409cff]',
    outline:
      'border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#2c2c2e] hover:bg-[#f2f2f7] dark:hover:bg-[#3a3a3c] text-[#1c1c1e] dark:text-[#f5f5f7] shadow-[0_1px_1px_rgba(0,0,0,0.03)]',
    ghost:
      'hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#6c6c70] hover:text-[#1c1c1e] dark:text-[#98989d] dark:hover:text-[#f5f5f7]',
    destructive:
      'bg-[#ff3b30] hover:bg-[#e03025] dark:bg-[#ff453a] dark:hover:bg-[#ff6259] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]',
  };

  const sizeClasses = {
    sm: 'text-[13px] px-3 py-1.5 h-8 gap-1.5 rounded-[8px]',
    md: 'text-[14px] px-4 py-2 h-9.5 gap-2 rounded-[10px]',
    lg: 'text-[15px] font-semibold px-5 py-2.5 h-11 gap-2 rounded-[12px]',
    icon: 'w-8.5 h-8.5 p-0 rounded-[9px]',
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
