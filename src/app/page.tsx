'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  Shield,
  Clock,
  Zap,
  Server,
  CheckCircle2,
} from 'lucide-react'
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
    date: 'OCT 24, 2026',
    tag: 'ARCHITECTURE',
    tagColor: 'bg-[#CDFF5D] text-[#111111]',
    bgBox: 'bg-[#FF8559]',
    title: 'Encrypted by default',
    body: 'Every file is sealed on your device before it reaches any relay. The key never leaves you; the relay sees only ciphertext. Imagine privacy without trusting servers.',
    previewTitle: 'Zero-Knowledge Relay',
    previewBadge: 'Client Cipher',
    icon: Shield,
  },
  {
    no: '02',
    date: 'OCT 25, 2026',
    tag: 'EPHEMERAL',
    tagColor: 'bg-[#FC6742] text-white',
    bgBox: 'bg-[#38BDF8]',
    title: 'Ephemeral by design',
    body: 'Pick a TTL of an hour, a day, or a week. When it lapses, the vault is wiped from every relay and every cache. Zero residual traces left behind.',
    previewTitle: 'Auto-Disintegration',
    previewBadge: '1h · 24h · 7d',
    icon: Clock,
  },
  {
    no: '03',
    date: 'OCT 26, 2026',
    tag: 'NO TRACKING',
    tagColor: 'bg-[#C17BF3] text-white',
    bgBox: 'bg-[#A3E635]',
    title: 'No accounts, ever',
    body: 'No email, no sign-up, no profile. A username and a private key are the entire identity — and the entire access list. Total anonymity by design.',
    previewTitle: 'Anonymous Keys',
    previewBadge: 'Zero Signups',
    icon: Zap,
  },
  {
    no: '04',
    date: 'OCT 27, 2026',
    tag: 'SELF-HOSTED',
    tagColor: 'bg-[#CDFF5D] text-[#111111]',
    bgBox: 'bg-[#FB7185]',
    title: 'Yours to run',
    body: 'Open-source and self-hostable. Run your own relay, use the public grid, or move between them. Your keys, your rules, your infrastructure.',
    previewTitle: 'MIT Mesh Relay',
    previewBadge: 'Audit Ready',
    icon: Server,
  },
]

const steps = [
  {
    no: '01',
    title: 'Drop a file or a note',
    body: 'Choose a TTL. It is encrypted in your browser with a key only you and your recipient hold.',
    highlight: 'Instant preview & client seal',
  },
  {
    no: '02',
    title: 'Share the key',
    body: 'Send the username and key over any channel you already trust. The link opens from any device.',
    highlight: 'No registration required',
  },
  {
    no: '03',
    title: 'It opens, then disappears',
    body: 'Your recipient unlocks it once. When the timer ends, the vault is gone — from every relay, for good.',
    highlight: 'Zero residual forensic traces',
  },
]

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showSplash, setShowSplash] = useState(false)
  const [activePrincipleIndex, setActivePrincipleIndex] = useState(0)

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

  const activePrinciple = principles[activePrincipleIndex]

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
                v1.0 · open-source peer relay
              </p>
            </div>

            {/* 2. Main Title Row: Flanked by exact Sticker 1 (Peace) and Sticker 2 (Googly Eyes) */}
            <div className="relative flex items-center justify-center gap-3 sm:gap-6 my-2">
              
              {/* Pink Peace Sign Sticker */}
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

              {/* Exact Inktrap Typography with original words */}
              <div className="text-center">
                <h1 className="font-headline text-5xl sm:text-7xl md:text-[96px] lg:text-[112px] tracking-tight leading-[0.88] select-none">
                  SEND FILES<br />ANYWHERE.
                </h1>
              </div>

              {/* Googly Eyes Sticker */}
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

              {/* Original Paragraph in Satoshi font */}
              <p className="text-center text-sm sm:text-base md:text-[17px] text-[#161616] dark:text-neutral-300 font-normal leading-[1.45] max-w-xl mx-auto">
                An open-source, end-to-end encrypted vault for files and text. Drop something in, share the key, and it expires on its own. No accounts. No tracking. No third-party clouds.
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

            {/* 4. Down Arrow Sticker pointing to the interactive vault console */}
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

            {/* Interactive Vault Login & Staging Console */}
            <div className="max-w-2xl mx-auto mb-16 gs-fade-up">
              <VaultPreview onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />
            </div>

          </div>
        </section>

        {/* EXACT RIDICULOUS SIPS LAYOUT FOR "PRINCIPLES: BUILT ON FOUR IDEAS. NO COMPROMISES." */}
        <section id="principles" className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-white dark:bg-[#0A0A0C] border-t-2 border-neutral-900/10 dark:border-white/10">
          <div className="mx-auto max-w-6xl">
            
            {/* Top Title Bar: Exact Ridiculous Sips Headline + Subtitle Left, Big Black Pill "See All >" Right */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-14 border-b border-neutral-100 dark:border-white/5">
              <div className="max-w-2xl space-y-4">
                <h2 className="text-4xl sm:text-6xl md:text-[76px] font-extrabold text-[#111111] dark:text-white leading-[1.02] tracking-tight">
                  Built on four ideas.
                </h2>
                <p className="text-base sm:text-lg text-[#161616] dark:text-neutral-400 font-normal leading-[1.4] max-w-xl">
                  Global Send is a relay, not a storage company. The grid moves your bytes; your keys never leave your hands.
                </p>
              </div>

              {/* Big Black Pill Button: "See All >" */}
              <div className="shrink-0 flex items-center gap-2">
                <a
                  href="#how"
                  className="inline-flex items-center gap-3 rounded-full bg-[#111111] dark:bg-white px-8 py-3.5 text-base font-bold text-white dark:text-[#111111] transition-all hover:scale-105 active:scale-95 shadow-md group cursor-pointer"
                >
                  <span>See All</span>
                  <ArrowRight className="size-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>

            {/* Featured Showcase Card (Matching Apple News+ Case Study Style) */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 sm:gap-12 items-center">
              
              {/* Left Vivid Rounded Container (#FF8559 Coral/Peach or Dynamic) */}
              <div
                className={`relative w-full aspect-[4/3] sm:aspect-[16/11] rounded-[24px] ${activePrinciple.bgBox} p-6 sm:p-10 flex items-center justify-center overflow-hidden shadow-sm transition-colors duration-500`}
              >
                {/* Floating Mockup Card Inside the Orange Box */}
                <div className="w-full max-w-[320px] rounded-[24px] bg-white dark:bg-[#18181B] p-6 shadow-2xl border border-black/5 dark:border-white/10 space-y-4 transition-transform duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black uppercase text-neutral-400">
                      PRINCIPLE {activePrinciple.no}
                    </span>
                    <span className="inline-flex size-2 rounded-full bg-[#10B981]" />
                  </div>

                  <div className="size-12 rounded-2xl bg-neutral-100 dark:bg-white/10 flex items-center justify-center">
                    <activePrinciple.icon className="size-6 text-neutral-900 dark:text-white stroke-[2.2]" />
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-neutral-900 dark:text-white leading-tight">
                      {activePrinciple.previewTitle}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {activePrinciple.body.slice(0, 85)}…
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="w-full py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold text-center">
                      Verified Client Key
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Typography Content (Matching "Let me read this one article, please!") */}
              <div className="space-y-4">
                {/* Date & Pill Tag */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    {activePrinciple.date}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider ${activePrinciple.tagColor}`}
                  >
                    {activePrinciple.tag}
                  </span>
                </div>

                {/* Big Headline */}
                <h3 className="text-3xl sm:text-4xl md:text-[44px] font-black text-[#111111] dark:text-white leading-[1.12] tracking-tight">
                  {activePrinciple.title}
                </h3>

                {/* Subtitle / Description */}
                <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 font-medium leading-[1.5] max-w-lg">
                  {activePrinciple.body}
                </p>

                {/* Switcher selector pills for the 4 principles */}
                <div className="pt-4 flex flex-wrap gap-2">
                  {principles.map((p, idx) => (
                    <button
                      key={p.no}
                      type="button"
                      onClick={() => setActivePrincipleIndex(idx)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        activePrincipleIndex === idx
                          ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] shadow-xs'
                          : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {p.no}. {p.title}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-t-2 border-neutral-900/10 dark:border-white/10">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-eyebrow text-2xl text-neutral-500 dark:text-neutral-400 block mb-2">
                how it works
              </span>
              <h2 className="font-headline text-3xl sm:text-5xl tracking-tight text-neutral-950 dark:text-white">
                THREE STEPS. NO CEREMONY.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((s) => (
                <div
                  key={s.no}
                  className="rounded-[28px] border-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-[#141416] p-8 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-neutral-900 text-[#CCFF00] dark:bg-white dark:text-neutral-950 font-mono font-black text-sm mb-6">
                      {s.no}
                    </span>
                    <h3 className="font-headline text-lg sm:text-xl tracking-tight text-neutral-950 dark:text-white">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                      {s.body}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-white/10 flex items-center gap-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 font-mono">
                    <span className="size-2 rounded-full bg-[#CCFF00]" />
                    <span>0{s.no} protocol</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECURITY / CLOSING */}
        <section id="security" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-[#0A0A0C]">
          <div className="mx-auto max-w-4xl text-center">
            <div className="size-16 rounded-3xl bg-neutral-900 dark:bg-white text-[#CCFF00] dark:text-neutral-950 flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Lock className="size-8 stroke-[2.2]" />
            </div>

            <h2 className="font-headline text-3xl sm:text-5xl md:text-6xl tracking-tight text-neutral-950 dark:text-white">
              SOME THINGS SHOULDN&apos;T LIVE IN THE CLOUD FOREVER.
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-base sm:text-lg text-neutral-600 dark:text-neutral-400 font-normal">
              Global Send is for those things. Open, encrypted, and gone when you say so. The relay never holds a key; you always do.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#transfer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#111111] dark:bg-[#CCFF00] px-7 text-sm font-black uppercase text-white dark:text-neutral-950 transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                <span>Open the vault</span>
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
                { k: '256-BIT', v: 'CLIENT-SIDE CIPHER' },
                { k: '0', v: 'ACCOUNTS REQUIRED' },
                { k: '250 MB', v: 'PER VAULT FREE' },
                { k: 'MIT', v: 'LICENSED, AUDITABLE' },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-2xl border-2 border-neutral-900/10 dark:border-white/10 bg-[#F4F4F7] dark:bg-[#141416] p-5 text-center shadow-xs"
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
