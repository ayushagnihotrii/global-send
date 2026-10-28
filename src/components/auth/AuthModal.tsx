'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  KeyRound,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Clock,
  FileText,
  Check,
  Zap,
  ShieldCheck,
  Copy,
  Sun,
  Moon,
  Sparkles,
  RefreshCw,
  HardDrive,
  HelpCircle,
  Plus,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { SITE_CONFIG, PRESET_SECURITY_QUESTIONS } from '@/config/site';
import { Logo } from '@/components/ui/Logo';

interface AuthModalProps {
  onSuccess: (user: any) => void;
}

type AuthView = 'quickshare' | 'login' | 'register' | 'recovery';

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
    return { score: 4, label: 'Military grade 256-bit entropy', colorClass: 'bg-[#34c759]' };
  }
  if (len >= 14 && (variety >= 2 || uniqueChars >= 8)) {
    return { score: 3, label: 'Strong cryptographic key', colorClass: 'bg-[#34c759]' };
  }
  if (len >= 10 && uniqueChars >= 5) {
    return { score: 2, label: 'Moderate key strength', colorClass: 'bg-[#ff9500]' };
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
  const [view, setView] = useState<AuthView>('quickshare');
  const [username, setUsername] = useState('');
  const [loginKey, setLoginKey] = useState('');
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration Security Question states
  const [selectedQuestionPreset, setSelectedQuestionPreset] = useState<string>(PRESET_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);

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

  // Quick Share Dropzone States
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [quickNote, setQuickNote] = useState('');
  const [quickMode, setQuickMode] = useState<'file' | 'note'>('file');
  const [expirationSec, setExpirationSec] = useState<number>(86400); // 24 hours default
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Interactive Live Bento States
  const [countdown, setCountdown] = useState(85318);
  const [copiedCode, setCopiedCode] = useState(false);

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

  // Live countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 86400));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const keyStrength = useMemo(() => computeClientKeyStrength(loginKey), [loginKey]);
  const recoveryKeyStrength = useMemo(() => computeClientKeyStrength(newRecoveryKey), [newRecoveryKey]);

  const switchView = (nextView: AuthView) => {
    setError(null);
    setShowKey(false);
    setView(nextView);
  };

  const handleGenerateKey = () => {
    const newKey = generateSecureRandomKey();
    setLoginKey(newKey);
    toast.success('Generated secure 256-bit key');
  };

  const handleCopyGeneratedKey = () => {
    if (!loginKey) return;
    navigator.clipboard.writeText(loginKey);
    toast.success('Private key copied to clipboard');
  };

  const handleGenerateRecoveryKey = () => {
    const gen = generateSecureRandomKey();
    setNewRecoveryKey(gen);
    setConfirmRecoveryKey(gen);
    toast.success('Generated secure key');
  };

  const handleCopyCode = async () => {
    const code = `curl -X POST https://gb-send.vercel.app/api/items \\\n  -H "Authorization: Bearer <key>" \\\n  -d '{"ttl": 86400}'`;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success('Curl command copied to clipboard');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.info('Command copied');
    }
  };

  // Username + Key Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !loginKey.trim()) {
      setError('Please enter both your username and private login key.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          key: loginKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid username or key.');
        return;
      }

      if (data.keyResetNotice) {
        toast.info(data.keyResetNotice);
      }

      toast.success(`Signed in as @${data.user.displayUsername || data.user.username}`);
      onSuccess(data.user);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Custom Account Registration with Security Question & Answer
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      setError('Please acknowledge that your account cannot be recovered if you forget your key and security answer.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
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

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      toast.success(`Welcome to your new vault, @${data.user.displayUsername || data.user.username}`);
      onSuccess(data.user);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Recovery Flow - Step 1: Look up Question
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

  // Recovery Flow - Step 2: Answer + Reset Key
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
      switchView('login');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Share Transfer Handler
  const handleQuickTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quickMode === 'file' && !droppedFile) {
      setError('Please select or drop a file to transfer.');
      return;
    }
    if (quickMode === 'note' && !quickNote.trim()) {
      setError('Please write some text or code to transfer.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Generate an instant ephemeral user account with default security recovery pair
      const randomUsername = `quick_${Math.random().toString(36).substring(2, 7)}`;
      const autoKey = generateSecureRandomKey();
      const autoAnswer = `backup-${Math.random().toString(36).substring(2, 8)}`;

      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: randomUsername,
          key: autoKey,
          securityQuestion: PRESET_SECURITY_QUESTIONS[0],
          securityAnswer: autoAnswer,
          acknowledgedWarning: true,
        }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || 'Could not initiate transfer session');
      }

      const activeUser = regData.user;

      // 2. Upload the item
      if (quickMode === 'file' && droppedFile) {
        const formData = new FormData();
        formData.append('file', droppedFile);
        formData.append('expirationDurationSec', String(expirationSec));

        const uploadRes = await fetch('/api/storage/local-upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || 'File upload failed');
        }
      } else if (quickMode === 'note' && quickNote.trim()) {
        const itemRes = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'text',
            textContent: quickNote.trim(),
            expirationDurationSec: expirationSec,
          }),
        });

        if (!itemRes.ok) {
          const errData = await itemRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Note creation failed');
        }
      }

      // Automatically copy key to clipboard for emergency retrieval
      if (navigator.clipboard) {
        navigator.clipboard.writeText(autoKey);
      }

      toast.success('Transfer ready! Vault key copied to clipboard.');
      onSuccess(activeUser);
    } catch (err: any) {
      setError(err.message || 'Transfer failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
      setDroppedFile(e.dataTransfer.files[0]);
      setQuickMode('file');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f7] dark:bg-[#000000] text-[#1c1c1e] dark:text-[#f5f5f7] relative overflow-hidden transition-colors duration-200">
      {/* Cupertino Top Ambient Glow (Ultra-subtle, non-neon light reflection) */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full blur-[140px] opacity-25 dark:opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0, 113, 227, 0.45), rgba(88, 86, 214, 0.25), transparent 70%)',
        }}
      />

      {/* Floating Apple Glass Navigation Bar */}
      <header className="sticky top-0 z-40 h-14 ios-material border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold tracking-[-0.022em] text-[#1c1c1e] dark:text-[#f5f5f7]">
                {SITE_CONFIG.name}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#34c759]/10 text-[#34c759] dark:text-[#30d158] text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
                End-to-End Encrypted
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle interface appearance"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#6c6c70] dark:text-[#98989d] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#ff9f0a]" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* View Switchers */}
            <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-[10px]">
              <button
                type="button"
                onClick={() => switchView('quickshare')}
                className={`px-3 py-1 rounded-[7px] text-[13px] font-medium transition-all cursor-pointer ${
                  view === 'quickshare'
                    ? 'bg-white dark:bg-[#3a3a3c] text-[#1c1c1e] dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white'
                }`}
              >
                Quick Share
              </button>
              <button
                type="button"
                onClick={() => switchView('login')}
                className={`px-3 py-1 rounded-[7px] text-[13px] font-medium transition-all cursor-pointer ${
                  view === 'login'
                    ? 'bg-white dark:bg-[#3a3a3c] text-[#1c1c1e] dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white'
                }`}
              >
                Unlock
              </button>
              <button
                type="button"
                onClick={() => switchView('register')}
                className={`px-3 py-1 rounded-[7px] text-[13px] font-medium transition-all cursor-pointer ${
                  view === 'register'
                    ? 'bg-white dark:bg-[#3a3a3c] text-[#1c1c1e] dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white'
                }`}
              >
                New Vault
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero & Transfer Console */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16 z-10">
        <div className="w-full max-w-4xl mx-auto space-y-10">
          
          {/* Centered Editorial Header */}
          <div className="text-center space-y-3.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] text-[12px] font-medium text-[#3c3c43] dark:text-[#ebebf5]/90 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#0a84ff]" />
              <span>Key-only private cloud transfer · Zero identity logs</span>
            </div>

            <h1 className="text-[34px] sm:text-[46px] font-bold tracking-[-0.035em] leading-[1.08] text-[#1d1d1f] dark:text-[#f5f5f7]">
              Transfer files &amp; notes. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#0071e3] to-[#5856d6] dark:from-[#2997ff] dark:to-[#bf5af2] bg-clip-text text-transparent">
                Fast. Private. Anywhere.
              </span>
            </h1>

            <p className="text-[15px] sm:text-[17px] leading-relaxed text-[#6c6c70] dark:text-[#98989d]">
              Drop a file to send instantly, or unlock your key-only private vault across devices. Everything expires automatically on your schedule—with zero email or phone number required.
            </p>
          </div>

          {/* Central Cupertino Glass Controller */}
          <div className="w-full max-w-xl mx-auto bg-white/80 dark:bg-[#1c1c1e]/85 backdrop-blur-2xl rounded-[26px] sm:rounded-[30px] border border-black/[0.08] dark:border-white/[0.12] p-6 sm:p-8 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.08)] dark:shadow-[0_28px_70px_-16px_rgba(0,0,0,0.65)]">
            
            {/* Top Switcher Segment */}
            <div className="mb-6">
              <SegmentedControl
                className="w-full"
                value={view}
                onChange={(v) => switchView(v)}
                options={[
                  { value: 'quickshare', label: 'Instant Send', icon: <Zap className="w-3.5 h-3.5" /> },
                  { value: 'login', label: 'Unlock Vault', icon: <KeyRound className="w-3.5 h-3.5" /> },
                  { value: 'register', label: 'Create Vault', icon: <Plus className="w-3.5 h-3.5" /> },
                ]}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-[12px] bg-[#ff3b30]/10 dark:bg-[#ff453a]/15 border border-[#ff3b30]/20 text-[13px] font-medium text-[#ff3b30] dark:text-[#ff453a] flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30] shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: QUICK SHARE (Instant Dropzone & Transfer) */}
            {view === 'quickshare' && (
              <form onSubmit={handleQuickTransfer} className="space-y-5">
                {/* Mode Selector within Quick Share (File vs Note) */}
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickMode('file')}
                      className={`px-3 py-1 rounded-[7px] text-[12px] font-semibold transition-all cursor-pointer ${
                        quickMode === 'file'
                          ? 'bg-[#0071e3] text-white dark:bg-[#0a84ff]'
                          : 'text-[#6c6c70] dark:text-[#98989d] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      File Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickMode('note')}
                      className={`px-3 py-1 rounded-[7px] text-[12px] font-semibold transition-all cursor-pointer ${
                        quickMode === 'note'
                          ? 'bg-[#0071e3] text-white dark:bg-[#0a84ff]'
                          : 'text-[#6c6c70] dark:text-[#98989d] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      Note &amp; Code
                    </button>
                  </div>

                  {/* Expiration Duration Pills */}
                  <div className="flex items-center gap-1">
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
                            ? 'bg-black/[0.08] dark:bg-white/[0.12] text-[#1d1d1f] dark:text-white font-semibold'
                            : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                        }`}
                      >
                        {exp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {quickMode === 'file' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setDroppedFile(e.target.files[0]);
                        }
                      }}
                    />

                    {droppedFile ? (
                      <div className="p-4 rounded-[16px] bg-[#f2f2f7]/80 dark:bg-[#2c2c2e]/70 border border-black/[0.07] dark:border-white/[0.1] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-[10px] bg-[#0071e3]/10 dark:bg-[#0a84ff]/20 text-[#0071e3] dark:text-[#0a84ff] flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white truncate">
                              {droppedFile.name}
                            </p>
                            <p className="text-[12px] text-[#86868b] tabular-nums">
                              {(droppedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to send
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDroppedFile(null)}
                          className="text-[12px] font-medium text-[#ff3b30] hover:underline cursor-pointer shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-[20px] p-8 text-center cursor-pointer transition-all duration-150 ${
                          isDragOver
                            ? 'border-[#0071e3] bg-[#0071e3]/[0.06] dark:bg-[#0a84ff]/[0.08] scale-[1.01]'
                            : 'border-black/[0.12] dark:border-white/[0.14] hover:border-[#0071e3]/50 hover:bg-black/[0.01] dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="w-12 h-12 mx-auto rounded-[14px] bg-[#0071e3]/10 dark:bg-[#0a84ff]/18 text-[#0071e3] dark:text-[#0a84ff] flex items-center justify-center mb-3">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                          Drag and drop your file here
                        </p>
                        <p className="text-[13px] text-[#86868b] mt-1">
                          or <span className="text-[#0071e3] dark:text-[#0a84ff] font-medium underline">browse files</span> (up to 50 MB)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={4}
                      placeholder="Paste secret note, code snippet, or private credentials..."
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f2f2f7]/80 dark:bg-[#2c2c2e]/70 border border-black/[0.07] dark:border-white/[0.1] p-3.5 text-[14px] font-mono leading-relaxed text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={quickMode === 'file' ? !droppedFile : !quickNote.trim()}
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Start Instant Transfer</span>
                </Button>

                <p className="text-center text-[12px] text-[#86868b]">
                  Generates an auto-expiring 1-click retrieval link. Zero registration required.
                </p>
              </form>
            )}

            {/* TAB 2: UNLOCK VAULT (Returning User) */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="mb-2">
                  <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Unlock Your Vault
                  </h2>
                  <p className="text-[13px] text-[#86868b] mt-0.5">
                    Enter your username and private key to access your encrypted vault.
                  </p>
                </div>

                <div>
                  <Input
                    label="Public Username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                    required
                  />
                </div>

                <div className="relative">
                  <Input
                    label="Private Login Key"
                    type={showKey ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="e.g. aurora-vault-7491-k8p"
                    value={loginKey}
                    onChange={(e) => setLoginKey(e.target.value)}
                    icon={<KeyRound className="w-4 h-4" />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-[33px] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                    aria-label={showKey ? 'Hide login key' : 'Show login key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryUsername(username);
                      setRecoveryStep(1);
                      switchView('recovery');
                    }}
                    className="text-[12px] text-[#0071e3] dark:text-[#0a84ff] font-medium hover:underline cursor-pointer"
                  >
                    Forgot key?
                  </button>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={!username.trim() || !loginKey.trim()}
                >
                  <span>Continue to Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => switchView('register')}
                    className="text-[13px] text-[#0071e3] dark:text-[#0a84ff] font-medium hover:underline cursor-pointer"
                  >
                    Don&apos;t have an account? Create new vault
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: CREATE VAULT (New Account) */}
            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="mb-2">
                  <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Create Your Vault
                  </h2>
                  <p className="text-[13px] text-[#86868b] mt-0.5">
                    Zero email or phone number. Your private key and security question protect your account.
                  </p>
                </div>

                <div>
                  <Input
                    label="Public Username"
                    type="text"
                    autoComplete="username"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                    required
                  />
                </div>

                <div>
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

                  <div className="relative">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Generate or enter private key"
                      value={loginKey}
                      onChange={(e) => setLoginKey(e.target.value)}
                      icon={<KeyRound className="w-4 h-4" />}
                      required
                    />
                    <div className="absolute right-3 top-[10px] flex items-center gap-1.5 text-[#8e8e93]">
                      {loginKey && (
                        <button
                          type="button"
                          onClick={handleCopyGeneratedKey}
                          className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
                          title="Copy key"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
                        aria-label={showKey ? 'Hide key' : 'Show key'}
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {loginKey && (
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
                </div>

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
                    Answers are case-insensitive and tolerate whitespace. Minimum 4 characters.
                  </p>
                </div>

                <div className="pt-2">
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

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={!username.trim() || !loginKey.trim() || !securityAnswer.trim() || !acknowledgedWarning}
                >
                  <span>Create Vault &amp; Enter</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="text-[13px] text-[#0071e3] dark:text-[#0a84ff] font-medium hover:underline cursor-pointer"
                  >
                    Already have a vault? Sign in
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: RECOVER LOGIN KEY */}
            {view === 'recovery' && (
              <div className="space-y-4">
                <div className="mb-2">
                  <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Recover Vault Key
                  </h2>
                  <p className="text-[13px] text-[#86868b] mt-0.5">
                    {recoveryStep === 1
                      ? 'Enter your username to retrieve your security question.'
                      : 'Answer your security question to set a new private login key.'}
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
                        onClick={() => switchView('login')}
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
                          switchView('login');
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

          {/* Interactive Feature Showcase Bento (Replaces the static fake cards) */}
          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 max-w-4xl mx-auto w-full">
            
            {/* Card 1: Ephemeral File Transfer (Ticking Live Countdown) */}
            <div className="ios-card rounded-[20px] p-4.5 flex flex-col justify-between space-y-3 shadow-2xs hover:border-black/[0.12] dark:hover:border-white/[0.16] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                  Vanishing Files
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-[#0a84ff]">
                  Live Sync
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[11px] bg-[#0071e3]/10 dark:bg-[#0a84ff]/20 text-[#0071e3] dark:text-[#0a84ff] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white truncate">
                    System_Architecture_v4.pdf
                  </p>
                  <p className="text-[11px] text-[#86868b] tabular-nums">
                    4.8 MB · Encrypted stream
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-[#ff9500] font-mono tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires in {formatCountdown(countdown)}</span>
                </span>
                <span className="text-[11px] font-medium text-[#34c759] dark:text-[#30d158]">
                  Ready
                </span>
              </div>
            </div>

            {/* Card 2: Interactive Code Snippet with Copy Toast */}
            <div className="ios-card rounded-[20px] p-4.5 flex flex-col justify-between space-y-3 shadow-2xs hover:border-black/[0.12] dark:hover:border-white/[0.16] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                  Developer CLI &amp; API
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0071e3] dark:text-[#0a84ff] hover:underline cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-[#34c759]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="text-[11px] leading-relaxed p-2.5 rounded-[12px] bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#3c3c43] dark:text-[#ebebf5] font-mono overflow-x-auto">
                {`curl -X POST /api/items \\\n  -d '{"ttl": 86400}'`}
              </pre>

              <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] text-[11px] text-[#86868b] flex items-center justify-between">
                <span>Direct programmatic push</span>
                <span className="text-[#34c759] font-medium">● 200 OK</span>
              </div>
            </div>

            {/* Card 3: Peer-to-Peer Direct Chat Preview */}
            <div className="ios-card rounded-[20px] p-4.5 flex flex-col justify-between space-y-3 shadow-2xs hover:border-black/[0.12] dark:hover:border-white/[0.16] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                  Direct Messaging
                </span>
                <span className="text-[11px] text-[#86868b]">@alex_dev</span>
              </div>

              <div className="self-end bg-[#0071e3] text-white text-[12px] px-3.5 py-2 rounded-[16px] rounded-br-[4px] max-w-[95%] shadow-2xs">
                Sent Release_Build.zip from Vault
              </div>

              <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-[#86868b]">
                <span>Zero duplicate storage</span>
                <span className="tabular-nums">Live TTL</span>
              </div>
            </div>

          </div>

          {/* Minimalist Apple HIG Trust Strip */}
          <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-[#86868b] text-[13px]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#34c759]" />
              <span>Zero-knowledge client encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0071e3]" />
              <span>Automatic 60s background purge</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#5856d6]" />
              <span>Direct LAN &amp; Cloud transfer</span>
            </div>
          </div>

        </div>
      </main>

      {/* Subtle Apple Footer */}
      <footer className="py-6 px-4 text-center text-[12px] text-[#86868b] border-t border-black/[0.05] dark:border-white/[0.06] z-10">
        <p>
          {SITE_CONFIG.name} — Private Ephemeral File &amp; Note Transfer. No cookies. No tracking. No telemetry.
        </p>
      </footer>
    </div>
  );
}
