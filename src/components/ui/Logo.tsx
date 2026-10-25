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
  sm: 30,
  md: 38,
  lg: 52,
  xl: 68,
};

export function Logo({
  size = 'md',
  className,
  priority = false,
  alt = 'Global Send Logo',
}: LogoProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 38;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 select-none rounded-[22%] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-black/[0.06] dark:border-white/[0.1]',
        className
      )}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <Image
        src="/logo.png"
        alt={alt}
        width={pixelSize}
        height={pixelSize}
        priority={priority}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
