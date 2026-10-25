'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config/site';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export function SplashScreen({ onFinish, durationMs = 700 }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs]);

  useEffect(() => {
    if (isFadingOut) {
      const fadeTimer = setTimeout(() => {
        onFinish?.();
      }, 280);
      return () => clearTimeout(fadeTimer);
    }
  }, [isFadingOut, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f2f2f7] dark:bg-[#000000] text-[#1c1c1e] dark:text-[#f5f5f7] transition-opacity duration-280 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center">
        <div className="w-20 h-20 rounded-[22%] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-black/[0.06] dark:border-white/[0.1] bg-white dark:bg-[#1c1c1e]">
          <Image
            src="/logo.png"
            alt={SITE_CONFIG.name}
            width={80}
            height={80}
            priority
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">
          {SITE_CONFIG.name}
        </h1>
        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
          {SITE_CONFIG.tagline}
        </p>
      </div>
    </div>
  );
}
