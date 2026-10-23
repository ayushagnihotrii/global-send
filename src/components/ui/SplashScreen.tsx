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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0e12] text-white transition-all duration-350 ease-out select-none ${
        isFadingOut ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle iridescent background aura matching the logo's gradient waves */}
      <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-orange-500/15 via-cyan-500/15 to-purple-500/15 blur-3xl pointer-events-none animate-pulse" />

      {/* Centered Logo Container with dynamic entry */}
      <div className="relative flex flex-col items-center">
        <div className="relative group">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-orange-500/30 via-cyan-400/30 to-purple-500/30 blur-lg opacity-75 animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/60 backdrop-blur-xl transition-transform transform active:scale-95">
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
        <p className="mt-1 text-xs text-[#98989d] tracking-wide font-medium">
          {SITE_CONFIG.tagline}
        </p>

        {/* 1-second Progress Bar Indicator */}
        <div className="w-32 h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 via-cyan-400 to-purple-400 rounded-full transition-all ease-linear"
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
