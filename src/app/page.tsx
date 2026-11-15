'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
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
    <div className="flex min-h-screen flex-col bg-[#F0F0F0] text-[#111111] dark:bg-[#0E0E10] dark:text-neutral-100 selection:bg-[#CCFF00] selection:text-neutral-950">
      {showSplash && (
        <SplashScreen durationMs={1000} onFinish={() => setShowSplash(false)} />
      )}

      <span id="top" className="sr-only">Top</span>
      <SiteNav />

      <main className="flex-1 pt-24 sm:pt-28">
        {/* HERO SECTION WITH ORIGINAL TEXT + RIDICULOUS.DESIGN TYPOGRAPHY & STICKERS */}
        <section id="transfer" className="relative overflow-hidden px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="mx-auto max-w-5xl">
            
            {/* Eyebrow in handwritten Shadow Into Light font */}
            <div className="text-center mb-6">
              <p className="font-eyebrow text-2xl sm:text-3xl tracking-normal">
                v1.0 · open-source peer relay
              </p>
            </div>

            {/* Main Display Headline with Peace Sign & Googly Eyes Stickers */}
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

            {/* Subtitle Row with Heart and Sunglasses Stickers + Original Paragraph */}
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

            {/* Down Arrow Sticker pointing to the interactive vault console */}
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

        {/* PRINCIPLES */}
        <section id="principles" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-t-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-[#0A0A0C]">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <span className="font-eyebrow text-2xl text-neutral-500 dark:text-neutral-400 block mb-2">
                principles
              </span>
              <h2 className="font-headline text-3xl sm:text-4xl tracking-tight text-neutral-950 dark:text-white">
                BUILT ON FOUR IDEAS. NO COMPROMISES.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-[#161616] dark:text-neutral-400 font-normal">
                Global Send is a relay, not a storage company. The grid moves your bytes; your keys never leave your hands.
              </p>
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-white/10">
              {principles.map((p) => (
                <div key={p.no} className="flex gap-6 py-7 first:pt-0 last:pb-0">
                  <span className="font-mono text-sm font-bold text-neutral-400 dark:text-neutral-500">{p.no}</span>
                  <div className="flex-1">
                    <h3 className="font-headline text-lg sm:text-xl tracking-tight text-neutral-950 dark:text-white">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 font-normal">{p.body}</p>
                  </div>
                </div>
              ))}
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
