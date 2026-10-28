'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Sun,
  Moon,
  LogOut,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Sparkles,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { User as UserType, StorageUsage } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { SITE_CONFIG, PRESET_SECURITY_QUESTIONS } from '@/config/site';
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

  // Security question modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionCurrentKey, setQuestionCurrentKey] = useState('');
  const [selectedQuestionPreset, setSelectedQuestionPreset] = useState<string>(PRESET_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [showNewAnswer, setShowNewAnswer] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

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
      setAvatarError('Only JPEG, PNG, and WebP images are allowed.');
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

      toast.success('Profile photo updated');
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
        toast.success('Profile photo removed');
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
    if (!confirm('Disconnect Google Drive? Active file storage will stop working until reconnected.')) return;
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

      toast.success('Login key updated');
      setShowKeyModal(false);
      setCurrentKey('');
      setNewKey('');
    } catch {
      setKeyError('A network error occurred');
    } finally {
      setIsChangingKey(false);
    }
  };

  const handleSaveSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError(null);

    const activeQuestion =
      selectedQuestionPreset === 'custom' ? customQuestion.trim() : selectedQuestionPreset;

    if (!activeQuestion || activeQuestion.length < 10) {
      setQuestionError('Security question must be at least 10 characters long.');
      return;
    }

    if (!newAnswer.trim() || newAnswer.trim().length < 4) {
      setQuestionError('Security answer must be at least 4 characters long.');
      return;
    }

    if (user.hasSecurityQuestion && !questionCurrentKey) {
      setQuestionError('Current login key is required to update your security question.');
      return;
    }

    setIsSavingQuestion(true);

    try {
      const res = await fetch('/api/user/security-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentKey: questionCurrentKey,
          question: activeQuestion,
          answer: newAnswer.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setQuestionError(data.error || 'Failed to update security question');
        return;
      }

      toast.success('Security question updated');
      const nowIso = new Date().toISOString();
      if (onUserUpdated) {
        onUserUpdated({
          ...user,
          hasSecurityQuestion: true,
          securityQuestionUpdatedAt: nowIso,
        });
      }
      setShowQuestionModal(false);
      setQuestionCurrentKey('');
      setNewAnswer('');
      setCustomQuestion('');
    } catch {
      setQuestionError('A network error occurred');
    } finally {
      setIsSavingQuestion(false);
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

      toast.success('Account deleted');
      onLogout();
    } catch {
      setDeleteError('A network error occurred');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Permanently delete all items in Recently Deleted? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/items/trash/empty', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Recently Deleted emptied');
        fetchStorageUsage();
      } else {
        toast.error('Failed to empty Recently Deleted');
      }
    } catch {
      toast.error('Could not empty Recently Deleted');
    }
  };

  const handleExportData = () => {
    window.location.href = '/api/user/export';
    toast.success('Preparing JSON metadata export…');
  };

  const usedBytes = storageUsage?.usedBytes || 0;
  const limitBytes = storageUsage?.limitBytes || SITE_CONFIG.defaultUserStorageLimitBytes;
  const usagePercentage = Math.min(100, Math.round((usedBytes / limitBytes) * 100));
  const displayUsername = user.displayUsername || user.username;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* iOS Large Title Header */}
      <div>
        <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.025em] text-[#1c1c1e] dark:text-[#f5f5f7]">
          Settings
        </h2>
      </div>

      {/* 1. APPLE ACCOUNT-STYLE PROFILE CARD */}
      <section className="space-y-1.5">
        <div className="ios-card rounded-[16px] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
          {/* Top Identity Row */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              {avatarPreviewUrl || user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreviewUrl || user.avatarUrl || ''}
                  alt={displayUsername}
                  className="w-16 h-16 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.12]"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#007aff]/12 dark:bg-[#0a84ff]/20 text-[#007aff] dark:text-[#409cff] font-bold text-[20px] flex items-center justify-center uppercase">
                  {displayUsername.slice(0, 2)}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 w-6.5 h-6.5 rounded-full bg-[#007aff] dark:bg-[#0a84ff] text-white flex items-center justify-center shadow-xs cursor-pointer"
                title="Change Profile Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-[18px] font-semibold tracking-[-0.018em] text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                @{displayUsername}
              </h3>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">
                Key-Protected Vault · Profile photo max 100 KB
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
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
              >
                Edit Photo
              </Button>
              {user.avatarUrl && !selectedAvatarFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveAvatar}
                  isLoading={isRemovingAvatar}
                  className="text-[#ff3b30] hover:bg-[#ff3b30]/10 w-8 h-8"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Pending Avatar Selection Bar */}
          {selectedAvatarFile && (
            <div className="px-4 sm:px-5 py-3 bg-[#767680]/[0.05] dark:bg-[#767680]/[0.14] flex flex-wrap items-center justify-between gap-2">
              <div className="text-[13px]">
                <span className="font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {selectedAvatarFile.name}
                </span>{' '}
                <span
                  className={`font-mono text-[12px] tabular-nums ${
                    selectedAvatarFile.size > MAX_AVATAR_BYTES
                      ? 'text-[#ff3b30] font-semibold'
                      : 'text-[#34c759]'
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
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Compress &lt;100 KB</span>
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
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUploadAvatar}
                  disabled={selectedAvatarFile.size > MAX_AVATAR_BYTES}
                  isLoading={isUploadingAvatar}
                >
                  Save Photo
                </Button>
              </div>
            </div>
          )}

          {avatarError && (
            <div className="px-4 sm:px-5 py-2.5 bg-[#ff3b30]/10 text-[12px] text-[#ff3b30] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{avatarError}</span>
            </div>
          )}

          {/* Private Login Key Row */}
          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-[7px] bg-[#007aff] text-white flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                  Private Login Key
                </p>
                <p className="text-[12px] text-[#8e8e93] truncate">
                  Rotate your secret login key
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowKeyModal(true)}
            >
              Change Key
            </Button>
          </div>

          {/* Security Question Row */}
          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 border-t border-black/[0.05] dark:border-white/[0.05]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-[7px] bg-[#34c759] text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                  Security Question &amp; Recovery
                </p>
                <p className="text-[12px] text-[#8e8e93] truncate">
                  {user.securityQuestionUpdatedAt
                    ? `Last updated: ${new Date(user.securityQuestionUpdatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
                    : user.hasSecurityQuestion
                    ? 'Security question configured'
                    : 'Not configured — set recovery question'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuestionError(null);
                setShowQuestionModal(true);
              }}
            >
              {user.hasSecurityQuestion ? 'Change Question' : 'Set Question'}
            </Button>
          </div>

          {/* Appearance Row */}
          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-[7px] bg-[#5856d6] text-white flex items-center justify-center shrink-0">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                  Appearance
                </p>
                <p className="text-[12px] text-[#8e8e93]">
                  Light or Dark interface style
                </p>
              </div>
            </div>

            <SegmentedControl
              size="sm"
              value={theme}
              onChange={(v) => handleThemeChange(v)}
              options={[
                { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
                { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
              ]}
            />
          </div>
        </div>
      </section>

      {/* 2. iOS-STYLE VAULT STORAGE SECTION */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-medium uppercase tracking-wide text-[#8e8e93]">
            Vault Storage
          </span>
          <button
            type="button"
            onClick={fetchStorageUsage}
            className="text-[12px] text-[#007aff] dark:text-[#0a84ff] inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingStorage ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="ios-card rounded-[16px] p-4 sm:p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[15px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                Temporary Cloud Vault
              </span>
            </div>
            <span className="text-[13px] text-[#8e8e93] tabular-nums">
              {formatBytes(usedBytes)} of {formatBytes(limitBytes)} used
            </span>
          </div>

          {/* iPhone Storage-style Bar */}
          <div className="w-full h-2.5 bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercentage > 90
                  ? 'bg-[#ff3b30]'
                  : usagePercentage > 75
                  ? 'bg-[#ff9500]'
                  : 'bg-[#007aff] dark:bg-[#0a84ff]'
              }`}
              style={{ width: `${Math.max(2, usagePercentage)}%` }}
            />
          </div>

          {storageUsage && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-[12px] bg-[#767680]/[0.06] dark:bg-[#767680]/[0.16] flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] tabular-nums leading-tight">
                    {storageUsage.breakdown.texts}
                  </p>
                  <p className="text-[11px] text-[#8e8e93] truncate">Notes</p>
                </div>
              </div>

              <div className="p-3 rounded-[12px] bg-[#767680]/[0.06] dark:bg-[#767680]/[0.16] flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34c759] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] tabular-nums leading-tight">
                    {storageUsage.breakdown.photos}
                  </p>
                  <p className="text-[11px] text-[#8e8e93] truncate">Photos</p>
                </div>
              </div>

              <div className="p-3 rounded-[12px] bg-[#767680]/[0.06] dark:bg-[#767680]/[0.16] flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#af52de] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] tabular-nums leading-tight">
                    {storageUsage.breakdown.videos}
                  </p>
                  <p className="text-[11px] text-[#8e8e93] truncate">Videos</p>
                </div>
              </div>

              <div className="p-3 rounded-[12px] bg-[#767680]/[0.06] dark:bg-[#767680]/[0.16] flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#007aff] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] tabular-nums leading-tight">
                    {storageUsage.breakdown.files}
                  </p>
                  <p className="text-[11px] text-[#8e8e93] truncate">Documents</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. OWNER-ONLY GOOGLE DRIVE STORAGE POOL */}
      {user.isAdmin && (
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-medium uppercase tracking-wide text-[#8e8e93]">
              Administrator Storage Backend
            </span>
          </div>

          <div className="ios-card rounded-[16px] p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#007aff]/12 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center shrink-0">
                  <Cloud className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                    Google Drive Storage Pool
                  </h3>
                  <p className="text-[12px] text-[#8e8e93]">
                    Central 15 GB storage backend
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchGdriveStatus}
                isLoading={isLoadingGdrive}
              >
                Check Status
              </Button>
            </div>

            {gdriveStatus?.connected ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#34c759] dark:text-[#30d158] bg-[#34c759]/10 px-3.5 py-2.5 rounded-[12px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Connected to Google Drive</span>
                  {gdriveStatus.quota?.accountEmail && (
                    <span className="text-[12px] text-[#8e8e93] ml-auto">
                      {gdriveStatus.quota.accountEmail}
                    </span>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectGdrive}
                    isLoading={isDisconnectingGdrive}
                    className="text-[#ff3b30]"
                  >
                    Disconnect Google Drive
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-2.5 text-[12px] text-[#ff9500] bg-[#ff9500]/10 p-3 rounded-[12px]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {gdriveStatus?.error ||
                      'Connect the administrator Google account to enable the central storage pool.'}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConnectGdrive}
                  disabled={!gdriveStatus?.isConfigured}
                >
                  <Cloud className="w-4 h-4" />
                  <span>Connect Google Drive</span>
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. DATA & PRIVACY GROUPED LIST */}
      <section className="space-y-1.5">
        <div className="px-1">
          <span className="text-[12px] font-medium uppercase tracking-wide text-[#8e8e93]">
            Data &amp; Privacy
          </span>
        </div>

        <div className="ios-card rounded-[16px] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                Export Metadata
              </p>
              <p className="text-[12px] text-[#8e8e93]">
                Download a JSON archive of your active notes, links, and file metadata
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportData}
              className="shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </Button>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                Empty Recently Deleted
              </p>
              <p className="text-[12px] text-[#8e8e93]">
                Permanently remove all items in Recently Deleted and reclaim quota
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEmptyTrash}
              className="text-[#ff3b30] shrink-0"
            >
              Empty
            </Button>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                Sign Out
              </p>
              <p className="text-[12px] text-[#8e8e93]">
                End your session on this browser
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-[#ff3b30] dark:text-[#ff453a]">
                Delete Vault &amp; Account
              </p>
              <p className="text-[12px] text-[#8e8e93]">
                Permanently erase your account, files, notes, and messages
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0"
            >
              Delete
            </Button>
          </div>
        </div>
      </section>

      {/* Footer Version */}
      <div className="pt-2 flex items-center justify-center gap-2 text-[12px] text-[#8e8e93]">
        <Logo size={18} />
        <span>{SITE_CONFIG.name} · v2.0</span>
      </div>

      {/* CHANGE LOGIN KEY MODAL */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        title="Change Login Key"
        subtitle="Enter your current key and choose a new private login key (8–128 characters)."
      >
        <form onSubmit={handleChangeKey} className="space-y-4">
          {keyError && (
            <div className="p-3 rounded-[12px] bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[13px] text-[#ff3b30]">
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowKeyModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isChangingKey}>
              Save Key
            </Button>
          </div>
        </form>
      </Modal>

      {/* CHANGE SECURITY QUESTION MODAL */}
      <Modal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        title="Security Question & Recovery"
        subtitle="Your security answer allows you to reset your private login key if lost."
      >
        <form onSubmit={handleSaveSecurityQuestion} className="space-y-4">
          {questionError && (
            <div className="p-3 rounded-[12px] bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[13px] text-[#ff3b30]">
              {questionError}
            </div>
          )}

          {user.hasSecurityQuestion && (
            <Input
              label="Current Login Key"
              type="password"
              placeholder="Enter current key to verify ownership"
              value={questionCurrentKey}
              onChange={(e) => setQuestionCurrentKey(e.target.value)}
              required
            />
          )}

          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5">
              Select Question
            </label>
            <select
              value={selectedQuestionPreset}
              onChange={(e) => setSelectedQuestionPreset(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[12px] text-[13px] bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            >
              {PRESET_SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q} className="dark:bg-[#1c1c1e]">
                  {q}
                </option>
              ))}
              <option value="custom" className="dark:bg-[#1c1c1e]">
                -- Write a custom question... --
              </option>
            </select>
          </div>

          {selectedQuestionPreset === 'custom' && (
            <div>
              <Input
                label="Custom Question (10-150 characters)"
                placeholder="e.g. What was the name of your first musical instrument?"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <div className="relative">
              <Input
                label="Security Answer"
                type={showNewAnswer ? 'text' : 'password'}
                placeholder="Enter memorable answer"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewAnswer(!showNewAnswer)}
                className="absolute right-3 top-[33px] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                aria-label={showNewAnswer ? 'Hide answer' : 'Show answer'}
              >
                {showNewAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#86868b] mt-1.5">
              Answers are case-insensitive and tolerate whitespace. Never shared or visible.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowQuestionModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSavingQuestion}>
              Save Question
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE ACCOUNT MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        subtitle="This action cannot be undone. All files, notes, and messages will be permanently deleted."
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          {deleteError && (
            <div className="p-3 rounded-[12px] bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[13px] text-[#ff3b30]">
              {deleteError}
            </div>
          )}

          <p className="text-[13px] text-[#6c6c70] dark:text-[#98989d]">
            Enter your private login key to confirm permanent deletion:
          </p>

          <Input
            label="Private Login Key"
            type="password"
            value={deleteConfirmKey}
            onChange={(e) => setDeleteConfirmKey(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2">
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
              Delete Permanently
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
