'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  HardDrive,
  Download,
  Sun,
  Moon,
  LogOut,
  ShieldAlert,
  FileText,
  Image as ImageIcon,
  Film,
  FileCode,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { User as UserType, StorageUsage } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { SITE_CONFIG } from '@/config/site';
import { Logo } from '@/components/ui/Logo';

interface SettingsViewProps {
  user: UserType;
  onLogout: () => void;
  onUserUpdated?: (user: UserType) => void;
}

const MAX_AVATAR_BYTES = SITE_CONFIG.maxAvatarSizeBytes; // 102,400 bytes (100 KiB)
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function SettingsView({ user, onLogout, onUserUpdated }: SettingsViewProps) {
  const { toast } = useToast();
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);

  // Avatar state
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);

  // Change login key modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [currentKey, setCurrentKey] = useState('');
  const [newKey, setNewKey] = useState('');
  const [isChangingKey, setIsChangingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Owner-only Google Drive Integration state
  const [gdriveStatus, setGdriveStatus] = useState<{
    connected: boolean;
    isConfigured: boolean;
    rootFolderId?: string;
    quota?: any;
    error?: string;
  } | null>(null);
  const [isLoadingGdrive, setIsLoadingGdrive] = useState(false);
  const [isDisconnectingGdrive, setIsDisconnectingGdrive] = useState(false);

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Theme preference
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('qv_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('qv_theme', 'light');
    }
  };

  const fetchStorageUsage = async () => {
    setIsLoadingStorage(true);
    try {
      const res = await fetch('/api/user/storage');
      const data = await res.json();
      if (res.ok && data.usage) {
        setStorageUsage(data.usage);
      }
    } catch (e) {
      console.error('Failed to load storage:', e);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const fetchGdriveStatus = async () => {
    if (!user.isAdmin) return;
    setIsLoadingGdrive(true);
    try {
      const res = await fetch('/api/admin/gdrive/status');
      const data = await res.json();
      if (res.ok) {
        setGdriveStatus(data);
      }
    } catch (e) {
      console.error('Failed to load Google Drive status:', e);
    } finally {
      setIsLoadingGdrive(false);
    }
  };

  useEffect(() => {
    fetchStorageUsage();
    if (user.isAdmin) {
      fetchGdriveStatus();
    }
  }, [user.isAdmin]);

  // Avatar selection & validation
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
      setAvatarError('Only JPEG, PNG, and WebP images are allowed (SVG is not permitted).');
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreviewUrl(preview);
    setSelectedAvatarFile(file);

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError(
        `Profile picture must be 100 KB or smaller (selected file is ${(file.size / 1024).toFixed(1)} KB).`
      );
    }
  };

  // Optional client-side helper to compress an oversized image down under 100 KiB
  const handleAutoCompressAvatar = async () => {
    if (!selectedAvatarFile) return;
    setIsCompressingAvatar(true);
    setAvatarError(null);

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(selectedAvatarFile);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not decode image'));
        img.src = objectUrl;
      });
      URL.revokeObjectURL(objectUrl);

      const maxDim = 256;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(img, 0, 0, width, height);

      let blob: Blob | null = null;
      for (const quality of [0.86, 0.75, 0.62, 0.5, 0.38]) {
        blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
        if (blob && blob.size <= MAX_AVATAR_BYTES) break;
      }

      if (!blob || blob.size > MAX_AVATAR_BYTES) {
        setAvatarError('Could not compress image under 100 KB. Please choose a smaller image.');
        return;
      }

      const compressedFile = new File([blob], 'avatar.webp', { type: 'image/webp' });
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(URL.createObjectURL(compressedFile));
      setSelectedAvatarFile(compressedFile);
      setAvatarError(null);
      toast.info(`Optimized to ${(compressedFile.size / 1024).toFixed(1)} KB`);
    } catch {
      setAvatarError('Failed to optimize image. Please select an image under 100 KB.');
    } finally {
      setIsCompressingAvatar(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedAvatarFile) return;

    if (selectedAvatarFile.size > MAX_AVATAR_BYTES) {
      setAvatarError('Profile picture must be 100 KB or smaller.');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedAvatarFile);

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setAvatarError(data.error || 'Failed to upload profile picture');
        return;
      }

      toast.success('Profile picture updated');
      setSelectedAvatarFile(null);
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl(null);
      }
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      if (onUserUpdated) {
        onUserUpdated({
          ...user,
          avatarUrl: data.avatarUrl,
          avatarSizeBytes: data.sizeBytes,
        });
      }
      fetchStorageUsage();
    } catch {
      setAvatarError('Network error uploading profile picture');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    setAvatarError(null);
    try {
      const res = await fetch('/api/user/avatar', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Profile picture removed');
        if (onUserUpdated) {
          onUserUpdated({
            ...user,
            avatarUrl: null,
            avatarSizeBytes: 0,
          });
        }
        fetchStorageUsage();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove profile picture');
      }
    } catch {
      toast.error('Network error removing profile picture');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleConnectGdrive = async () => {
    try {
      const res = await fetch('/api/admin/gdrive/auth-url');
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || 'Failed to start Google Drive connection');
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error('Network error starting Google Drive authorization');
    }
  };

  const handleDisconnectGdrive = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Active file storage will stop working until reconnected.')) return;
    setIsDisconnectingGdrive(true);
    try {
      const res = await fetch('/api/admin/gdrive/disconnect', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Google Drive disconnected');
        fetchGdriveStatus();
      } else {
        toast.error(data.error || 'Failed to disconnect Google Drive');
      }
    } catch {
      toast.error('Failed to disconnect Google Drive');
    } finally {
      setIsDisconnectingGdrive(false);
    }
  };

  const handleChangeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    setIsChangingKey(true);

    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentKey, newKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setKeyError(data.error || 'Failed to update login key');
        return;
      }

      toast.success('Private login key updated. Save it safely!');
      setShowKeyModal(false);
      setCurrentKey('');
      setNewKey('');
    } catch {
      setKeyError('A network error occurred');
    } finally {
      setIsChangingKey(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setIsDeletingAccount(true);

    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: deleteConfirmKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete account');
        return;
      }

      toast.success('Your account and vault have been permanently deleted');
      onLogout();
    } catch {
      setDeleteError('A network error occurred');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all items in Trash? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/items/trash/empty', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Trash emptied');
        fetchStorageUsage();
      } else {
        toast.error('Failed to empty trash');
      }
    } catch {
      toast.error('Could not empty trash');
    }
  };

  const handleExportData = () => {
    window.location.href = '/api/user/export';
    toast.success('Preparing JSON metadata export...');
  };

  const usedBytes = storageUsage?.usedBytes || 0;
  const limitBytes = storageUsage?.limitBytes || SITE_CONFIG.defaultUserStorageLimitBytes;
  const usagePercentage = Math.min(100, Math.round((usedBytes / limitBytes) * 100));
  const displayUsername = user.displayUsername || user.username;

  return (
    <div className="max-w-3xl mx-auto space-y-7 pb-16">
      {/* Page Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#5481aa] dark:text-[#8bb5dc] mb-1">
          PROFILE &amp; VAULT PREFERENCES
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f172b] dark:text-white">
          Profile &amp; Settings
        </h2>
        <p className="text-xs sm:text-sm text-[#53667a] dark:text-[#a4b5ce] mt-1">
          Manage your public profile picture (max 100 KB), private login key, and temporary vault storage.
        </p>
      </div>

      {/* 1. PROFILE PICTURE (DP) & IDENTITY SECTION */}
      <div className="bg-white dark:bg-[#19263a] rounded-[24px] border border-[#dbe6f2] dark:border-[#34465e] qs-panel-shadow overflow-hidden">
        <div className="bg-gradient-to-r from-[#f1f7ff] via-[#fbfdff] to-white dark:from-[#1a304b] dark:via-[#19263a] dark:to-[#19263a] border-b border-[#e3ecf7] dark:border-[#34465e] px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf4ff] dark:bg-[#223b54] border border-[#dbe9fa] dark:border-[#3b5675] text-[#1677df] dark:text-[#78bbff] flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#15263e] dark:text-white">
                Public Profile &amp; Identity
              </h3>
              <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                Visible to other users in Chats as <span className="font-semibold text-[#1677df] dark:text-[#78bbff]">@{displayUsername}</span>
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#f1f6fd] dark:bg-[#203149] text-[#5481aa] dark:text-[#8bb5dc] border border-[#dce8f6] dark:border-[#3b5675]">
            Max DP: 100 KB
          </span>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Profile Picture (DP) Uploader */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-5 border-b border-[#e5edf6] dark:border-[#34465e]">
            <div className="relative group shrink-0">
              {avatarPreviewUrl || user.avatarUrl ? (
                <img
                  src={avatarPreviewUrl || user.avatarUrl || ''}
                  alt={displayUsername}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#cde3fa] dark:border-[#3b5675] shadow-xs"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#eaf4ff] to-[#dbeafe] dark:from-[#223b54] dark:to-[#1d304a] border-2 border-[#cde3fa] dark:border-[#3b5675] text-[#1677df] dark:text-[#78bbff] font-bold text-xl flex items-center justify-center uppercase">
                  {displayUsername.slice(0, 2)}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-[#1677df] text-white flex items-center justify-center shadow-md hover:bg-[#1264c0] transition-colors cursor-pointer"
                title="Choose profile picture"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#0f172b] dark:text-white">
                    Profile Picture (DP)
                  </p>
                  <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                    JPEG, PNG, or WebP • Strict maximum size <span className="font-semibold text-[#0f172b] dark:text-white">100 KB (102,400 bytes)</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-xs gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Choose Image</span>
                  </Button>

                  {user.avatarUrl && !selectedAvatarFile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      isLoading={isRemovingAvatar}
                      className="text-xs text-[#e11d48] hover:text-[#be123c]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {selectedAvatarFile && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#f8fbff] dark:bg-[#152236] border border-[#dce7f4] dark:border-[#34465e]">
                  <div className="text-xs">
                    <span className="font-semibold text-[#0f172b] dark:text-white">
                      {selectedAvatarFile.name}
                    </span>{' '}
                    <span
                      className={`font-mono font-semibold ${
                        selectedAvatarFile.size > MAX_AVATAR_BYTES
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      ({(selectedAvatarFile.size / 1024).toFixed(1)} KB / 100 KB)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedAvatarFile.size > MAX_AVATAR_BYTES && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAutoCompressAvatar}
                        isLoading={isCompressingAvatar}
                        className="text-xs gap-1 h-7"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto-Resize &lt;100 KB</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAvatarFile(null);
                        setAvatarError(null);
                        if (avatarPreviewUrl) {
                          URL.revokeObjectURL(avatarPreviewUrl);
                          setAvatarPreviewUrl(null);
                        }
                        if (avatarInputRef.current) avatarInputRef.current.value = '';
                      }}
                      className="text-xs h-7"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUploadAvatar}
                      disabled={selectedAvatarFile.size > MAX_AVATAR_BYTES}
                      isLoading={isUploadingAvatar}
                      className="text-xs h-7"
                    >
                      Save DP
                    </Button>
                  </div>
                </div>
              )}

              {avatarError && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{avatarError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Login Key Management */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-semibold text-[#0f172b] dark:text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#1677df]" />
                Private Login Key
              </p>
              <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                Rotate your secret login key. Keys are never stored in plain text and cannot be recovered if lost.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowKeyModal(true)}
              className="self-start sm:self-auto text-xs shrink-0"
            >
              Change Login Key
            </Button>
          </div>

          {/* Sign Out */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm pt-4 border-t border-[#e5edf6] dark:border-[#34465e]">
            <div>
              <p className="font-semibold text-[#0f172b] dark:text-white">Sign Out</p>
              <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                End your current session and invalidate active tokens on this account
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="self-start sm:self-auto text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. STORAGE QUOTA SECTION */}
      <div className="bg-white dark:bg-[#19263a] rounded-[24px] border border-[#dbe6f2] dark:border-[#34465e] qs-panel-shadow overflow-hidden">
        <div className="bg-gradient-to-r from-[#f1f7ff] via-[#fbfdff] to-white dark:from-[#1a304b] dark:via-[#19263a] dark:to-[#19263a] border-b border-[#e3ecf7] dark:border-[#34465e] px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ecfdf5] dark:bg-[#193b2d] border border-[#cce9dc] dark:border-[#2e634c] text-[#059669] dark:text-[#34d399] flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#15263e] dark:text-white">
                Temporary Vault Storage Quota
              </h3>
              <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                Items automatically free up quota when they expire
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchStorageUsage}
            isLoading={isLoadingStorage}
            className="text-xs h-8"
          >
            Refresh
          </Button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#65758b] dark:text-[#a4b5ce]">
                Active Vault Usage
              </span>
              <span className="bg-[#eaf4ff] dark:bg-[#203954] text-[#1677df] dark:text-[#78bbff] border border-[#d8e9fb] dark:border-[#344b65] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                AUTO-EXPIRING
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#244363] dark:text-[#abc9e7] tabular-nums">
                {formatBytes(usedBytes)}
              </span>
              <span className="text-xs font-medium text-[#65758b] dark:text-[#a4b5ce] tabular-nums">
                of {formatBytes(limitBytes)} quota ({usagePercentage}%)
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#e6eff9] dark:bg-[#2a405d] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercentage > 90
                    ? 'bg-gradient-to-r from-rose-500 to-red-600'
                    : usagePercentage > 75
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-[#38bdf8] to-[#1677df]'
                }`}
                style={{ width: `${Math.max(2, usagePercentage)}%` }}
              />
            </div>
          </div>

          {storageUsage && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-[#f8fbff] dark:bg-[#17263b] border border-[#dfeaf7] dark:border-[#344b65] text-center">
                <FileText className="w-4 h-4 text-[#1677df] dark:text-[#60a5fa] mx-auto mb-1" />
                <p className="text-base font-bold text-[#0f172b] dark:text-white tabular-nums">
                  {storageUsage.breakdown.texts}
                </p>
                <p className="text-[11px] font-medium text-[#65758b] dark:text-[#a4b5ce]">Texts &amp; Notes</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8fbff] dark:bg-[#17263b] border border-[#dfeaf7] dark:border-[#344b65] text-center">
                <ImageIcon className="w-4 h-4 text-[#059669] dark:text-[#34d399] mx-auto mb-1" />
                <p className="text-base font-bold text-[#0f172b] dark:text-white tabular-nums">
                  {storageUsage.breakdown.photos}
                </p>
                <p className="text-[11px] font-medium text-[#65758b] dark:text-[#a4b5ce]">Photos</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8fbff] dark:bg-[#17263b] border border-[#dfeaf7] dark:border-[#344b65] text-center">
                <Film className="w-4 h-4 text-[#ea580c] dark:text-[#fb923c] mx-auto mb-1" />
                <p className="text-base font-bold text-[#0f172b] dark:text-white tabular-nums">
                  {storageUsage.breakdown.videos}
                </p>
                <p className="text-[11px] font-medium text-[#65758b] dark:text-[#a4b5ce]">Videos</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8fbff] dark:bg-[#17263b] border border-[#dfeaf7] dark:border-[#344b65] text-center">
                <FileCode className="w-4 h-4 text-[#7c3aed] dark:text-[#c4b5fd] mx-auto mb-1" />
                <p className="text-base font-bold text-[#0f172b] dark:text-white tabular-nums">
                  {storageUsage.breakdown.files}
                </p>
                <p className="text-[11px] font-medium text-[#65758b] dark:text-[#a4b5ce]">Files &amp; Docs</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2B. OWNER-ONLY GOOGLE DRIVE STORAGE ADMINISTRATION */}
      {user.isAdmin && (
        <div className="bg-white dark:bg-[#19263a] rounded-[24px] border border-[#dbe6f2] dark:border-[#34465e] qs-panel-shadow overflow-hidden">
          <div className="bg-gradient-to-r from-[#f1f7ff] via-[#fbfdff] to-white dark:from-[#1a304b] dark:via-[#19263a] dark:to-[#19263a] border-b border-[#e3ecf7] dark:border-[#34465e] px-5 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#eaf4ff] dark:bg-[#223b54] border border-[#dbe9fa] dark:border-[#3b5675] text-[#1677df] dark:text-[#78bbff] flex items-center justify-center shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#15263e] dark:text-white">
                  Storage Administrator — Google Drive Pool
                </h3>
                <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                  Owner-only central 15 GB storage backend configuration
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchGdriveStatus}
              isLoading={isLoadingGdrive}
              className="text-xs h-8"
            >
              Check Status
            </Button>
          </div>

          <div className="p-5 sm:p-6">
            {gdriveStatus?.connected ? (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#059669] dark:text-[#34d399] bg-[#ecfdf5] dark:bg-[#193b2d] px-3.5 py-2.5 rounded-2xl border border-[#cce9dc] dark:border-[#2e634c]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Connected to Owner Google Drive</span>
                  {gdriveStatus.quota?.accountEmail && (
                    <span className="font-normal text-[#53667a] dark:text-[#a4b5ce] ml-auto">
                      {gdriveStatus.quota.accountEmail}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#53667a] dark:text-[#a4b5ce] leading-relaxed">
                  Uploaded photos, videos, and documents are stored in the dedicated <span className="font-semibold text-[#0f172b] dark:text-white">Global Send</span> Google Drive folder and permanently purged when items expire.
                </p>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectGdrive}
                    isLoading={isDisconnectingGdrive}
                    className="text-xs text-[#e11d48] dark:text-[#fb7185] hover:bg-[#fff1f2] dark:hover:bg-[#3e2124] border-[#fecdd3] dark:border-[#7f2d36]"
                  >
                    Disconnect Google Drive
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-start gap-2.5 text-xs text-[#805719] dark:text-[#e7c68d] bg-[#fff8e9] dark:bg-[#342c1d] p-3.5 rounded-2xl border border-[#efcc8a] dark:border-[#6d5630]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Owner Google Drive Not Connected</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      {gdriveStatus?.error ||
                        'Connect the administrator Google account once to provide the 15 GB storage pool for Global Send.'}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConnectGdrive}
                  disabled={!gdriveStatus?.isConfigured}
                  className="text-xs gap-1.5"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Connect Owner Google Drive</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. APPEARANCE SECTION */}
      <div className="bg-white dark:bg-[#19263a] rounded-[24px] border border-[#dbe6f2] dark:border-[#34465e] p-5 sm:p-6 qs-panel-shadow">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#fff7ed] dark:bg-[#3d291a] border border-[#fed7aa] dark:border-[#694425] text-[#ea580c] dark:text-[#fb923c] flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#15263e] dark:text-white">
                Appearance
              </h3>
              <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                Choose interface color theme
              </p>
            </div>
          </div>

          <div className="inline-flex p-1 bg-[#edf4fb] dark:bg-[#142237] border border-[#dce7f4] dark:border-[#34465e] rounded-2xl">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-[#1677df] shadow-xs border border-[#dce8f5]'
                  : 'text-[#53667a] hover:text-[#1677df]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#1d304a] text-[#78bbff] shadow-xs border border-[#3b5675]'
                  : 'text-[#65758b] dark:text-[#a4b5ce] hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. PRIVACY, EXPORT & DANGER ZONE */}
      <div className="bg-white dark:bg-[#19263a] rounded-[24px] border border-[#dbe6f2] dark:border-[#34465e] qs-panel-shadow overflow-hidden">
        <div className="bg-gradient-to-r from-[#fff1f2] via-[#fff8f8] to-white dark:from-[#3e2124] dark:via-[#19263a] dark:to-[#19263a] border-b border-[#fecdd3]/60 dark:border-[#34465e] px-5 sm:px-6 py-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#fff1f2] dark:bg-[#3e2124] border border-[#fecdd3] dark:border-[#7f2d36] text-[#e11d48] dark:text-[#fb7185] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#15263e] dark:text-white">
              Data &amp; Privacy
            </h3>
            <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
              Export metadata, empty trash, or permanently erase your account
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-semibold text-[#0f172b] dark:text-white">Export Vault Metadata</p>
              <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                Download a JSON summary of your active saved notes, links, and file metadata
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportData}
              className="self-start sm:self-auto text-xs gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm pt-4 border-t border-[#e5edf6] dark:border-[#34465e]">
            <div>
              <p className="font-semibold text-[#0f172b] dark:text-white">Empty Trash</p>
              <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                Permanently delete all items currently in Trash and remove them from storage
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEmptyTrash}
              className="self-start sm:self-auto text-xs text-[#e11d48] hover:text-[#be123c] shrink-0"
            >
              Empty Trash
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm pt-4 border-t border-[#e5edf6] dark:border-[#34465e]">
            <div>
              <p className="font-semibold text-[#e11d48] dark:text-[#fb7185]">Delete Account</p>
              <p className="text-xs text-[#65758b] dark:text-[#a4b5ce]">
                Permanently erase your account, all saved items, chats, and uploaded files
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="self-start sm:self-auto text-xs shrink-0"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* 5. ABOUT GLOBAL SEND */}
      <div className="bg-gradient-to-br from-[#f1f7ff] via-white to-[#f8fbff] dark:from-[#192e49] dark:via-[#19263a] dark:to-[#142033] rounded-[24px] border border-[#dce7f4] dark:border-[#34465e] p-5 qs-card-shadow flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <Logo size={48} className="rounded-xl shadow-xs" withGlow />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start">
            <h4 className="font-bold text-sm text-[#0f172b] dark:text-white">
              {SITE_CONFIG.name}
            </h4>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#eaf4ff] dark:bg-[#203954] text-[#1677df] dark:text-[#78bbff] border border-[#d8e9fb] dark:border-[#344b65] font-semibold self-center">
              v2.0.0
            </span>
          </div>
          <p className="text-xs text-[#65758b] dark:text-[#a4b5ce] mt-1">
            {SITE_CONFIG.tagline}
          </p>
        </div>
      </div>

      {/* CHANGE LOGIN KEY MODAL */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        title="Change Private Login Key"
        subtitle="Enter your current login key and choose a new unique login key (8–128 characters)."
      >
        <form onSubmit={handleChangeKey} className="space-y-4">
          {keyError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 text-xs text-red-600">
              {keyError}
            </div>
          )}

          <Input
            label="Current Login Key"
            type="password"
            value={currentKey}
            onChange={(e) => setCurrentKey(e.target.value)}
            required
          />

          <Input
            label="New Private Login Key"
            type="password"
            placeholder="8–128 characters (cannot be recovered if lost)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowKeyModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isChangingKey}>
              Update Login Key
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE ACCOUNT MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account Permanently"
        subtitle="This action is irreversible. All your files, chats, and saved items will be deleted."
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          {deleteError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 text-xs text-red-600">
              {deleteError}
            </div>
          )}

          <p className="text-xs text-[#86868b] dark:text-[#98989d]">
            Please enter your private login key to confirm permanent account deletion:
          </p>

          <Input
            label="Confirm Private Login Key"
            type="password"
            value={deleteConfirmKey}
            onChange={(e) => setDeleteConfirmKey(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              isLoading={isDeletingAccount}
            >
              Confirm Permanent Deletion
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
