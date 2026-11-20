'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  FileWarning,
  Copyright,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

export default function ReportAbusePage() {
  const [targetType, setTargetType] = useState<'share' | 'file' | 'user'>('share');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState<string>('copyright');
  const [details, setDetails] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) {
      setErrorMessage('Please provide the share link, file ID, or username to report.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId: targetId.trim(),
          reason,
          details: details.trim() || null,
          reporterEmail: reporterEmail.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit abuse report');
      }

      setSubmittedReportId(data.reportId);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col selection:bg-[#CDFF5D] selection:text-black">
      {/* Navigation Header */}
      <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <Logo className="w-7 h-7 text-[#CDFF5D]" />
          <span className="font-mono text-sm font-bold tracking-tight text-white uppercase">
            Global Send
          </span>
        </Link>

        <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl">
          {submittedReportId ? (
            /* SUCCESS CONFIRMATION */
            <div className="p-8 sm:p-10 rounded-[28px] bg-[#18181B] border-2 border-white/10 text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold font-headline text-white uppercase tracking-tight">
                  Report Received
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Thank you for keeping Global Send safe. Our trust & safety team has received your report and investigates violations promptly.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900 border border-white/5 font-mono text-xs text-neutral-300">
                <span className="text-neutral-500 mr-2">Reference ID:</span>
                <span className="font-bold text-[#CDFF5D]">{submittedReportId}</span>
              </div>

              <div className="pt-3">
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all"
                >
                  Return to Home
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </div>
            </div>
          ) : (
            /* REPORT FORM */
            <div className="p-6 sm:p-8 rounded-[28px] bg-[#18181B] border-2 border-white/10 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Report Abuse & Violations
                  </h1>
                  <p className="text-xs text-neutral-400">
                    Submit copyright notices (DMCA), malware, or harmful content reports.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5 text-xs text-neutral-400 leading-relaxed space-y-1">
                <p className="font-semibold text-neutral-300">Zero Tolerance Policy:</p>
                <p>
                  Global Send strictly forbids child sexual abuse material (CSAM), distribution of malware, non-consensual intimate imagery, terrorist content, and copyright infringement. Reported links are immediately reviewed and revoked upon verification.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Target Type Selector */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">What are you reporting?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'share', label: 'Share Link' },
                      { id: 'file', label: 'File / Content' },
                      { id: 'user', label: 'User Account' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTargetType(item.id as any)}
                        className={cn(
                          'py-2 px-3 rounded-xl border font-medium transition-all text-center cursor-pointer',
                          targetType === item.id
                            ? 'bg-[#0071e3] text-white border-[#0071e3]'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-500'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target URL or ID Input */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">
                    {targetType === 'share'
                      ? 'Share Link or Link ID'
                      : targetType === 'file'
                      ? 'File ID or Link'
                      : 'Username'}
                  </label>
                  <Input
                    type="text"
                    placeholder={
                      targetType === 'share'
                        ? 'e.g. https://gsend.in/s/abc123xyz or abc123xyz'
                        : targetType === 'file'
                        ? 'File ID or reference URL'
                        : 'Username'
                    }
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="bg-neutral-900 border-neutral-700 text-xs"
                    required
                  />
                </div>

                {/* Reason Selector */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">Reason for Report</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-[#0071e3]"
                  >
                    <option value="copyright">Copyright Infringement (DMCA Notice)</option>
                    <option value="malware">Malware / Virus / Phishing</option>
                    <option value="illegal">Illegal or Prohibited Material</option>
                    <option value="harassment">Harassment / Non-consensual Content</option>
                    <option value="other">Other Violation of Terms</option>
                  </select>
                </div>

                {/* Details / Description */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">
                    Additional Details / Evidence (Optional)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide relevant information, copyright ownership proof, or description of the violation..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-[#0071e3] resize-none"
                  />
                </div>

                {/* Reporter Email */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">
                    Your Contact Email (Optional for DMCA notices)
                  </label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    className="bg-neutral-900 border-neutral-700 text-xs"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Submitting Report...
                    </>
                  ) : (
                    'Submit Abuse Report'
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
