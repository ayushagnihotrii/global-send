'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Square, X, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    desktopVault?: {
      isDesktop: boolean;
      platform: string;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      pickFiles: () => Promise<string[]>;
      getPathForFile: (file: File) => string;
      directUpload: (params: any) => Promise<any>;
      onUploadProgress: (
        callback: (data: {
          itemId: string;
          progress: number;
          uploadedBytes?: number;
          totalBytes?: number;
          speedBps?: number;
          etaSec?: number;
        }) => void
      ) => () => void;
    };
  }
}

export function DesktopTitlebar() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.desktopVault?.isDesktop) {
      setIsDesktop(true);
      window.desktopVault.isMaximized().then(setIsMaximized).catch(() => {});
    }
  }, []);

  if (!isDesktop) return null;

  const handleMinimize = () => {
    window.desktopVault?.minimize();
  };

  const handleMaximize = async () => {
    await window.desktopVault?.maximize();
    const max = await window.desktopVault?.isMaximized();
    setIsMaximized(!!max);
  };

  const handleClose = () => {
    window.desktopVault?.close();
  };

  return (
    <div
      className="w-full h-9 bg-[#121215] border-b border-white/5 flex items-center justify-between select-none z-[99999]"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: Branding & Encryption Badge */}
      <div className="flex items-center gap-2.5 px-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black tracking-wider text-white uppercase font-sans">
            GLOBAL SEND
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#CDFF5D] text-black font-mono font-bold tracking-tight">
            DESKTOP v3.0
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-white/40 font-mono">
          <ShieldCheck className="w-3 h-3 text-[#CDFF5D]" />
          <span>E2EE</span>
        </div>
      </div>

      {/* Center: Draggable Spacer */}
      <div className="flex-1 h-full" />

      {/* Right: Window Control Actions */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="h-full px-3.5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          title="Minimize"
          aria-label="Minimize Window"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-3.5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label="Maximize Window"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="h-full px-3.5 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/80 transition-colors"
          title="Close to Tray"
          aria-label="Close to Tray"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
