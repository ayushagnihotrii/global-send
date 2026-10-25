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
        'inline-flex p-[2px] bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-[9px] select-none',
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
              'relative flex-1 flex items-center justify-center gap-1.5 rounded-[7px] transition-all duration-150 cursor-pointer',
              size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3.5 py-1.5 text-[13px]',
              isSelected
                ? 'bg-white dark:bg-[#636366] text-[#1c1c1e] dark:text-white ios-segmented-thumb font-semibold'
                : 'text-[#6c6c70] dark:text-[#ebebf5]/70 hover:text-[#1c1c1e] dark:hover:text-white font-medium'
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
