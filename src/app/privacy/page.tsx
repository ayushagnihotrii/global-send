import React from 'react';
import Link from 'next/link';
import { Shield, Lock, ArrowLeft, EyeOff } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export const metadata = {
  title: 'Privacy Policy | Global Send',
  description: 'Zero-knowledge privacy policy and cryptographic guarantees of Global Send.',
};

export default function PrivacyPage() {
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
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
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
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-2">
            Last Updated: November 2026 • Zero-Knowledge Architecture
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-300 border-t border-white/10 pt-8">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">01.</span>
              Our Privacy Commitment
            </h2>
            <p>
              Global Send is architected on a zero-knowledge security foundation. We believe file transfer and cloud storage should be inherently private, mathematically protected, and transparent. We do not sell user data, run third-party tracking scripts, or build advertising profiles.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">02.</span>
              What We Never Collect or Access
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-400">
              <li>
                <strong className="text-neutral-200">Plaintext File Content:</strong> Files are split into chunks and encrypted with AES-256-GCM directly in your browser before they ever leave your device. Our servers receive and store only ciphertext.
              </li>
              <li>
                <strong className="text-neutral-200">Decryption Keys:</strong> In Send Mode, the file decryption key is placed strictly in the URL hash fragment (<code className="text-xs font-mono text-[#CDFF5D]">#key=...</code>). Per web standards, URL hash fragments are never sent to the server in HTTP request headers.
              </li>
              <li>
                <strong className="text-neutral-200">Unmasked Visitor IP Records:</strong> When a recipient downloads a shared file, our access logger records an anonymized, truncated IP address (e.g. <code className="text-xs font-mono text-[#CDFF5D]">192.168.1.xxx</code>) solely so the sender can audit download frequency without compromising recipient privacy.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">03.</span>
              Information We Collect to Provide the Service
            </h2>
            <p>We collect and retain only the minimal metadata necessary to operate the service:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-neutral-400">
              <li>
                <strong className="text-neutral-200">Account Credentials (Vault Mode):</strong> For registered users, we store a username, an Argon2id/PBKDF2 salted password hash, and an optional security question answer hash. We never store plaintext passwords.
              </li>
              <li>
                <strong className="text-neutral-200">Technical Metadata:</strong> Encrypted payload size, sanitized filename, MIME type, link expiration timestamp, download counter, and folder hierarchy.
              </li>
              <li>
                <strong className="text-neutral-200">Abuse Reports:</strong> If you submit a report through our Trust & Safety center, we process the report reason, target identifier, and any optional email you choose to provide.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">04.</span>
              Data Retention & Automatic Deletion
            </h2>
            <p>
              Ephemeral transfers automatically expire according to the time-to-live (TTL) set by the sender (1 hour, 24 hours, 7 days, or 30 days). Once expired, our background cleanup workers remove the file objects and database records permanently. Items placed in Vault Trash are permanently purged after 30 days.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">05.</span>
              Cookies & Local Storage
            </h2>
            <p>
              We use strictly functional, essential cookies: an HTTP-only authentication session cookie (<code className="text-xs font-mono text-neutral-400">auth-token</code>) to keep Vault users signed in across turns. We do not use third-party analytics or cross-site tracking cookies.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="font-mono text-xs text-[#CDFF5D]">06.</span>
              Contact Us
            </h2>
            <p>
              If you have any questions regarding our cryptographic safeguards or privacy practices, please contact us or submit an inquiry through our{' '}
              <Link href="/report" className="text-[#0071e3] hover:underline font-semibold">
                Trust & Safety Center
              </Link>
              .
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-white/10 flex items-center justify-between text-xs font-mono text-neutral-500">
          <span>Global Send © 2026</span>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service →
          </Link>
        </div>
      </main>
    </div>
  );
}
