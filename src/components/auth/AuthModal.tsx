'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  KeyRound,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  FileText,
  Sun,
  Moon,
  RefreshCw,
  HelpCircle,
  UploadCloud,
  Code,
  File as FileIcon,
  X,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { SITE_CONFIG, PRESET_SECURITY_QUESTIONS } from '@/config/site';
import { Logo } from '@/components/ui/Logo';
import { formatBytes } from '@/lib/utils';

interface AuthModalProps {
  onSuccess: (user: any) => void;
}

type AuthMode = 'signin' | 'register' | 'recovery';
type ComposerTab = 'file' | 'note';

function computeClientKeyStrength(key: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  colorClass: string;
} {
  const len = Array.from(key || '').length;
  if (len === 0) {
    return {
      score: 0,
      label: 'Minimum 8 characters',
      colorClass: 'bg-[#d1d1d6] dark:bg-[#3a3a3c]',
    };
  }
  if (len < 8) {
    return {
      score: 0,
      label: `${len}/8 characters minimum`,
      colorClass: 'bg-[#ff3b30]',
    };
  }

  let variety = 0;
  if (/[a-z]/.test(key)) variety++;
  if (/[A-Z]/.test(key)) variety++;
  if (/[0-9]/.test(key)) variety++;
  if (/[^a-zA-Z0-9]/.test(key)) variety++;

  const uniqueChars = new Set(Array.from(key)).size;

  if (len >= 20 && uniqueChars >= 10) {
    return { score: 4, label: 'Very strong key', colorClass: 'bg-[#34c759]' };
  }
  if (len >= 14 && (variety >= 2 || uniqueChars >= 8)) {
    return { score: 3, label: 'Strong key', colorClass: 'bg-[#34c759]' };
  }
  if (len >= 10 && uniqueChars >= 5) {
    return { score: 2, label: 'Moderate key', colorClass: 'bg-[#ff9500]' };
  }
  return { score: 1, label: 'Fair — longer keys are safer', colorClass: 'bg-[#ff9500]' };
}

function generateSecureRandomKey(): string {
  const adjectives = ['aurora', 'cosmic', 'zenith', 'stellar', 'glacier', 'falcon', 'nebula', 'velvet', 'prism', 'cipher'];
  const nouns = ['vault', 'shield', 'beacon', 'vector', 'matrix', 'crystal', 'anchor', 'orbit', 'pulse', 'spark'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const randSuffix = Math.random().toString(36).substring(2, 6);
  return `${adj}-${noun}-${randNum}-${randSuffix}`;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Staged item states (File or Note added on front page before authentication)
  const [composerTab, setComposerTab] = useState<ComposerTab>('file');
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedNote, setStagedNote] = useState('');
  const [isCodeFont, setIsCodeFont] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expirationSec, setExpirationSec] = useState<number>(86400); // 24h default
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication credentials
  const [username, setUsername] = useState('');
  const [loginKey, setLoginKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration states
  const [selectedQuestionPreset, setSelectedQuestionPreset] = useState<string>(PRESET_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);

  // Recovery Flow states
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [showRecoveryAnswer, setShowRecoveryAnswer] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState('');
  const [confirmRecoveryKey, setConfirmRecoveryKey] = useState('');
  const [showNewRecoveryKey, setShowNewRecoveryKey] = useState(false);
  const [showConfirmRecoveryKey, setShowConfirmRecoveryKey] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('qv_theme');
    const isDark =
      saved === 'dark' ||
      (!saved && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('qv_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('qv_theme', 'light');
    }
  };

  const keyStrength = useMemo(() => computeClientKeyStrength(loginKey), [loginKey]);
  const recoveryKeyStrength = useMemo(() => computeClientKeyStrength(newRecoveryKey), [newRecoveryKey]);

  const hasStagedItem = useMemo(() => {
    if (composerTab === 'file') return stagedFile !== null;
    return stagedNote.trim().length > 0;
  }, [composerTab, stagedFile, stagedNote]);

  const handleGenerateKey = () => {
    const gen = generateSecureRandomKey();
    setLoginKey(gen);
    toast.success('Generated random key');
  };

  const handleGenerateRecoveryKey = () => {
    const gen = generateSecureRandomKey();
    setNewRecoveryKey(gen);
    setConfirmRecoveryKey(gen);
    toast.success('Generated random key');
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.size > SITE_CONFIG.maxUploadSizeBytes) {
        setError(`File exceeds maximum size of ${Math.round(SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024))} MB.`);
        return;
      }
      setStagedFile(file);
      setComposerTab('file');
      setError(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > SITE_CONFIG.maxUploadSizeBytes) {
        setError(`File exceeds maximum size of ${Math.round(SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024))} MB.`);
        return;
      }
      setStagedFile(file);
      setError(null);
    }
  };

  // Main Submit Handler: Authenticates, then automatically saves any staged file or note
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !loginKey.trim()) {
      setError('Please enter both your username and login key.');
      return;
    }

    if (authMode === 'register') {
      const activeQuestion =
        selectedQuestionPreset === 'custom' ? customQuestion.trim() : selectedQuestionPreset;

      if (!activeQuestion || activeQuestion.length < 10) {
        setError('Security question must be between 10 and 150 characters.');
        return;
      }
      if (!securityAnswer.trim() || securityAnswer.trim().length < 4) {
        setError('Security answer must be at least 4 characters long.');
        return;
      }
      if (!acknowledgedWarning) {
        setError('Please acknowledge that your account cannot be recovered without your key and security answer.');
        return;
      }
    }

    setIsLoading(true);

    try {
      let authenticatedUser: any = null;

      if (authMode === 'signin') {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            key: loginKey,
          }),
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
          setError(loginData.error || 'Invalid username or key.');
          setIsLoading(false);
          return;
        }

        if (loginData.keyResetNotice) {
          toast.info(loginData.keyResetNotice);
        }
        authenticatedUser = loginData.user;
      } else if (authMode === 'register') {
        const activeQuestion =
          selectedQuestionPreset === 'custom' ? customQuestion.trim() : selectedQuestionPreset;

        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            key: loginKey,
            securityQuestion: activeQuestion,
            securityAnswer: securityAnswer.trim(),
            acknowledgedWarning: true,
          }),
        });

        const regData = await regRes.json();
        if (!regRes.ok) {
          setError(regData.error || 'Failed to create vault.');
          setIsLoading(false);
          return;
        }

        authenticatedUser = regData.user;
      }

      // Step 2: Now that authentication succeeded, save any staged item to their vault!
      if (composerTab === 'file' && stagedFile) {
        try {
          const formData = new FormData();
          formData.append('file', stagedFile);
          formData.append('expirationSeconds', String(expirationSec));

          const uploadRes = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) {
            const uploadErr = await uploadRes.json().catch(() => ({}));
            toast.error(uploadErr.error || 'File upload failed');
          } else {
            toast.success(`Saved "${stagedFile.name}" to your vault`);
          }
        } catch {
          toast.error('File upload failed');
        }
      } else if (composerTab === 'note' && stagedNote.trim()) {
        try {
          const itemRes = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'text',
              textContent: stagedNote.trim(),
              expirationDurationSec: expirationSec,
            }),
          });

          if (!itemRes.ok) {
            const itemErr = await itemRes.json().catch(() => ({}));
            toast.error(itemErr.error || 'Failed to save note');
          } else {
            toast.success('Saved note to your vault');
          }
        } catch {
          toast.error('Failed to save note');
        }
      } else {
        toast.success(`Welcome to your vault, @${authenticatedUser.displayUsername || authenticatedUser.username}`);
      }

      onSuccess(authenticatedUser);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Recovery Flow - Step 1: Query security question
  const handleFetchRecoveryQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recoveryUsername.trim()) {
      setError('Please enter your username');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/recovery/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: recoveryUsername.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to retrieve recovery question');
        return;
      }

      setRecoveryQuestion(data.question);
      setRecoveryStep(2);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Recovery Flow - Step 2: Answer question & set new key
  const handleResetRecoveryKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recoveryAnswer.trim() || recoveryAnswer.trim().length < 4) {
      setError('Please enter your security answer (minimum 4 characters).');
      return;
    }

    if (newRecoveryKey !== confirmRecoveryKey) {
      setError('New login key and confirmation do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: recoveryUsername.trim(),
          answer: recoveryAnswer.trim(),
          newKey: newRecoveryKey,
          confirmKey: confirmRecoveryKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Recovery failed. Invalid recovery answer.');
        return;
      }

      toast.success('Your login key has been reset! Please sign in with your new key.');
      setUsername(recoveryUsername.trim());
      setLoginKey('');
      setRecoveryStep(1);
      setRecoveryAnswer('');
      setNewRecoveryKey('');
      setConfirmRecoveryKey('');
      setAuthMode('signin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic button label
  const submitButtonLabel = useMemo(() => {
    if (isLoading) return 'Please wait…';
    if (authMode === 'register') {
      if (composerTab === 'file' && stagedFile) return 'Create Vault & Save File';
      if (composerTab === 'note' && stagedNote.trim()) return 'Create Vault & Save Note';
      return 'Create Vault & Enter';
    }
    // signin mode
    if (composerTab === 'file' && stagedFile) return 'Save File & Enter Vault';
    if (composerTab === 'note' && stagedNote.trim()) return 'Save Note & Enter Vault';
    return 'Unlock Vault';
  }, [isLoading, authMode, composerTab, stagedFile, stagedNote]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f7] dark:bg-[#000000] text-[#1c1c1e] dark:text-[#f5f5f7] relative overflow-hidden transition-colors duration-200">
      {/* Subtle Ambient Background Gradient */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[480px] rounded-full blur-[140px] opacity-25 dark:opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0, 113, 227, 0.45), rgba(88, 86, 214, 0.25), transparent 70%)',
        }}
      />

      {/* Top Header */}
      <header className="sticky top-0 z-40 h-14 ios-material border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">
              {SITE_CONFIG.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[12px] text-[#6c6c70] dark:text-[#98989d]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
              Private Cloud Locker
            </span>

            {/* Dark / Light Mode Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme appearance"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#6c6c70] dark:text-[#98989d] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#ff9f0a]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 z-10">
        <div className="w-full max-w-[540px] mx-auto space-y-6">

          {/* Clean Focused Header */}
          <div className="text-center space-y-2">
            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight">
              Save files &amp; notes. <br />
              <span className="bg-gradient-to-r from-[#0071e3] to-[#5856d6] dark:from-[#2997ff] dark:to-[#bf5af2] bg-clip-text text-transparent">
                Instantly in your vault.
              </span>
            </h1>
            <p className="text-[14px] sm:text-[15px] text-[#6c6c70] dark:text-[#98989d] max-w-md mx-auto leading-relaxed">
              Drop a file or paste text below, then enter your username and key to save it straight to your encrypted vault.
            </p>
          </div>

          {/* Unified Card */}
          <div className="bg-white/85 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl rounded-[24px] border border-black/[0.08] dark:border-white/[0.1] p-6 sm:p-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] space-y-6">

            {/* View Switcher: Sign In vs Create Vault vs Recovery */}
            {authMode !== 'recovery' && (
              <div className="flex items-center justify-center">
                <SegmentedControl
                  className="w-full"
                  value={authMode}
                  onChange={(v) => {
                    setError(null);
                    setAuthMode(v as AuthMode);
                  }}
                  options={[
                    { value: 'signin', label: 'Sign In to Vault', icon: <Lock className="w-3.5 h-3.5" /> },
                    { value: 'register', label: 'Create Vault', icon: <Sparkles className="w-3.5 h-3.5" /> },
                  ]}
                />
              </div>
            )}

            {/* Error Message Banner */}
            {error && (
              <div
                role="alert"
                className="p-3 rounded-[12px] bg-[#ff3b30]/10 dark:bg-[#ff453a]/15 border border-[#ff3b30]/20 text-[13px] font-medium text-[#ff3b30] dark:text-[#ff453a] flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30] shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION 1: FRONT-PAGE COMPOSER (DROP FILE OR ADD TEXT) */}
            {authMode !== 'recovery' && (
              <div className="space-y-3 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                
                {/* Composer Tab Bar & Expiration Selector */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-0.5 rounded-[9px]">
                    <button
                      type="button"
                      onClick={() => setComposerTab('file')}
                      className={`px-3 py-1 rounded-[7px] text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        composerTab === 'file'
                          ? 'bg-white dark:bg-[#3a3a3c] text-[#1c1c1e] dark:text-white shadow-2xs'
                          : 'text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white'
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Attach File</span>
                      {stagedFile && <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setComposerTab('note')}
                      className={`px-3 py-1 rounded-[7px] text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        composerTab === 'note'
                          ? 'bg-white dark:bg-[#3a3a3c] text-[#1c1c1e] dark:text-white shadow-2xs'
                          : 'text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Note &amp; Code</span>
                      {stagedNote.trim() && <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" />}
                    </button>
                  </div>

                  {/* Expiration Pills */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-[#86868b] mr-1 hidden sm:inline flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires:
                    </span>
                    {[
                      { label: '1h', sec: 3600 },
                      { label: '24h', sec: 86400 },
                      { label: '7d', sec: 604800 },
                    ].map((exp) => (
                      <button
                        key={exp.sec}
                        type="button"
                        onClick={() => setExpirationSec(exp.sec)}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-[5px] transition-colors cursor-pointer ${
                          expirationSec === exp.sec
                            ? 'bg-[#0071e3] text-white font-semibold'
                            : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                        }`}
                      >
                        {exp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Dropzone or Preview */}
                {composerTab === 'file' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />

                    {stagedFile ? (
                      <div className="p-3.5 rounded-[14px] bg-[#f2f2f7] dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between gap-3 animate-in fade-in duration-150">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-[10px] bg-[#0071e3]/10 dark:bg-[#0a84ff]/20 text-[#0071e3] dark:text-[#0a84ff] flex items-center justify-center shrink-0">
                            <FileIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white truncate">
                              {stagedFile.name}
                            </p>
                            <p className="text-[11px] text-[#86868b]">
                              {formatBytes(stagedFile.size)} · Will save to vault upon login
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setStagedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-[#ff3b30] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer shrink-0 transition-colors"
                          title="Remove attached file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-[16px] p-6 text-center cursor-pointer transition-all duration-150 ${
                          isDragOver
                            ? 'border-[#0071e3] bg-[#0071e3]/[0.06] dark:bg-[#0a84ff]/[0.08] scale-[1.01]'
                            : 'border-black/[0.12] dark:border-white/[0.14] hover:border-[#0071e3]/60 hover:bg-black/[0.01] dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="w-10 h-10 mx-auto rounded-[12px] bg-[#0071e3]/10 dark:bg-[#0a84ff]/15 text-[#0071e3] dark:text-[#0a84ff] flex items-center justify-center mb-2">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                          Drag and drop file to save
                        </p>
                        <p className="text-[12px] text-[#86868b] mt-0.5">
                          or <span className="text-[#0071e3] dark:text-[#0a84ff] font-medium underline">browse files</span> (up to 250 MB · optional)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <textarea
                        rows={3}
                        placeholder="Paste text, code snippet, notes, or links to save into your vault..."
                        value={stagedNote}
                        onChange={(e) => setStagedNote(e.target.value)}
                        className={`w-full rounded-[14px] bg-[#f2f2f7] dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.1] p-3 text-[13px] leading-relaxed text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none transition-all ${
                          isCodeFont ? 'font-mono' : 'font-sans'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#86868b] px-1">
                      <button
                        type="button"
                        onClick={() => setIsCodeFont(!isCodeFont)}
                        className={`inline-flex items-center gap-1 font-medium hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer ${
                          isCodeFont ? 'text-[#0071e3] dark:text-[#0a84ff] font-semibold' : ''
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>{isCodeFont ? 'Monospace active' : 'Toggle Monospace'}</span>
                      </button>

                      {stagedNote.trim() && (
                        <span>{stagedNote.length} characters</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: AUTHENTICATION FORM */}
            {authMode !== 'recovery' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Section Sub-header */}
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-[#86868b]">
                    {hasStagedItem
                      ? 'Enter credentials to save to vault'
                      : authMode === 'signin'
                      ? 'Vault Credentials'
                      : 'Create Your Vault Credentials'}
                  </span>
                </div>

                {/* Username Input */}
                <div>
                  <Input
                    label="Username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                    required
                  />
                </div>

                {/* Login Key Input */}
                <div>
                  {authMode === 'register' && (
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        Private Login Key
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateKey}
                        className="text-[12px] font-semibold text-[#0071e3] dark:text-[#0a84ff] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Auto-generate
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      label={authMode === 'signin' ? 'Private Login Key' : undefined}
                      type={showKey ? 'text' : 'password'}
                      autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                      placeholder={authMode === 'signin' ? 'Enter private key' : 'Choose 8+ character key'}
                      value={loginKey}
                      onChange={(e) => setLoginKey(e.target.value)}
                      icon={<KeyRound className="w-4 h-4" />}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-[33px] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {authMode === 'register' && loginKey && (
                    <div className="mt-2 flex items-center gap-2 text-[12px]">
                      <div className="flex-1 h-1 rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${keyStrength.colorClass}`}
                          style={{ width: `${(keyStrength.score + 1) * 20}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[#86868b]">{keyStrength.label}</span>
                    </div>
                  )}

                  {authMode === 'signin' && (
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setRecoveryUsername(username);
                          setRecoveryStep(1);
                          setAuthMode('recovery');
                        }}
                        className="text-[12px] text-[#0071e3] dark:text-[#0a84ff] font-medium hover:underline cursor-pointer"
                      >
                        Forgot key?
                      </button>
                    </div>
                  )}
                </div>

                {/* Registration Extra Fields: Security Question & Answer */}
                {authMode === 'register' && (
                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5">
                        Security Question (for Key Recovery)
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
                          label="Custom Security Question"
                          placeholder="e.g. What was the name of your first musical instrument?"
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          icon={<HelpCircle className="w-4 h-4" />}
                          required
                        />
                      </div>
                    )}

                    <div>
                      <div className="relative">
                        <Input
                          label="Security Answer"
                          type={showSecurityAnswer ? 'text' : 'password'}
                          placeholder="Enter memorable answer"
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecurityAnswer(!showSecurityAnswer)}
                          className="absolute right-3 top-[33px] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                          aria-label={showSecurityAnswer ? 'Hide answer' : 'Show answer'}
                        >
                          {showSecurityAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-1.5">
                        Answers are case-insensitive. Minimum 4 characters.
                      </p>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={acknowledgedWarning}
                          onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                          className="mt-0.5 rounded-[4px] border-black/20 text-[#0071e3] focus:ring-[#0071e3]"
                        />
                        <span className="text-[12px] text-[#86868b] leading-snug">
                          If I forget my key AND my security answer, my account cannot be recovered.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                  disabled={!username.trim() || !loginKey.trim()}
                >
                  <span>{submitButtonLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {/* Footer Switch Link */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setAuthMode(authMode === 'signin' ? 'register' : 'signin');
                    }}
                    className="text-[13px] text-[#0071e3] dark:text-[#0a84ff] font-medium hover:underline cursor-pointer"
                  >
                    {authMode === 'signin'
                      ? "Don't have an account? Create new vault"
                      : 'Already have a vault? Sign in'}
                  </button>
                </div>
              </form>
            ) : (
              /* SECTION 3: KEY RECOVERY FLOW */
              <div className="space-y-4">
                <div className="mb-2">
                  <h2 className="text-[18px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Recover Vault Key
                  </h2>
                  <p className="text-[13px] text-[#86868b] mt-0.5">
                    {recoveryStep === 1
                      ? 'Enter your username to retrieve your security question.'
                      : 'Answer your security question to set a new private key.'}
                  </p>
                </div>

                {recoveryStep === 1 ? (
                  <form onSubmit={handleFetchRecoveryQuestion} className="space-y-4">
                    <div>
                      <Input
                        label="Account Username"
                        type="text"
                        autoComplete="username"
                        placeholder="Enter your username"
                        value={recoveryUsername}
                        onChange={(e) => setRecoveryUsername(e.target.value)}
                        icon={<User className="w-4 h-4" />}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      isLoading={isLoading}
                      disabled={!recoveryUsername.trim()}
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setAuthMode('signin');
                        }}
                        className="text-[13px] text-[#0071e3] dark:text-[#0a84ff] font-medium hover:underline cursor-pointer"
                      >
                        Remember your key? Back to sign in
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetRecoveryKey} className="space-y-4">
                    <div className="p-3.5 rounded-[14px] bg-[#0071e3]/5 dark:bg-[#0a84ff]/10 border border-[#0071e3]/15 dark:border-[#0a84ff]/20">
                      <div className="text-[11px] font-semibold text-[#0071e3] dark:text-[#0a84ff] uppercase tracking-wider mb-1">
                        Security Question
                      </div>
                      <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {recoveryQuestion}
                      </p>
                    </div>

                    <div>
                      <div className="relative">
                        <Input
                          label="Your Security Answer"
                          type={showRecoveryAnswer ? 'text' : 'password'}
                          placeholder="Enter your answer"
                          value={recoveryAnswer}
                          onChange={(e) => setRecoveryAnswer(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRecoveryAnswer(!showRecoveryAnswer)}
                          className="absolute right-3 top-[33px] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                          aria-label={showRecoveryAnswer ? 'Hide answer' : 'Show answer'}
                        >
                          {showRecoveryAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-1.5">
                        Answers are case-insensitive and tolerate whitespace.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                          New Private Login Key
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateRecoveryKey}
                          className="text-[12px] font-semibold text-[#0071e3] dark:text-[#0a84ff] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Auto-generate
                        </button>
                      </div>

                      <div className="relative">
                        <Input
                          type={showNewRecoveryKey ? 'text' : 'password'}
                          placeholder="Enter new 8-128 char key"
                          value={newRecoveryKey}
                          onChange={(e) => setNewRecoveryKey(e.target.value)}
                          icon={<KeyRound className="w-4 h-4" />}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewRecoveryKey(!showNewRecoveryKey)}
                          className="absolute right-3 top-[10px] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                          aria-label={showNewRecoveryKey ? 'Hide key' : 'Show key'}
                        >
                          {showNewRecoveryKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {newRecoveryKey && (
                        <div className="mt-2 flex items-center gap-2 text-[12px]">
                          <div className="flex-1 h-1 rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${recoveryKeyStrength.colorClass}`}
                              style={{ width: `${(recoveryKeyStrength.score + 1) * 20}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-[#86868b]">{recoveryKeyStrength.label}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="relative">
                        <Input
                          label="Confirm New Login Key"
                          type={showConfirmRecoveryKey ? 'text' : 'password'}
                          placeholder="Re-enter new key"
                          value={confirmRecoveryKey}
                          onChange={(e) => setConfirmRecoveryKey(e.target.value)}
                          icon={<KeyRound className="w-4 h-4" />}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmRecoveryKey(!showConfirmRecoveryKey)}
                          className="absolute right-3 top-[33px] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                          aria-label={showConfirmRecoveryKey ? 'Hide confirm key' : 'Show confirm key'}
                        >
                          {showConfirmRecoveryKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      isLoading={isLoading}
                      disabled={!recoveryAnswer.trim() || !newRecoveryKey.trim() || newRecoveryKey !== confirmRecoveryKey}
                    >
                      <span>Reset Key &amp; Return to Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryStep(1);
                          setAuthMode('signin');
                        }}
                        className="text-[13px] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
                      >
                        Cancel recovery
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Minimalist Trust Footer */}
          <div className="text-center text-[12px] text-[#86868b] space-y-1">
            <p>
              {SITE_CONFIG.name} — Private temporary locker &amp; clipboard.
            </p>
            <p className="text-[11px] text-[#86868b]/80">
              No third-party tracking · Files &amp; notes auto-expire on your schedule
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
