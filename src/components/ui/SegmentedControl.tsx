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
        'inline-flex p-1 bg-[#edf4fb] dark:bg-[#142237] border border-[#dce7f4] dark:border-[#34465e] rounded-2xl select-none',
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
              'relative flex items-center justify-center gap-1.5 font-medium rounded-xl transition-all duration-200 text-xs sm:text-sm cursor-pointer',
              size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2',
              isSelected
                ? 'bg-white dark:bg-[#1d304a] text-[#1677df] dark:text-[#78bbff] shadow-xs border border-[#dce8f5] dark:border-[#3b5675] font-semibold'
                : 'text-[#53667a] dark:text-[#a4b5ce] hover:text-[#1677df] dark:hover:text-white border border-transparent'
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
