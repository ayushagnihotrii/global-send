import React from 'react';
import Link from 'next/link';
import { Shield, FileText, ArrowLeft, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export const metadata = {
  title: 'Terms of Service | Global Send',
  description: 'Terms of Service, acceptable use guidelines, and policies for Global Send.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col selection:bg-[#CDFF5D] selection:text-black font-sans">
      {/* Header */}
      <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <Logo className="w-7 h-7 text-[#CDFF5D]" />
          <span className="font-mono text-sm font-bold tracking-tight text-white uppercase">
            Global Send
          </span>
        </Link>

        <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/report" className="hover:text-white transition-colors">
            Report Abuse
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 sm:py-16 space-y-10">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Global Send
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-headline tracking-tight text-white uppercase">
            Terms of Service
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-2">
            Last Updated: November 2026 • Effective Date: November 2026
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-300 border-t border-white/10 pt-8">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">01.</span>
              Acceptance of Terms
            </h2>
            <p>
              By accessing or using Global Send (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access or use the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">02.</span>
              Description of the Service
            </h2>
            <p>
              Global Send provides two core capabilities:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-neutral-400">
              <li>
                <strong className="text-neutral-200">Send Mode:</strong> Temporary, frictionless file transfer allowing users to send multi-gigabyte files with client-side encryption. Share links feature configurable time-to-live (TTL) expiration, optional password protection, and download limits. Receivers require no account.
              </li>
              <li>
                <strong className="text-neutral-200">Vault Mode:</strong> Account-authenticated private cloud storage with folders, media viewing, a 30-day trash restore window, and permanent retention options.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">03.</span>
              Zero-Knowledge Encryption & Key Responsibility
            </h2>
            <p>
              Global Send employs client-side cryptographic sealing (AES-256-GCM). In Send Mode, file decryption keys reside exclusively in the URL hash fragment (<code className="text-xs font-mono text-[#CDFF5D]">#key=...</code>) and are never transmitted to our backend relays.
            </p>
            <p className="p-3.5 rounded-2xl bg-neutral-900 border border-white/5 text-xs text-neutral-400">
              <strong className="text-white block mb-1">Important Key Notice:</strong>
              Because decryption keys are never recorded on our servers, Global Send personnel cannot inspect, view, or restore your files if you lose your link or decryption key. You are solely responsible for securely distributing and backing up your keys.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">04.</span>
              Acceptable Use & Prohibited Conduct
            </h2>
            <p>You agree not to misuse the Service. Specifically, you agree NOT to upload, share, or store:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-neutral-400">
              <li>Child Sexual Abuse Material (CSAM) or any form of child sexual exploitation (strictly prohibited with immediate referral to law enforcement/NCMEC).</li>
              <li>Malicious software, viruses, ransomware, spyware, or phishing payloads.</li>
              <li>Terrorist content, violent extremism, or threats of violence.</li>
              <li>Non-consensual sexual imagery or doxxing materials.</li>
              <li>Content that infringes upon copyright, trademarks, patents, or trade secrets of third parties.</li>
              <li>Automated scraping, denial-of-service attempts, or bypassing rate limits.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">05.</span>
              DMCA & Copyright Policy
            </h2>
            <p>
              We respect the intellectual property rights of others. If you believe copyrighted work has been shared in violation of copyright law, please submit a notice via our{' '}
              <Link href="/report" className="text-[#0071e3] hover:underline font-semibold">
                Report Abuse & DMCA Center
              </Link>
              . Valid copyright notices result in the immediate revocation of the associated share link.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">06.</span>
              File Retention, Expiration & Quotas
            </h2>
            <p>
              Files with configured expiration timers are permanently removed from our storage backend upon expiration. Items moved to the Trash are retained for 30 days before being permanently purged. Free-tier accounts are subject to fair-use storage quotas.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">07.</span>
              Disclaimer & Limitation of Liability
            </h2>
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, GLOBAL SEND SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE SERVICE.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-white/10 flex items-center justify-between text-xs font-mono text-neutral-500">
          <span>Global Send © 2026</span>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy →
          </Link>
        </div>
      </main>
    </div>
  );
}
