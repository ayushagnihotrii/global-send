'use client'

import React, { useState, useEffect } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  Zap,
  Shield,
  Layers,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Terminal,
  Share2,
} from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { VaultPreview } from '@/components/vault-preview'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { SecurityQuestionSetupModal } from '@/components/auth/SecurityQuestionSetupModal'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { User } from '@/lib/types'

const bentoFeatures = [
  {
    tag: 'ARCHITECTURE',
    title: 'Zero Knowledge. Total Secrecy.',
    description: 'Every file and note is encrypted directly on your device before moving across the relay. The server only sees impenetrable ciphertext.',
    colorBox: 'bg-[#D1FAE5] dark:bg-[#064E3B]/40 text-emerald-800 dark:text-emerald-300',
    badge: 'AES-GCM-256',
    icon: Shield,
  },
  {
    tag: 'EPHEMERAL',
    title: 'Auto-Disintegrating Vaults.',
    description: 'Choose your TTL: 1 hour, 24 hours, or 7 days. When the timer hits zero, the data is permanently erased from memory, disk, and cache.',
    colorBox: 'bg-[#FFE4E6] dark:bg-[#881337]/40 text-rose-800 dark:text-rose-300',
    badge: '1H · 24H · 7D',
    icon: Clock,
  },
  {
    tag: 'NO ACCOUNTS',
    title: 'Identity Without Tracking.',
    description: 'No email required. No phone numbers. No passwords to leak. Your chosen username and private key serve as your complete, isolated identity.',
    colorBox: 'bg-[#ECFCCB] dark:bg-[#365314]/40 text-lime-900 dark:text-lime-300',
    badge: '100% PRIVATE',
    icon: Zap,
  },
  {
    tag: 'MULTI-FILE BATCH',
    title: 'High-Volume File Queue.',
    description: 'Drag one or a hundred files directly onto your screen. Enjoy live per-file progress, image thumbnails, and resumable transfers.',
    colorBox: 'bg-[#E0F2FE] dark:bg-[#0C4A6E]/40 text-sky-900 dark:text-sky-300',
    badge: 'BATCH UPLOAD',
    icon: Layers,
  },
  {
    tag: 'P2P CHAT & VAULT SHARING',
    title: 'Instant Ephemeral Direct Chat.',
    description: 'Share encrypted files and notes privately with other usernames with automated live expiration tracking and zero persistent history.',
    colorBox: 'bg-[#F3E8FF] dark:bg-[#581C87]/40 text-purple-900 dark:text-purple-300',
    badge: 'DIRECT MESSAGE',
    icon: Share2,
  },
  {
    tag: 'SELF-HOSTABLE',
    title: 'MIT Licensed & Auditable.',
    description: 'Run your own relay on Docker, fly.io, or Railway, or join the global public mesh. Transparent and auditable code.',
    colorBox: 'bg-[#FEF3C7] dark:bg-[#78350F]/40 text-amber-900 dark:text-amber-300',
    badge: 'OPEN SOURCE',
    icon: Terminal,
  },
]

const steps = [
  {
    no: '01',
    title: 'Drop Files or Notes',
    body: 'Select multiple files or type your note. Choose how long it lives before self-destruction.',
    highlight: 'Instant preview & client encryption',
  },
  {
    no: '02',
    title: 'Share Username & Key',
    body: 'Pass the username and key over any channel you trust (Signal, WhatsApp, or voice).',
    highlight: 'No registration required',
  },
  {
    no: '03',
    title: 'Access & It Vanishes',
    body: 'The recipient views or downloads the items. When the timer expires, it is gone forever.',
    highlight: 'Zero forensic recovery',
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
    <div className="flex min-h-screen flex-col bg-[#F4F4F7] text-neutral-900 dark:bg-[#0C0C0E] dark:text-neutral-100 selection:bg-[#CCFF00] selection:text-neutral-950">
      {showSplash && (
        <SplashScreen durationMs={1000} onFinish={() => setShowSplash(false)} />
      )}

      <span id="top" className="sr-only">Top</span>
      <SiteNav />

      <main className="flex-1 pt-24 sm:pt-28">
        {/* HERO SECTION */}
        <section id="transfer" className="relative overflow-hidden px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="mx-auto max-w-6xl">
            
            {/* Top Eyebrow Sticker + Playful Badges */}
            <div className="text-center mb-8 relative">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-4 py-1.5 shadow-sm">
                <span className="size-2 rounded-full bg-[#CCFF00] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                  Global Send v2.4 · Ephemeral P2P Relay
                </span>
              </div>

              {/* Floating stickers in Ridiculous.design fashion */}
              <div className="hidden lg:block absolute -top-4 left-10 rd-sticker-left">
                <span className="inline-block rounded-xl bg-[#CCFF00] px-3.5 py-1.5 text-xs font-black uppercase text-neutral-950 shadow-md border-2 border-neutral-950">
                  ⚡️ FAST &amp; LIGHT
                </span>
              </div>
              <div className="hidden lg:block absolute -top-4 right-10 rd-sticker-right">
                <span className="inline-block rounded-xl bg-[#FB7185] px-3.5 py-1.5 text-xs font-black uppercase text-white shadow-md border-2 border-neutral-950">
                  🔥 100% PRIVATE
                </span>
              </div>
            </div>

            {/* Display Headline */}
            <div className="text-center max-w-4xl mx-auto mb-14">
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight leading-[0.95] text-neutral-950 dark:text-white">
                RIDICULOUSLY <br />
                <span className="text-[#CCFF00] drop-shadow-[0_4px_16px_rgba(204,255,0,0.3)]">FAST TRANSFERS.</span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-base sm:text-xl text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed">
                Send files, notes, and code directly across devices with end-to-end client encryption. No cloud accounts, zero tracking, and vanishes on your schedule.
              </p>
            </div>

            {/* Main Interactive Login & Multi-File Staging Console */}
            <div className="max-w-2xl mx-auto mb-20 gs-fade-up">
              <VaultPreview onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />
            </div>

          </div>
        </section>

        {/* HIGH-VOLTAGE CALLOUT STRIP */}
        <section className="bg-[#CCFF00] border-y-2 border-neutral-950 py-5 overflow-hidden">
          <div className="flex items-center justify-around gap-8 text-neutral-950 font-black text-sm sm:text-base uppercase tracking-widest overflow-hidden whitespace-nowrap">
            <span className="flex items-center gap-2">✦ ZERO CLOUD ACCOUNTS REQUIRED</span>
            <span className="flex items-center gap-2">✦ 256-BIT CLIENT-SIDE CIPHER</span>
            <span className="flex items-center gap-2">✦ UP TO 250 MB PER FILE FREE</span>
            <span className="flex items-center gap-2">✦ AUTO-DISINTEGRATION PROTOCOL</span>
            <span className="hidden md:flex items-center gap-2">✦ OPEN SOURCE MIT</span>
          </div>
        </section>

        {/* BENTO GRID FEATURE SHOWCASE */}
        <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b-2 border-neutral-900/10 dark:border-white/10">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-widest text-neutral-400">
                  CRAFTED WITH PRECISION
                </span>
                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-neutral-950 dark:text-white mt-1">
                  Built to be untouchable.
                </h2>
              </div>
              <p className="max-w-xs text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                Everything you expect from an ultra-modern privacy tool, with zero friction.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bentoFeatures.map((feat, idx) => {
                const Icon = feat.icon
                return (
                  <div
                    key={feat.title}
                    className="group rounded-[28px] border-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-[#141416] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Visual Container */}
                      <div className={`w-full h-36 rounded-2xl ${feat.colorBox} p-5 flex items-center justify-between mb-6 border border-black/5 dark:border-white/5`}>
                        <div className="size-12 rounded-xl bg-white/80 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-xs">
                          <Icon className="size-6 stroke-[2.2]" />
                        </div>
                        <span className="font-mono text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/80 dark:bg-black/40 shadow-xs">
                          {feat.badge}
                        </span>
                      </div>

                      <span className="font-mono text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                        {feat.tag}
                      </span>
                      <h3 className="text-xl font-black tracking-tight text-neutral-950 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-[#CCFF00] transition-colors">
                        {feat.title}
                      </h3>
                      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                        {feat.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between">
                      <span className="font-mono text-xs text-neutral-400 font-bold">
                        0{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Explore <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-[#0A0A0C]">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block rounded-full bg-neutral-100 dark:bg-white/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-3">
                SIMPLIFIED ARCHITECTURE
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-neutral-950 dark:text-white">
                Three moves. <br />
                <span className="text-[#CCFF00]">Done.</span>
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
                    <h3 className="text-xl font-black uppercase tracking-tight text-neutral-950 dark:text-white">
                      {st.title}
                    </h3>
                    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
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

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-neutral-950 dark:text-white">
              Data shouldn&apos;t live in the cloud forever.
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-base sm:text-lg text-neutral-600 dark:text-neutral-400 font-medium">
              Global Send gives you complete ownership over your files and clips. Self-hosted, client-sealed, and wiped clean when you say so.
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
