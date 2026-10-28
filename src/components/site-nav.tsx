'use client'

import * as React from 'react'
import { ArrowRight } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

function Github({ className, strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) {
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

const navLinks = [
  { label: 'Transfer', href: '#transfer' },
  { label: 'Principles', href: '#principles' },
  { label: 'How it works', href: '#how' },
  { label: 'Security', href: '#security' },
]

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path
        d="M3.5 16h25M16 3.2c3.4 3.2 5.3 7.7 5.3 12.8S19.4 25.6 16 28.8M16 3.2C12.6 6.4 10.7 11 10.7 16s1.9 9.6 5.3 12.8"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.35"
      />
      <path d="M7 25L25 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <path d="M25 7l-7.2 1.6 3 3L25 7z" fill="currentColor" />
      <circle cx="25" cy="7" r="1.7" fill="currentColor" />
    </svg>
  )
}

export function SiteNav() {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-colors duration-300',
        scrolled
          ? 'border-b border-stone-200/70 bg-stone-50/80 backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-950/70'
          : 'border-b border-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">
            <LogoMark className="size-5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Global Send
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="inline-flex size-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-100"
          >
            <Github className="size-[18px]" strokeWidth={1.75} />
          </a>
          <ThemeToggle />
          <a
            href="#transfer"
            className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            Open vault
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </a>
        </div>
      </div>
    </header>
  )
}
