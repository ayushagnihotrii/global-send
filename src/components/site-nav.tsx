'use client'

import * as React from 'react'
import Image from 'next/image'
import { ArrowRight, Sparkles, Shield, Terminal } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

function GithubIcon({ className, strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 select-none rounded-[22%] overflow-hidden shadow-sm border border-black/10 dark:border-white/15 bg-black',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="Global Send Logo"
        width={size}
        height={size}
        priority
        className="w-full h-full object-cover"
      />
    </div>
  )
}

export function SiteNav() {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none transition-all duration-300">
      <div
        className={cn(
          'pointer-events-auto flex items-center justify-between gap-4 sm:gap-8 rounded-full px-4 sm:px-6 py-2.5 rd-capsule-nav transition-all duration-300 max-w-4xl w-full',
          scrolled ? 'scale-[0.98] shadow-2xl' : 'scale-100 shadow-xl'
        )}
      >
        {/* Brand identity */}
        <a href="#top" className="flex items-center gap-2.5 group">
          <LogoMark size={30} className="transition-transform duration-300 group-hover:scale-105" />
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black tracking-tight text-white uppercase">
              Global<span className="text-[#CCFF00]">Send</span>
            </span>
            <span className="hidden sm:inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono font-medium text-neutral-300 border border-white/10">
              v2.4
            </span>
          </div>
        </a>

        {/* Center navigation links */}
        <nav className="hidden md:flex items-center gap-6">
          <a
            href="#transfer"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors"
          >
            Vault Drop
          </a>
          <a
            href="#how"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors"
          >
            How it works
          </a>
          <a
            href="#security"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors"
          >
            Security
          </a>
        </nav>

        {/* Right action controls */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle className="size-8 rounded-full border-white/15 bg-white/10 text-neutral-300 hover:bg-white/20 hover:text-white dark:border-white/15 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/20" />
          
          <a
            href="https://github.com/ayushagnihotrii/global-send"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="hidden sm:inline-flex size-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-neutral-300 hover:bg-white/20 hover:text-white transition-colors"
          >
            <GithubIcon className="size-3.5" />
          </a>

          <a
            href="#transfer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#CCFF00] px-4 text-xs font-bold text-neutral-950 transition-all hover:bg-[#b8e600] hover:scale-105 active:scale-95 shadow-sm"
          >
            <span>Open Vault</span>
            <ArrowRight className="size-3.5 stroke-[2.5]" />
          </a>
        </div>
      </div>
    </header>
  )
}
