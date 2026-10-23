'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  withGlow?: boolean;
  priority?: boolean;
  alt?: string;
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

export function Logo({
  size = 'md',
  className,
  withGlow = false,
  priority = false,
  alt = 'Global Send Logo',
}: LogoProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 40;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0 select-none', className)}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {withGlow && (
        <div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-500/30 via-cyan-500/30 to-purple-500/30 blur-md opacity-70 pointer-events-none transition-opacity"
          aria-hidden="true"
        />
      )}
      <Image
        src="/logo.png"
        alt={alt}
        width={pixelSize}
        height={pixelSize}
        priority={priority}
        className="w-full h-full object-cover rounded-xl shadow-xs"
      />
    </div>
  );
}
