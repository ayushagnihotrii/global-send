'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config/site';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export function SplashScreen({ onFinish, durationMs = 1000 }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Hold on screen for the requested duration (1 sec)
    const timer = setTimeout(() => {
      setIsFadingOut(true);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs]);

  useEffect(() => {
    if (isFadingOut) {
      // Allow 350ms for smooth crossfade out before unmounting
      const fadeTimer = setTimeout(() => {
        onFinish?.();
      }, 350);
      return () => clearTimeout(fadeTimer);
    }
  }, [isFadingOut, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b1422] text-white transition-all duration-350 ease-out select-none ${
        isFadingOut ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle iridescent background aura matching the Quick Share sky/cobalt palette */}
      <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-[#0875da]/25 via-[#249df1]/20 to-[#6366f1]/20 blur-3xl pointer-events-none animate-pulse" />

      {/* Centered Logo Container with dynamic entry */}
      <div className="relative flex flex-col items-center">
        <div className="relative group">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-[#0875da]/40 via-[#249df1]/40 to-[#6366f1]/35 blur-lg opacity-80 animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-2xl border border-[#34465e] bg-[#142033]/80 backdrop-blur-xl transition-transform transform active:scale-95">
            <Image
              src="/logo.png"
              alt={SITE_CONFIG.name}
              width={112}
              height={112}
              priority
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <h1 className="mt-5 text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
          {SITE_CONFIG.name}
        </h1>
        <p className="mt-1 text-xs text-[#9cb1ca] tracking-wide font-medium">
          {SITE_CONFIG.tagline}
        </p>

        {/* 1-second Progress Bar Indicator */}
        <div className="w-32 h-1.5 bg-[#1b2b42] rounded-full mt-6 overflow-hidden border border-[#2c3e57]">
          <div
            className="h-full bg-gradient-to-r from-[#0875da] via-[#249df1] to-[#6366f1] rounded-full transition-all ease-linear"
            style={{
              width: isFadingOut ? '100%' : '100%',
              transitionDuration: `${durationMs}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
