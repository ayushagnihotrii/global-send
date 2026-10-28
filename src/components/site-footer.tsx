import * as React from 'react'
import { LogoMark } from '@/components/site-nav'

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

const footerLinks = [
  { label: 'Docs', href: '#' },
  { label: 'Security', href: '#' },
  { label: 'Privacy', href: '#' },
  { label: 'Status', href: '#' },
  { label: 'Changelog', href: '#' },
]

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200/70 bg-stone-50/60 dark:border-stone-800/70 dark:bg-stone-950">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">
              <LogoMark className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Global Send
            </span>
          </div>
          <p className="max-w-xs font-mono text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Open-source · end-to-end encrypted · self-hostable
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {footerLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="inline-flex size-8 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-stone-900 dark:hover:bg-stone-800/60 dark:hover:text-stone-100"
          >
            <Github className="size-4" strokeWidth={1.75} />
          </a>
        </nav>
      </div>

      <div className="border-t border-stone-200/70 dark:border-stone-800/70">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-5 text-xs text-stone-400 dark:text-stone-500 sm:flex-row sm:items-center sm:px-8">
          <p className="font-mono tracking-tight">© 2026 Global Send. No rights reserved — MIT licensed.</p>
          <p className="font-mono tracking-tight">Made by people who&apos;d rather not shout.</p>
        </div>
      </div>
    </footer>
  )
}
