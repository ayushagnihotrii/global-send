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
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

  const variantClasses = {
    primary: 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm',
    secondary: 'bg-[#e5e5ea] hover:bg-[#d1d1d6] text-[#1d1d1f] dark:bg-[#2c2c2e] dark:hover:bg-[#38383a] dark:text-white',
    outline: 'border border-[#d1d1d6] dark:border-[#38383a] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[#1d1d1f] dark:text-white',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[#1d1d1f] dark:text-white',
    destructive: 'bg-[#ff3b30] hover:bg-[#ff453a] text-white shadow-sm',
  };

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
    md: 'text-sm px-4 py-2 h-10 gap-2',
    lg: 'text-base px-6 py-3 h-12 gap-2.5',
    icon: 'w-9 h-9 p-0 rounded-full',
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
