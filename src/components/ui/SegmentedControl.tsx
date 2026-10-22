'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex p-1 bg-[#e5e5ea]/70 dark:bg-[#2c2c2e] rounded-xl select-none',
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 text-xs sm:text-sm',
              size === 'sm' ? 'px-2.5 py-1' : 'px-3.5 py-1.5',
              isSelected
                ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white shadow-sm font-semibold'
                : 'text-[#86868b] dark:text-[#98989d] hover:text-[#1d1d1f] dark:hover:text-white'
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
