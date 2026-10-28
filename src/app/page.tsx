'use client'

import React, { useState, useEffect } from 'react'
import { ArrowRight, ArrowUpRight, Lock } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { VaultPreview } from '@/components/vault-preview'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { SecurityQuestionSetupModal } from '@/components/auth/SecurityQuestionSetupModal'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { User } from '@/lib/types'

const principles = [
  {
    no: '01',
    title: 'Encrypted by default',
    body: 'Every file is sealed on your device before it reaches any relay. The key never leaves you; the relay sees only ciphertext.',
  },
  {
    no: '02',
    title: 'Ephemeral by design',
    body: 'Pick a TTL of an hour, a day, or a week. When it lapses, the vault is wiped from every relay and every cache.',
  },
  {
    no: '03',
    title: 'No accounts, ever',
    body: 'No email, no sign-up, no profile. A username and a private key are the entire identity — and the entire access list.',
  },
  {
    no: '04',
    title: 'Yours to run',
    body: 'Open-source and self-hostable. Run your own relay, use the public grid, or move between them. Your keys, your terms.',
  },
]

const steps = [
  {
    no: '01',
    title: 'Drop a file or a note',
    body: 'Choose a TTL. It is encrypted in your browser with a key only you and your recipient hold.',
  },
  {
    no: '02',
    title: 'Share the key',
    body: 'Send the username and key over any channel you already trust. The link opens from any device.',
  },
  {
    no: '03',
    title: 'It opens, then disappears',
    body: 'Your recipient unlocks it once. When the timer ends, the vault is gone — from every relay, for good.',
  },
]

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showSplash, setShowSplash] = useState(false)

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (res.ok && data.authenticated && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore
    }
    setUser(null)
  }

  // If user is authenticated, render the dashboard / vault views
  if (!isCheckingAuth && user) {
    if (!user.hasSecurityQuestion) {
      return (
        <SecurityQuestionSetupModal
          user={user}
          onComplete={(updatedUser) => setUser(updatedUser)}
        />
      )
    }
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onUserUpdated={(updatedUser) => setUser(updatedUser)}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 selection:bg-emerald-600 selection:text-white">
      {showSplash && (
        <SplashScreen durationMs={1000} onFinish={() => setShowSplash(false)} />
      )}

      <span id="top" className="sr-only">Top</span>
      <SiteNav />

      <main className="flex-1">
        {/* HERO */}
        <section id="transfer" className="relative overflow-hidden border-b border-stone-200/70 dark:border-stone-800/70">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-32">
            <div className="gs-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                v1.0 · public beta
              </span>
              <h1 className="mt-6 text-4xl font-medium leading-[1.05] tracking-[-0.025em] text-stone-900 dark:text-stone-50 sm:text-5xl lg:text-6xl">
                Send files anywhere
                <br />
                on Earth.{' '}
                <span className="text-emerald-600 dark:text-emerald-500">Privately.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-600 dark:text-stone-400 sm:text-lg">
                An open-source, end-to-end encrypted vault for files and text. Drop something in, share the key, and it expires on its own. No accounts. No tracking. No third-party clouds.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#transfer"
                  className="group inline-flex h-11 items-center gap-1.5 rounded-full bg-stone-900 px-5 text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300 cursor-pointer"
                >
                  Open the vault
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </a>
                <a
                  href="#how"
                  className="inline-flex h-11 items-center gap-1.5 rounded-full border border-stone-300 bg-transparent px-5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-900 cursor-pointer"
                >
                  How it works
                </a>
              </div>
              <p className="mt-8 font-mono text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                open-source · end-to-end encrypted · zero-knowledge · self-hostable
              </p>
            </div>
            <div className="gs-fade-up-delay lg:pl-4">
              <VaultPreview onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />
            </div>
          </div>
        </section>

        {/* PRINCIPLES */}
        <section id="principles" className="border-b border-stone-200/70 dark:border-stone-800/70">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Principles</p>
              <h2 className="mt-4 text-3xl font-medium tracking-[-0.02em] text-stone-900 dark:text-stone-50 sm:text-4xl">Built on four ideas. No compromises.</h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-stone-600 dark:text-stone-400">Global Send is a relay, not a storage company. The grid moves your bytes; your keys never leave your hands.</p>
            </div>
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {principles.map((p) => (
                <div key={p.no} className="flex gap-6 py-7 first:pt-0 last:pb-0">
                  <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-500">{p.no}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="border-b border-stone-200/70 dark:border-stone-800/70">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-500">How it works</p>
              <h2 className="mt-4 text-3xl font-medium tracking-[-0.02em] text-stone-900 dark:text-stone-50 sm:text-4xl">Three steps. No ceremony.</h2>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 dark:border-stone-800 dark:bg-stone-800 sm:grid-cols-3">
              {steps.map((s) => (
                <div key={s.no} className="flex flex-col gap-3 bg-stone-50 p-7 dark:bg-stone-950">
                  <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-500">{s.no}</span>
                  <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECURITY / CLOSING */}
        <section id="security" className="relative overflow-hidden">
          <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-32">
            <div className="mx-auto mb-8 flex size-14 items-center justify-center rounded-2xl border border-stone-200 bg-white text-emerald-600 dark:border-stone-800 dark:bg-stone-900 dark:text-emerald-500">
              <Lock className="size-6" strokeWidth={1.75} />
            </div>
            <h2 className="mx-auto max-w-2xl text-3xl font-medium leading-[1.15] tracking-[-0.02em] text-stone-900 dark:text-stone-50 sm:text-4xl lg:text-[2.75rem]">
              Some things shouldn&apos;t live in the cloud forever.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-stone-600 dark:text-stone-400">
              Global Send is for those things. Open, encrypted, and gone when you say so. The relay never holds a key; you always do.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#transfer"
                className="group inline-flex h-11 items-center gap-1.5 rounded-full bg-stone-900 px-5 text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300 cursor-pointer"
              >
                Open the vault
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </a>
              <a
                href="https://github.com/ayushagnihotrii/global-send"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-stone-300 px-5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-900 cursor-pointer"
              >
                Star on GitHub
                <ArrowUpRight className="size-4" strokeWidth={2} />
              </a>
            </div>
            <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 text-left dark:border-stone-800 dark:bg-stone-800 sm:grid-cols-4">
              {[
                { k: '256-bit', v: 'client-side cipher' },
                { k: '0', v: 'accounts required' },
                { k: '250 MB', v: 'per vault, free' },
                { k: 'MIT', v: 'licensed, auditable' },
              ].map((s) => (
                <div key={s.k} className="bg-stone-50 p-5 dark:bg-stone-950">
                  <dt className="font-mono text-lg font-medium text-stone-900 dark:text-stone-100">{s.k}</dt>
                  <dd className="mt-1 text-xs text-stone-500 dark:text-stone-400">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
