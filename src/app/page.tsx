'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  Zap,
  CheckCircle2,
} from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { VaultPreview } from '@/components/vault-preview'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { SecurityQuestionSetupModal } from '@/components/auth/SecurityQuestionSetupModal'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { User } from '@/lib/types'

const steps = [
  {
    no: '01',
    title: 'Drop Files or Notes',
    body: 'Select multiple files or write your note. Choose an expiration duration (1h, 24h, or 7d) before client-side encryption.',
    highlight: 'Instant preview & AES-GCM-256 seal',
  },
  {
    no: '02',
    title: 'Share Username & Key',
    body: 'Deliver the username and private key over any channel you already trust (Signal, WhatsApp, voice, or in-person).',
    highlight: 'No registration or personal data',
  },
  {
    no: '03',
    title: 'Access & It Vanishes',
    body: 'The recipient accesses and downloads the vaulted files. Once the expiration timer lapses, everything is wiped forever.',
    highlight: 'Zero residual forensic recovery',
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
    <div className="flex min-h-screen flex-col bg-[#F0F0F0] text-[#111111] dark:bg-[#0E0E10] dark:text-neutral-100 selection:bg-[#CCFF00] selection:text-neutral-950">
      {showSplash && (
        <SplashScreen durationMs={1000} onFinish={() => setShowSplash(false)} />
      )}

      <span id="top" className="sr-only">Top</span>
      <SiteNav />

      <main className="flex-1 pt-24 sm:pt-28">
        {/* HERO SECTION MATCHING RIDICULOUS.DESIGN EXACT COMPOSITION */}
        <section id="transfer" className="relative overflow-hidden px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="mx-auto max-w-5xl">
            
            {/* 1. Eyebrow: Shadow Into Light font */}
            <div className="text-center mb-6">
              <p className="font-eyebrow text-2xl sm:text-3xl tracking-normal">
                UX ideas that make you pause and rethink
              </p>
            </div>

            {/* 2. Main Title Row: Flanked by exact Sticker 1 (Peace) and Sticker 2 (Googly Eyes) */}
            <div className="relative flex items-center justify-center gap-3 sm:gap-6 my-2">
              
              {/* Left Peace Sign Sticker */}
              <div className="relative shrink-0 sticker-peace -mt-8 sm:-mt-12 select-none">
                <Image
                  src="/stickers/sticker-peace.png"
                  alt="Peace sign sticker"
                  width={110}
                  height={110}
                  priority
                  className="w-14 sm:w-24 md:w-28 h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
                />
              </div>

              {/* Exact Abcwhyte Inktrap Typography: DISRUPTING ORDINARY */}
              <div className="text-center">
                <h1 className="font-headline text-5xl sm:text-7xl md:text-[108px] lg:text-[124px] tracking-tight leading-[0.88] select-none">
                  DISRUPTING<br />ORDINARY
                </h1>
              </div>

              {/* Right Googly Eyes Sticker */}
              <div className="relative shrink-0 sticker-eyes -mt-8 sm:-mt-12 select-none">
                <Image
                  src="/stickers/sticker-eyes.png"
                  alt="Eyes sticker"
                  width={115}
                  height={115}
                  priority
                  className="w-14 sm:w-24 md:w-28 h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
                />
              </div>

            </div>

            {/* 3. Subtitle Row: Flanked by exact Sticker 4 (Green Heart) and Sticker 5 (Thug Sunglasses) */}
            <div className="relative max-w-3xl mx-auto flex items-center justify-center gap-4 sm:gap-8 my-8 px-4">
              
              {/* Green Heart Sticker */}
              <div className="shrink-0 sticker-heart select-none hidden sm:block">
                <Image
                  src="/stickers/sticker-heart.png"
                  alt="Green heart sticker"
                  width={90}
                  height={90}
                  priority
                  className="w-14 sm:w-20 md:w-22 h-auto drop-shadow-[0_6px_14px_rgba(0,0,0,0.12)]"
                />
              </div>

              {/* Center Body Copy in Satoshi Regular font */}
              <p className="text-center text-sm sm:text-base md:text-[17px] text-[#161616] dark:text-neutral-300 font-normal leading-[1.45] max-w-xl mx-auto">
                Welcome to our community of unconventional thinkers with ideas that break the mold. Uncover our collection of absurd design concepts you wish existed.
              </p>

              {/* Pixel Sunglasses Sticker */}
              <div className="shrink-0 sticker-glasses select-none hidden sm:block">
                <Image
                  src="/stickers/sticker-glasses.png"
                  alt="Pixel sunglasses sticker"
                  width={95}
                  height={95}
                  priority
                  className="w-14 sm:w-20 md:w-22 h-auto drop-shadow-[0_6px_14px_rgba(0,0,0,0.12)]"
                />
              </div>

            </div>

            {/* 4. Down Arrow Sticker pointing directly to the interactive console */}
            <div className="flex justify-center mb-8 sticker-arrow select-none">
              <Image
                src="/stickers/sticker-arrow.png"
                alt="Down arrow sticker"
                width={48}
                height={68}
                priority
                className="w-8 sm:w-11 h-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)]"
              />
            </div>

            {/* 5. Main Interactive Vault Login & Staging Console */}
            <div className="max-w-2xl mx-auto mb-16 gs-fade-up">
              <VaultPreview onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />
            </div>

          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-t-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-[#0A0A0C]">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-eyebrow text-2xl text-neutral-500 dark:text-neutral-400 block mb-2">
                how it works
              </span>
              <h2 className="font-headline text-3xl sm:text-5xl tracking-tight">
                THREE MOVES. DONE.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((st) => (
                <div
                  key={st.no}
                  className="rounded-[28px] border-2 border-neutral-900/10 dark:border-white/10 bg-[#F4F4F7] dark:bg-[#141416] p-8 flex flex-col justify-between"
                >
                  <div>
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-neutral-900 text-[#CCFF00] dark:bg-white dark:text-neutral-950 font-mono font-black text-sm mb-6">
                      {st.no}
                    </span>
                    <h3 className="font-headline text-lg sm:text-xl tracking-tight text-neutral-950 dark:text-white">
                      {st.title}
                    </h3>
                    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                      {st.body}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-white/10 flex items-center gap-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 font-mono">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>{st.highlight}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECURITY & STATS STRIP */}
        <section id="security" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="size-16 rounded-3xl bg-neutral-900 dark:bg-white text-[#CCFF00] dark:text-neutral-950 flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Lock className="size-8 stroke-[2.2]" />
            </div>

            <h2 className="font-headline text-3xl sm:text-5xl md:text-6xl tracking-tight text-neutral-950 dark:text-white">
              DATA SHOULDN&apos;T LIVE IN THE CLOUD FOREVER.
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-base sm:text-lg text-neutral-600 dark:text-neutral-400 font-normal">
              Global Send gives you complete ownership over your files and clips. Self-hosted, client-sealed, and wiped clean on your terms.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#transfer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#111111] dark:bg-[#CCFF00] px-7 text-sm font-black uppercase text-white dark:text-neutral-950 transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                <span>Launch Console</span>
                <ArrowRight className="size-4 stroke-[2.5]" />
              </a>

              <a
                href="https://github.com/ayushagnihotrii/global-send"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-neutral-900/20 dark:border-white/20 bg-transparent px-7 text-sm font-black uppercase text-neutral-900 dark:text-white transition-all hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-950"
              >
                <span>Star on GitHub</span>
                <ArrowUpRight className="size-4" />
              </a>
            </div>

            {/* Quick Stats Bento */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { k: '256-BIT', v: 'AES-GCM CIPHER' },
                { k: '0', v: 'ACCOUNTS REQUIRED' },
                { k: '250 MB', v: 'PER VAULT FREE' },
                { k: '100%', v: 'OPEN SOURCE MIT' },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-2xl border-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-[#141416] p-5 text-center shadow-xs"
                >
                  <p className="font-black text-2xl sm:text-3xl font-mono text-neutral-950 dark:text-[#CCFF00]">
                    {s.k}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                    {s.v}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
