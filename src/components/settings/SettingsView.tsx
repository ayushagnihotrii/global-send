'use client';

import React, { useState, useEffect } from 'react';
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
}

export function SettingsView({ user, onLogout }: SettingsViewProps) {
  const { toast } = useToast();
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Google Drive Integration state
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
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Theme preference
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check current theme
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    }
  }, []);

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
    fetchGdriveStatus();
  }, []);

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
    if (!confirm('Are you sure you want to disconnect Google Drive? Active file links may stop working.')) return;
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Failed to update password');
        return;
      }

      toast.success('Password updated successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      setPasswordError('A network error occurred');
    } finally {
      setIsChangingPassword(false);
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
        body: JSON.stringify({ password: deleteConfirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete account');
        return;
      }

      toast.success('Your account and locker have been deleted');
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
    toast.success('Preparing data export download...');
  };

  const usedBytes = storageUsage?.usedBytes || 0;
  const limitBytes = storageUsage?.limitBytes || SITE_CONFIG.defaultUserStorageLimitBytes;
  const usagePercentage = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-white">
          Settings
        </h2>
        <p className="text-xs sm:text-sm text-[#86868b] dark:text-[#98989d] mt-1">
          Manage your QuickVault account, storage quota, appearance, and privacy.
        </p>
      </div>

      {/* 1. ACCOUNT SECTION */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-[#e5e5ea] dark:border-[#38383a] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#e5e5ea]/60 dark:border-[#38383a]/60">
          <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
              Account
            </h3>
            <p className="text-xs text-[#86868b] dark:text-[#98989d]">
              Signed in as <span className="font-medium text-[#1d1d1f] dark:text-white">@{user.username}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm pt-1">
          <div>
            <p className="font-medium text-[#1d1d1f] dark:text-white">Account Password</p>
            <p className="text-xs text-[#86868b] dark:text-[#98989d]">
              Update your account password
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
            className="self-start sm:self-auto text-xs"
          >
            Change Password
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm pt-3 border-t border-[#e5e5ea]/40 dark:border-[#38383a]/40">
          <div>
            <p className="font-medium text-[#1d1d1f] dark:text-white">Sign Out</p>
            <p className="text-xs text-[#86868b] dark:text-[#98989d]">
              End current session on this device
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

      {/* 2. STORAGE QUOTA SECTION */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-[#e5e5ea] dark:border-[#38383a] p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]/60 dark:border-[#38383a]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#34c759]/10 text-[#34c759] flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                Cloud Locker Storage
              </h3>
              <p className="text-xs text-[#86868b] dark:text-[#98989d]">
                Private Cloudflare R2 storage allocation
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchStorageUsage}
            isLoading={isLoadingStorage}
            className="text-xs h-7"
          >
            Refresh
          </Button>
        </div>

        {/* Storage Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs sm:text-sm font-medium">
            <span className="text-[#1d1d1f] dark:text-white">
              {formatBytes(usedBytes)} used
            </span>
            <span className="text-[#86868b] dark:text-[#98989d]">
              of {formatBytes(limitBytes)} quota ({usagePercentage}%)
            </span>
          </div>

          <div className="w-full h-3 bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                usagePercentage > 90
                  ? 'bg-[#ff3b30]'
                  : usagePercentage > 75
                  ? 'bg-[#ff9500]'
                  : 'bg-[#0071e3]'
              }`}
              style={{ width: `${Math.max(2, usagePercentage)}%` }}
            />
          </div>
        </div>

        {/* Content Count Breakdown */}
        {storageUsage && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-[#f8f8fa] dark:bg-[#252528] text-center">
              <FileText className="w-4 h-4 text-[#0071e3] mx-auto mb-1" />
              <p className="text-base font-bold text-[#1d1d1f] dark:text-white">
                {storageUsage.breakdown.texts}
              </p>
              <p className="text-[11px] text-[#86868b] dark:text-[#98989d]">Texts & Notes</p>
            </div>

            <div className="p-3 rounded-2xl bg-[#f8f8fa] dark:bg-[#252528] text-center">
              <ImageIcon className="w-4 h-4 text-[#34c759] mx-auto mb-1" />
              <p className="text-base font-bold text-[#1d1d1f] dark:text-white">
                {storageUsage.breakdown.photos}
              </p>
              <p className="text-[11px] text-[#86868b] dark:text-[#98989d]">Photos</p>
            </div>

            <div className="p-3 rounded-2xl bg-[#f8f8fa] dark:bg-[#252528] text-center">
              <Film className="w-4 h-4 text-[#ff9500] mx-auto mb-1" />
              <p className="text-base font-bold text-[#1d1d1f] dark:text-white">
                {storageUsage.breakdown.videos}
              </p>
              <p className="text-[11px] text-[#86868b] dark:text-[#98989d]">Videos</p>
            </div>

            <div className="p-3 rounded-2xl bg-[#f8f8fa] dark:bg-[#252528] text-center">
              <FileCode className="w-4 h-4 text-[#af52de] mx-auto mb-1" />
              <p className="text-base font-bold text-[#1d1d1f] dark:text-white">
                {storageUsage.breakdown.files}
              </p>
              <p className="text-[11px] text-[#86868b] dark:text-[#98989d]">Files & Docs</p>
            </div>
          </div>
        )}
      </div>

      {/* 2B. GOOGLE DRIVE STORAGE INTEGRATION */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-[#e5e5ea] dark:border-[#38383a] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]/60 dark:border-[#38383a]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4285f4]/10 text-[#4285f4] flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                Google Drive Storage
              </h3>
              <p className="text-xs text-[#86868b] dark:text-[#98989d]">
                15 GB Personal Cloud Storage Integration
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchGdriveStatus}
            isLoading={isLoadingGdrive}
            className="text-xs h-7"
          >
            Check Status
          </Button>
        </div>

        {gdriveStatus?.connected ? (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Connected to Google Drive</span>
              {gdriveStatus.quota?.accountEmail && (
                <span className="font-normal text-zinc-600 dark:text-zinc-400 ml-auto">
                  {gdriveStatus.quota.accountEmail}
                </span>
              )}
            </div>

            <p className="text-xs text-[#86868b] dark:text-[#98989d] leading-relaxed">
              Uploaded photos, videos, and documents are stored in your dedicated <span className="font-medium text-[#1d1d1f] dark:text-white">Global Send</span> Google Drive folder.
            </p>

            {gdriveStatus.quota?.note && (
              <p className="text-[11px] text-[#86868b] dark:text-[#98989d] bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl">
                {gdriveStatus.quota.note}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDisconnectGdrive}
                isLoading={isDisconnectingGdrive}
                className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900"
              >
                Disconnect Google Drive
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Google Drive Not Connected</p>
                <p className="text-[11px] mt-0.5 text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                  {gdriveStatus?.error ||
                    'Connect your personal Google account to use 15 GB of cloud storage for uploaded files.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#86868b] dark:text-[#98989d] leading-relaxed">
              Files you upload from your phone or desktop are saved directly into your personal Google Drive account in a private folder. Only the Global Send server interacts with Google Drive—ordinary users and devices do not need to sign in with Google.
            </p>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConnectGdrive}
              disabled={!gdriveStatus?.isConfigured}
              className="text-xs gap-1.5"
            >
              <Cloud className="w-4 h-4" />
              <span>Connect Google Drive</span>
            </Button>
            {!gdriveStatus?.isConfigured && (
              <p className="text-[11px] text-zinc-400">
                (Add GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET in .env.local to enable)
              </p>
            )}
          </div>
        )}
      </div>

      {/* 3. APPEARANCE SECTION */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-[#e5e5ea] dark:border-[#38383a] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff9500]/10 text-[#ff9500] flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                Appearance
              </h3>
              <p className="text-xs text-[#86868b] dark:text-[#98989d]">
                Choose interface color theme
              </p>
            </div>
          </div>

          <div className="inline-flex p-1 bg-[#e5e5ea]/70 dark:bg-[#2c2c2e] rounded-xl">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'light'
                  ? 'bg-white text-[#1d1d1f] shadow-xs font-semibold'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-[#1c1c1e] text-white shadow-xs font-semibold'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. PRIVACY, EXPORT & DANGER ZONE */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-[#e5e5ea] dark:border-[#38383a] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#e5e5ea]/60 dark:border-[#38383a]/60">
          <div className="w-10 h-10 rounded-2xl bg-[#ff3b30]/10 text-[#ff3b30] flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
              Data &amp; Privacy
            </h3>
            <p className="text-xs text-[#86868b] dark:text-[#98989d]">
              Export, cleanup, or account deletion
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm pt-1">
          <div>
            <p className="font-medium text-[#1d1d1f] dark:text-white">Export Vault Data</p>
            <p className="text-xs text-[#86868b] dark:text-[#98989d]">
              Download a complete JSON archive of all your saved questions, notes, and metadata
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            className="self-start sm:self-auto text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm pt-3 border-t border-[#e5e5ea]/40 dark:border-[#38383a]/40">
          <div>
            <p className="font-medium text-[#1d1d1f] dark:text-white">Empty Trash</p>
            <p className="text-xs text-[#86868b] dark:text-[#98989d]">
              Permanently delete all items currently in Trash to free up cloud storage
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEmptyTrash}
            className="self-start sm:self-auto text-xs text-[#ff3b30] hover:text-[#ff3b30]"
          >
            Empty Trash
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm pt-3 border-t border-[#e5e5ea]/40 dark:border-[#38383a]/40">
          <div>
            <p className="font-medium text-[#ff3b30]">Delete Account</p>
            <p className="text-xs text-[#86868b] dark:text-[#98989d]">
              Permanently erase your account, all saved questions, and all uploaded files from storage
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="self-start sm:self-auto text-xs"
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* 5. ABOUT GLOBAL SEND */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-[#e5e5ea] dark:border-[#2c2c2e] p-5 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <Logo size={48} className="rounded-xl shadow-xs" withGlow />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start">
            <h4 className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
              {SITE_CONFIG.name}
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium self-center">
              v1.0.0
            </span>
          </div>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            {SITE_CONFIG.tagline}
          </p>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        subtitle="Enter your current password and choose a new one."
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 text-xs text-red-600">
              {passwordError}
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isChangingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE ACCOUNT MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account Permanently"
        subtitle="This action is irreversible. All your files and saved items will be deleted."
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          {deleteError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 text-xs text-red-600">
              {deleteError}
            </div>
          )}

          <p className="text-xs text-[#86868b] dark:text-[#98989d]">
            Please enter your account password to confirm account deletion:
          </p>

          <Input
            label="Confirm Password"
            type="password"
            value={deleteConfirmPassword}
            onChange={(e) => setDeleteConfirmPassword(e.target.value)}
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
