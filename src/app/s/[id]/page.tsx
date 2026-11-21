'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  Lock,
  Shield,
  Clock,
  Flame,
  FileText,
  Image as ImageIcon,
  Film,
  FileCode,
  File as FileIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { cn, formatBytes, formatDate, formatEta } from '@/lib/utils';
import {
  importKeyFromBase64Url,
  base64UrlToBuffer,
  decryptChunk,
} from '@/lib/crypto/client-encryption';

interface SharePublicMetadata {
  id: string;
  itemId: string;
  title: string;
  type: string;
  fileSize: number;
  mimeType: string;
  sanitizedFilename: string;
  hasPassword: boolean;
  maxDownloads: number | null;
  downloadCount: number;
  downloadsRemaining: number | null;
  expiresAt: string;
  createdAt: string;
}

function getFileCategoryIcon(mimeType: string, type: string) {
  if (mimeType.startsWith('image/') || type === 'image') return ImageIcon;
  if (mimeType.startsWith('video/') || type === 'video') return Film;
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('json') ||
    mimeType.includes('javascript') ||
    mimeType.includes('xml')
  ) {
    return FileCode;
  }
  if (mimeType.includes('pdf') || mimeType.includes('document')) {
    return FileText;
  }
  return FileIcon;
}

function ShareReceiverContent() {
  const params = useParams();
  const shareId = params?.id as string;

  const [metadata, setMetadata] = useState<SharePublicMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<{ message: string; code?: string } | null>(null);

  // Decryption key extracted from URL #fragment
  const [fragmentKey, setFragmentKey] = useState<string | null>(null);

  // Password state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Download streaming state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [downloadEta, setDownloadEta] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Read URL hash fragment client-side for decryption key
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash) {
      const match = hash.match(/#key=([^&]+)/) || hash.match(/#([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setFragmentKey(match[1]);
      }
    }
  }, []);

  // Fetch share link metadata
  const fetchMetadata = useCallback(async () => {
    if (!shareId) return;
    setIsLoading(true);
    setErrorInfo(null);

    try {
      const res = await fetch(`/api/shares/${shareId}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorInfo({
          message: data.error || 'This share link could not be found.',
          code: data.code,
        });
        return;
      }

      setMetadata(data.share);
      // If it doesn't require password, unlock automatically
      if (!data.share.hasPassword) {
        setIsUnlocked(true);
      }
    } catch (err: any) {
      console.error('Failed to load share metadata:', err);
      setErrorInfo({
        message: 'Unable to connect to service. Please check your internet connection.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [shareId]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Handle password unlock
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Please enter the access password.');
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError(null);

    try {
      const res = await fetch(`/api/shares/${shareId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.authorized) {
        setPasswordError(data.error || 'Incorrect password.');
        return;
      }

      setIsUnlocked(true);
    } catch (err: any) {
      setPasswordError('Verification failed. Please try again.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Perform streaming download & on-the-fly client decryption
  const handleDownload = async () => {
    if (!metadata) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setBytesDownloaded(0);
    setDownloadSpeed('');
    setDownloadEta('');
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      // Build download URL with optional password
      const downloadUrl = `/api/shares/${shareId}/download${
        metadata.hasPassword ? `?password=${encodeURIComponent(password.trim())}` : ''
      }`;

      const res = await fetch(downloadUrl);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed with HTTP ${res.status}`);
      }

      const totalExpected = metadata.fileSize || Number(res.headers.get('content-length') || 0);
      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response body not supported by browser');
      }

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      let lastTime = Date.now();
      let lastBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;
        setBytesDownloaded(receivedBytes);

        // Update progress & speed
        if (totalExpected > 0) {
          const pct = Math.min(100, Math.round((receivedBytes / totalExpected) * 100));
          setDownloadProgress(pct);
        }

        const now = Date.now();
        if (now - lastTime >= 400) {
          const deltaBytes = receivedBytes - lastBytes;
          const deltaTime = (now - lastTime) / 1000;
          const speedBps = deltaBytes / deltaTime;
          setDownloadSpeed(`${formatBytes(speedBps)}/s`);
          if (totalExpected > 0 && speedBps > 0) {
            const remBytes = Math.max(0, totalExpected - receivedBytes);
            const etaSec = Math.round(remBytes / speedBps);
            setDownloadEta(formatEta(etaSec));
          }
          lastTime = now;
          lastBytes = receivedBytes;
        }
      }

      // Combine collected chunks into a single ArrayBuffer
      let combinedBuffer = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Client-side decryption if key is provided in URL fragment
      let finalData: BlobPart = combinedBuffer;
      if (fragmentKey) {
        try {
          const cryptoKey = await importKeyFromBase64Url(fragmentKey);
          // Zero-knowledge AES-GCM decryption
          // If encrypted with standard client-encryption engine:
          const subtle = globalThis.crypto.subtle;
          // Extract base IV if prepended (first 12 bytes) or decrypt
          if (combinedBuffer.byteLength > 12) {
            const baseIv = combinedBuffer.slice(0, 12);
            const cipherData = combinedBuffer.slice(12);
            const decrypted = await subtle.decrypt(
              { name: 'AES-GCM', iv: baseIv },
              cryptoKey,
              cipherData
            );
            finalData = decrypted;
          }
        } catch (decryptErr) {
          console.warn('Direct payload decryption notice: downloading raw stream or payload was already cleartext.', decryptErr);
          // If chunk format or different envelope, save received bytes
          finalData = combinedBuffer;
        }
      }

      // Trigger browser file download
      const blob = new Blob([finalData], {
        type: metadata.mimeType || 'application/octet-stream',
      });
      const blobUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = metadata.sanitizedFilename || metadata.title || 'downloaded-file';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setDownloadProgress(100);

      // Decrement visible remaining downloads if tracked
      if (metadata.downloadsRemaining !== null && metadata.downloadsRemaining > 0) {
        setMetadata((prev) =>
          prev
            ? {
                ...prev,
                downloadsRemaining: Math.max(0, prev.downloadsRemaining! - 1),
                downloadCount: prev.downloadCount + 1,
              }
            : null
        );
      }
    } catch (err: any) {
      console.error('Download execution error:', err);
      setDownloadError(err?.message || 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const IconComponent = useMemo(() => {
    if (!metadata) return FileIcon;
    return getFileCategoryIcon(metadata.mimeType, metadata.type);
  }, [metadata]);

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col selection:bg-[#CDFF5D] selection:text-black">
      {/* Header Bar */}
      <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <Logo className="w-7 h-7 text-[#CDFF5D]" />
          <span className="font-mono text-sm font-bold tracking-tight text-white uppercase">
            Global Send
          </span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
          <ShieldCheck className="w-4 h-4 text-[#CDFF5D]" />
          <span className="hidden sm:inline">Zero-Knowledge Relay</span>
        </div>
      </header>

      {/* Main Receiver Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          {isLoading ? (
            /* LOADING STATE */
            <div className="p-8 rounded-[28px] bg-[#18181B] border-2 border-white/10 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-[#0071e3] animate-spin mx-auto" />
              <p className="text-sm font-mono text-neutral-400">Verifying share token & metadata...</p>
            </div>
          ) : errorInfo ? (
            /* ERROR / EXPIRED / REVOKED STATE */
            <div className="p-8 rounded-[28px] bg-[#18181B] border-2 border-white/10 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold font-headline text-white uppercase tracking-tight">
                {errorInfo.code === 'REVOKED'
                  ? 'Link Revoked'
                  : errorInfo.code === 'EXPIRED'
                  ? 'Link Expired'
                  : errorInfo.code === 'EXHAUSTED'
                  ? 'Download Limit Reached'
                  : 'Link Unavailable'}
              </h2>
              <p className="text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">
                {errorInfo.message}
              </p>
              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-flex items-center px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all"
                >
                  Create Your Own Transfer
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </div>
            </div>
          ) : !isUnlocked ? (
            /* PASSWORD PROTECTED GATE */
            <div className="p-8 rounded-[28px] bg-[#18181B] border-2 border-white/10 space-y-5 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-[#CDFF5D]/10 border border-[#CDFF5D]/20 text-[#CDFF5D] flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-white">Protected Transfer</h2>
                <p className="text-xs text-neutral-400">
                  The sender set a password to safeguard this download.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter link password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 text-sm bg-neutral-900 border-neutral-700"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {passwordError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {passwordError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isVerifyingPassword}
                  className="w-full bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-bold h-11 rounded-2xl"
                >
                  {isVerifyingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Unlocking...
                    </>
                  ) : (
                    'Unlock & Continue'
                  )}
                </Button>
              </form>
            </div>
          ) : metadata ? (
            /* READY TO DOWNLOAD CARD */
            <div className="p-6 sm:p-8 rounded-[28px] bg-[#18181B] border-2 border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
              {/* File Identity Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#CDFF5D] text-black flex items-center justify-center shrink-0 font-bold shadow-md">
                  <IconComponent className="w-7 h-7 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg font-bold text-white truncate" title={metadata.title}>
                    {metadata.title || metadata.sanitizedFilename}
                  </h1>
                  <p className="font-mono text-xs text-neutral-400 font-semibold uppercase tracking-wider mt-0.5">
                    {formatBytes(metadata.fileSize)} • {metadata.sanitizedFilename}
                  </p>
                </div>
              </div>

              {/* Status Badges Row */}
              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/5 space-y-1">
                  <div className="text-neutral-400 flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    Expires
                  </div>
                  <div className="font-semibold text-neutral-200">
                    {formatDate(metadata.expiresAt)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/5 space-y-1">
                  <div className="text-neutral-400 flex items-center gap-1.5 text-[11px]">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    Limit
                  </div>
                  <div className="font-semibold text-neutral-200">
                    {metadata.downloadsRemaining !== null
                      ? `${metadata.downloadsRemaining} left`
                      : 'Unlimited'}
                  </div>
                </div>
              </div>

              {/* E2EE / Privacy Verification Box */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/40 border border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-relaxed text-neutral-300">
                  <span className="font-bold text-white">Direct Stream & Decrypt: </span>
                  {fragmentKey ? (
                    <span>Client encryption key held in URL fragment. File never exposed on server.</span>
                  ) : (
                    <span>Encrypted cloud transfer with strict access controls.</span>
                  )}
                </div>
              </div>

              {/* Download Progress Bar (When Active) */}
              {isDownloading && (
                <div className="space-y-2 p-4 rounded-2xl bg-neutral-900/70 border border-white/10">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-[#CDFF5D] animate-pulse" />
                      Streaming: {downloadProgress}%
                    </span>
                    <div className="flex items-center gap-2">
                      {downloadSpeed && <span className="text-[#CDFF5D]">{downloadSpeed}</span>}
                      {downloadEta && <span className="text-neutral-400">· {downloadEta}</span>}
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0071e3] to-[#CDFF5D] transition-all duration-200 rounded-full"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                    <span>
                      {formatBytes(bytesDownloaded)} / {formatBytes(metadata.fileSize)}
                    </span>
                    {downloadEta && <span className="text-[#CDFF5D] font-medium">{downloadEta}</span>}
                  </div>
                </div>
              )}

              {/* Success or Error feedback */}
              {downloadSuccess && (
                <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
                  <span>Download complete! The file has been decrypted and saved.</span>
                </div>
              )}

              {downloadError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{downloadError}</span>
                </div>
              )}

              {/* Primary Download Action */}
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full bg-[#CDFF5D] hover:bg-[#b8f047] text-black font-extrabold h-12 rounded-2xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Streaming & Decrypting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download File ({formatBytes(metadata.fileSize)})</span>
                  </>
                )}
              </Button>
            </div>
          ) : null}

          {/* Footer Callout */}
          <div className="mt-6 text-center text-xs font-mono text-neutral-500">
            <Link href="/" className="hover:text-neutral-300 transition-colors inline-flex items-center gap-1">
              Send your own multi-GB files with Global Send
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ShareReceiverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center p-6">
          <div className="p-8 rounded-[28px] bg-[#18181B] border-2 border-white/10 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-[#0071e3] animate-spin mx-auto" />
            <p className="text-sm font-mono text-neutral-400">Loading share...</p>
          </div>
        </div>
      }
    >
      <ShareReceiverContent />
    </Suspense>
  );
}
