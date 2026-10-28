'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full border border-stone-200/80 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-100',
        className
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-[18px]" strokeWidth={1.75} />
        ) : (
          <Moon className="size-[18px]" strokeWidth={1.75} />
        )
      ) : (
        <Sun className="size-[18px] opacity-0" strokeWidth={1.75} />
      )}
    </button>
  )
}
