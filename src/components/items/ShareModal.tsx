'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Link2,
  Lock,
  Shield,
  QrCode,
  Copy,
  Check,
  Clock,
  Flame,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  Calendar,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Item, ShareLink, ShareAccessLog } from '@/lib/types';
import { cn, formatBytes, formatDate } from '@/lib/utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  encryptionKey?: string | null;
}

const EXPIRATION_OPTIONS = [
  { label: '1 Hour', seconds: 3600 },
  { label: '24 Hours', seconds: 86400 },
  { label: '7 Days', seconds: 604800 },
  { label: '30 Days', seconds: 2592000 },
];

const DOWNLOAD_LIMIT_OPTIONS = [
  { label: 'Unlimited', value: null },
  { label: '1 download (Self-destruct)', value: 1 },
  { label: '5 downloads', value: 5 },
  { label: '10 downloads', value: 10 },
];

export function ShareModal({
  isOpen,
  onClose,
  item,
  encryptionKey,
}: ShareModalProps) {
  const { toast } = useToast();

  // Configuration options
  const [expirationSec, setExpirationSec] = useState<number>(86400);
  const [downloadLimit, setDownloadLimit] = useState<number | null>(null);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Active share state
  const [activeShare, setActiveShare] = useState<ShareLink | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  // QR Code & Access Logs
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [accessLogs, setAccessLogs] = useState<ShareAccessLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Reset or load existing share when item opens
  useEffect(() => {
    if (!isOpen || !item) {
      setActiveShare(null);
      setQrDataUrl(null);
      setShowQr(false);
      setAccessLogs([]);
      setShowLogs(false);
      setPassword('');
      setEnablePassword(false);
      setDownloadLimit(null);
      setExpirationSec(86400);
      return;
    }

    // Attempt to load existing share link for this item
    let isCancelled = false;
    setIsLoadingExisting(true);

    fetch('/api/shares')
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.success && Array.isArray(data.shares)) {
          const existing = data.shares.find(
            (s: ShareLink) => s.itemId === item.id && !s.isRevoked && !s.isExpired
          );
          if (existing) {
            setActiveShare(existing);
          }
        }
      })
      .catch((err) => console.error('Failed to query existing shares:', err))
      .finally(() => {
        if (!isCancelled) setIsLoadingExisting(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, item]);

  // Construct full share URL with optional #key= fragment
  const shareUrl = useMemo(() => {
    if (!activeShare) return '';
    if (typeof window === 'undefined') return `/s/${activeShare.id}`;
    const base = `${window.location.origin}/s/${activeShare.id}`;
    return encryptionKey ? `${base}#key=${encryptionKey}` : base;
  }, [activeShare, encryptionKey]);

  // Generate QR Code image when shareUrl changes
  useEffect(() => {
    if (!shareUrl) {
      setQrDataUrl(null);
      return;
    }

    QRCode.toDataURL(shareUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to render QR Code:', err));
  }, [shareUrl]);

  // Fetch access logs
  const fetchAccessLogs = useCallback(async (shareId: string) => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/shares/${shareId}/logs`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setAccessLogs(data.logs);
      }
    } catch (err: any) {
      console.error('Failed to load share access logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  const handleCreateShare = async () => {
    if (!item) return;
    if (enablePassword && !password.trim()) {
      toast.error('Please specify a password or disable password protection.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          password: enablePassword ? password.trim() : null,
          maxDownloads: downloadLimit,
          expirationDurationSec: expirationSec,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create share link');
      }

      setActiveShare(data.share);
      toast.success('Share link created! Ready to send.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not generate share link.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!activeShare) return;
    if (!confirm('Are you sure you want to revoke this link? Anyone holding it will immediately lose access.')) {
      return;
    }

    setIsRevoking(true);
    try {
      const res = await fetch(`/api/shares/${activeShare.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to revoke link');
      }

      setActiveShare((prev) => (prev ? { ...prev, isRevoked: true } : null));
      toast.info('Share link has been revoked.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not revoke share link.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success('Share link copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Share Link"
      subtitle={item ? `${item.title} (${item.file ? formatBytes(item.file.fileSize) : item.type})` : undefined}
      maxWidth="lg"
    >
      <div className="space-y-5 text-sm">
        {isLoadingExisting ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <RefreshCw className="w-5 h-5 animate-spin text-[#0071e3]" />
            <span>Loading link status...</span>
          </div>
        ) : activeShare && !activeShare.isRevoked ? (
          /* ACTIVE SHARE LINK VIEW */
          <div className="space-y-5">
            {/* Share URL Banner */}
            <div className="p-3.5 rounded-2xl bg-neutral-900/60 dark:bg-black/50 border border-neutral-700/60 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#0071e3]" />
                  Public Download URL
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#CDFF5D]/10 text-[#CDFF5D] border border-[#CDFF5D]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CDFF5D] animate-pulse" />
                  Active
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full bg-neutral-800/80 dark:bg-white/5 border border-neutral-700 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  onClick={handleCopyLink}
                  size="sm"
                  className={cn(
                    'shrink-0 h-9 px-3.5 transition-all',
                    copied ? 'bg-green-600 text-white' : 'bg-[#0071e3] text-white hover:bg-[#0071e3]/90'
                  )}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>

              {encryptionKey && (
                <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#CDFF5D]" />
                  End-to-end encrypted: Decryption key is embedded in URL fragment (#) and never sent to server.
                </p>
              )}
            </div>

            {/* Share Metrics & Controls Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-900/40 dark:bg-white/5 border border-neutral-800 dark:border-white/5 space-y-1">
                <div className="text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  Expires
                </div>
                <div className="font-semibold text-neutral-200">
                  {formatDate(activeShare.expiresAt)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-900/40 dark:bg-white/5 border border-neutral-800 dark:border-white/5 space-y-1">
                <div className="text-neutral-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Downloads
                </div>
                <div className="font-semibold text-neutral-200">
                  {activeShare.maxDownloads
                    ? `${activeShare.downloadCount} / ${activeShare.maxDownloads} used`
                    : `${activeShare.downloadCount} (Unlimited)`}
                </div>
              </div>
            </div>

            {/* QR Code Action Toggle */}
            <div className="border border-neutral-800 dark:border-white/10 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="w-full px-4 py-3 bg-neutral-900/40 dark:bg-white/5 flex items-center justify-between hover:bg-neutral-800/40 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-xs text-neutral-200">
                  <QrCode className="w-4 h-4 text-[#CDFF5D]" />
                  <span>Scan QR Code to Download on Mobile</span>
                </div>
                {showQr ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
              </button>

              {showQr && qrDataUrl && (
                <div className="p-5 flex flex-col items-center justify-center bg-white dark:bg-white/95 rounded-b-xl border-t border-neutral-200 dark:border-white/10">
                  <img
                    src={qrDataUrl}
                    alt="Share Link QR Code"
                    className="w-52 h-52 object-contain rounded-lg shadow-sm"
                  />
                  <p className="mt-3 text-[11px] font-mono text-neutral-600 text-center">
                    Point any phone camera to instantly open and download
                  </p>
                </div>
              )}
            </div>

            {/* Access Logs Accordion */}
            <div className="border border-neutral-800 dark:border-white/10 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (!showLogs) fetchAccessLogs(activeShare.id);
                  setShowLogs(!showLogs);
                }}
                className="w-full px-4 py-3 bg-neutral-900/40 dark:bg-white/5 flex items-center justify-between hover:bg-neutral-800/40 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-xs text-neutral-200">
                  <Activity className="w-4 h-4 text-[#0071e3]" />
                  <span>Download Access Logs</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-neutral-300">
                    {activeShare.downloadCount}
                  </span>
                </div>
                {showLogs ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
              </button>

              {showLogs && (
                <div className="p-4 bg-neutral-950/60 dark:bg-black/60 border-t border-neutral-800 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Recent Downloads</span>
                    <button
                      type="button"
                      onClick={() => fetchAccessLogs(activeShare.id)}
                      className="inline-flex items-center gap-1 hover:text-white"
                      disabled={isLoadingLogs}
                    >
                      <RefreshCw className={cn('w-3 h-3', isLoadingLogs && 'animate-spin')} />
                      Refresh
                    </button>
                  </div>

                  {isLoadingLogs ? (
                    <div className="py-4 text-center text-xs text-neutral-500">Loading access logs...</div>
                  ) : accessLogs.length === 0 ? (
                    <div className="py-4 text-center text-xs text-neutral-500">No downloads recorded yet.</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {accessLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2.5 rounded-lg bg-neutral-900/60 dark:bg-white/5 border border-neutral-800 dark:border-white/5 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono text-[11px] text-[#CDFF5D]">
                              {log.ipMasked || 'Anonymous'}
                            </span>
                            <p className="text-[10px] text-neutral-400 truncate max-w-xs">
                              {log.userAgent || 'Web Browser'}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions: Revoke or Create New */}
            <div className="pt-2 flex items-center justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokeShare}
                disabled={isRevoking}
                className="text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {isRevoking ? 'Revoking...' : 'Revoke Link'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveShare(null)}
                className="text-xs"
              >
                Configure New Link
              </Button>
            </div>
          </div>
        ) : (
          /* CREATE / CONFIGURE SHARE LINK VIEW */
          <div className="space-y-5">
            {activeShare?.isRevoked && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Previous share link was revoked. You can create a new link with fresh credentials below.
              </div>
            )}

            {/* Expiration Preset Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0071e3]" />
                Link Expiration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {EXPIRATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.seconds}
                    type="button"
                    onClick={() => setExpirationSec(opt.seconds)}
                    className={cn(
                      'py-2 px-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer',
                      expirationSec === opt.seconds
                        ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-sm'
                        : 'bg-neutral-900/40 dark:bg-white/5 border-neutral-700/60 dark:border-white/10 text-neutral-300 hover:border-neutral-500'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Download Limit Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Download Limit
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DOWNLOAD_LIMIT_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDownloadLimit(opt.value)}
                    className={cn(
                      'py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer',
                      downloadLimit === opt.value
                        ? 'bg-orange-600 text-white border-orange-500 shadow-sm'
                        : 'bg-neutral-900/40 dark:bg-white/5 border-neutral-700/60 dark:border-white/10 text-neutral-300 hover:border-neutral-500'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password Protection */}
            <div className="p-3.5 rounded-2xl bg-neutral-900/40 dark:bg-white/5 border border-neutral-700/60 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#CDFF5D]" />
                  <div>
                    <div className="text-xs font-semibold text-neutral-200">Password Protection</div>
                    <div className="text-[11px] text-neutral-400">Require password before recipient can download</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enablePassword}
                  onChange={(e) => setEnablePassword(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0071e3] focus:ring-0 cursor-pointer"
                />
              </div>

              {enablePassword && (
                <div className="relative pt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter link password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 text-xs"
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
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateShare}
                disabled={isGenerating}
                className="bg-[#0071e3] hover:bg-[#0071e3]/90 text-white"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Generating Link...
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 mr-1.5" />
                    Create Secure Link
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
