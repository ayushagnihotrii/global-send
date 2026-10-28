'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
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
  ShieldCheck,
  Smartphone,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
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
    return { score: 4, label: 'Very strong key', colorClass: 'bg-[#006a60] dark:bg-[#82d5c8]' };
  }
  if (len >= 14 && (variety >= 2 || uniqueChars >= 8)) {
    return { score: 3, label: 'Strong key', colorClass: 'bg-[#006a60] dark:bg-[#82d5c8]' };
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4fbf8] dark:bg-[#0e1513] text-[#05201c] dark:text-[#ffffff] transition-colors duration-200 selection:bg-[#006a60] selection:text-white dark:selection:bg-[#82d5c8] dark:selection:text-[#0e1513]">
      
      {/* LOCALSEND FIXED NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-[#f4fbf8]/80 dark:bg-[#0e1513]/80 backdrop-blur-md border-b border-[#3f49471f] dark:border-[#82d5c81a] transition-colors">
        <nav className="max-w-[1100px] mx-auto h-full px-5 flex items-center justify-between">
          
          {/* Logo with LocalSend style slow-rotating icon */}
          <Link
            href="/"
            className="flex items-center gap-3 select-none group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center ls-rotating-logo">
              <Logo size={36} className="shadow-none border-none" />
            </div>
            <span className="text-[1.35rem] font-extrabold tracking-tight text-[#05201c] dark:text-white">
              {SITE_CONFIG.name}
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center gap-8 text-[0.95rem] font-semibold text-[#3f4947] dark:text-[#a0b0ad]">
            <li>
              <button
                type="button"
                onClick={() => scrollToSection('transfer')}
                className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors cursor-pointer"
              >
                Transfer
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors cursor-pointer"
              >
                Features
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors cursor-pointer"
              >
                How It Works
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => scrollToSection('security')}
                className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors cursor-pointer"
              >
                Security
              </button>
            </li>
            <li>
              <a
                href="https://github.com/ayushagnihotrii/global-send"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>GitHub</span>
              </a>
            </li>
          </ul>

          {/* Nav Actions (Theme Switcher & Primary Action Pill) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark/light theme"
              className="w-10 h-10 rounded-full border border-[#3f494729] dark:border-[#82d5c81a] bg-[#cce8e2]/25 dark:bg-[#131e1c] text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#006a60] dark:hover:text-[#82d5c8] flex items-center justify-center transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#82d5c8]" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                scrollToSection('transfer');
              }}
              className="px-5 py-2 rounded-full font-semibold text-[0.9rem] bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513] hover:opacity-95 shadow-sm hover:shadow transition-all cursor-pointer hidden sm:inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Open Vault</span>
            </button>
          </div>

        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="pt-36 sm:pt-44 pb-12 sm:pb-16 px-5 text-center">
        <div className="max-w-[900px] mx-auto space-y-5">
          
          <h1 className="text-[2.5rem] sm:text-[3.75rem] font-black tracking-tight leading-[1.08] text-[#05201c] dark:text-white">
            Share files across any device. <br />
            <span className="text-[#006a60] dark:text-[#82d5c8]">Fast, private, encrypted.</span>
          </h1>

          <p className="text-[1.15rem] sm:text-[1.3rem] text-[#3f4947] dark:text-[#a0b0ad] max-w-[620px] mx-auto leading-relaxed">
            Open-source, ephemeral cloud vault and clipboard locker for all your devices. Zero third-party cloud accounts required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => scrollToSection('transfer')}
              className="px-7 py-3.5 rounded-full font-bold text-[1rem] bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513] hover:opacity-90 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Save &amp; Transfer to Vault</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="px-7 py-3.5 rounded-full font-semibold text-[1rem] bg-[#eff5f2] dark:bg-[#131e1c] text-[#006a60] dark:text-[#82d5c8] border border-[#3f494729] dark:border-[#82d5c81a] hover:bg-[#cce8e2] dark:hover:bg-[#1a2624] transition-all cursor-pointer"
            >
              How It Works
            </button>
          </div>

        </div>
      </section>

      {/* CORE INTERACTIVE CONSOLE (LOCALSEND DESKTOP MOCKUP WINDOW) */}
      <section id="transfer" className="px-4 sm:px-6 pb-20">
        <div className="max-w-[620px] mx-auto">
          
          {/* Mockup Window Container */}
          <div className="rounded-[24px] sm:rounded-[28px] border-[2px] sm:border-[3px] border-[#006a60]/20 dark:border-[#384a47] bg-[#eff5f2] dark:bg-[#131e1c] shadow-[0_24px_60px_-15px_rgba(0,106,96,0.15)] dark:shadow-[0_28px_70px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
            
            {/* Window Top Titlebar */}
            <div className="px-5 py-3.5 border-b border-[#3f49471f] dark:border-[#82d5c81a] bg-[#e7f3f0] dark:bg-[#0e1513] flex items-center justify-between">
              
              {/* Traffic light dots */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block" />
              </div>

              {/* Mode Switcher Pill */}
              {authMode !== 'recovery' && (
                <div className="flex items-center gap-1 bg-[#cce8e2]/40 dark:bg-white/[0.05] p-1 rounded-full border border-[#3f494714] dark:border-[#82d5c814]">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setAuthMode('signin');
                    }}
                    className={`px-4 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                      authMode === 'signin'
                        ? 'bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513] shadow-xs'
                        : 'text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setAuthMode('register');
                    }}
                    className={`px-4 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513] shadow-xs'
                        : 'text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white'
                    }`}
                  >
                    Create Vault
                  </button>
                </div>
              )}

              {/* Status indicator */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#006a60] dark:text-[#82d5c8]">
                <span className="w-2 h-2 rounded-full bg-[#006a60] dark:bg-[#82d5c8] animate-pulse" />
                <span className="hidden sm:inline">Encrypted</span>
              </div>

            </div>

            {/* Window Interior Content */}
            <div className="p-6 sm:p-8 space-y-6">

              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-[16px] bg-[#ff3b30]/10 dark:bg-[#ff453a]/15 border border-[#ff3b30]/20 text-[13px] font-semibold text-[#ff3b30] dark:text-[#ff453a] flex items-center gap-2.5"
                >
                  <span className="w-2 h-2 rounded-full bg-[#ff3b30] shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* SECTION 1: FRONT-PAGE COMPOSER (DROP FILE OR PASTE TEXT) */}
              {authMode !== 'recovery' && (
                <div className="space-y-3.5 pb-2 border-b border-[#3f49471f] dark:border-[#82d5c814]">
                  
                  {/* Composer Sub-tabs & Expiration Duration */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-[#cce8e2]/30 dark:bg-white/[0.04] p-1 rounded-full border border-[#3f494714] dark:border-[#82d5c814]">
                      <button
                        type="button"
                        onClick={() => setComposerTab('file')}
                        className={`px-3.5 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          composerTab === 'file'
                            ? 'bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513] shadow-xs'
                            : 'text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white'
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>File</span>
                        {stagedFile && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#0e1513]" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setComposerTab('note')}
                        className={`px-3.5 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          composerTab === 'note'
                            ? 'bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513] shadow-xs'
                            : 'text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Note &amp; Code</span>
                        {stagedNote.trim() && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#0e1513]" />}
                      </button>
                    </div>

                    {/* Expiration Pills */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#3f4947] dark:text-[#a0b0ad] mr-1 hidden sm:inline flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-[#006a60] dark:text-[#82d5c8]" />
                        TTL:
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
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                            expirationSec === exp.sec
                              ? 'bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513]'
                              : 'text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white'
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
                        <div className="p-4 rounded-[18px] bg-[#e7f3f0] dark:bg-[#0e1513] border border-[#3f494729] dark:border-[#82d5c81a] flex items-center justify-between gap-3 animate-in fade-in duration-150">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-[#006a60]/10 dark:bg-[#82d5c8]/20 text-[#006a60] dark:text-[#82d5c8] flex items-center justify-center shrink-0">
                              <FileIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[14px] font-bold text-[#05201c] dark:text-white truncate">
                                {stagedFile.name}
                              </p>
                              <p className="text-[12px] text-[#3f4947] dark:text-[#a0b0ad]">
                                {formatBytes(stagedFile.size)} · Ready to save to your vault
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setStagedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#ff3b30] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer shrink-0 transition-colors"
                            title="Remove file"
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
                          className={`border-2 border-dashed rounded-[20px] p-7 text-center cursor-pointer transition-all duration-150 ${
                            isDragOver
                              ? 'border-[#006a60] dark:border-[#82d5c8] bg-[#cce8e2]/30 dark:bg-[#82d5c8]/10 scale-[1.01]'
                              : 'border-[#3f49473d] dark:border-[#82d5c829] hover:border-[#006a60] dark:hover:border-[#82d5c8] hover:bg-[#cce8e2]/15 dark:hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="w-11 h-11 mx-auto rounded-[14px] bg-[#cce8e2] dark:bg-[#82d5c8]/15 text-[#006a60] dark:text-[#82d5c8] flex items-center justify-center mb-2.5">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <p className="text-[15px] font-bold text-[#05201c] dark:text-white">
                            Drag &amp; drop file to save
                          </p>
                          <p className="text-[13px] text-[#3f4947] dark:text-[#a0b0ad] mt-0.5">
                            or <span className="text-[#006a60] dark:text-[#82d5c8] font-semibold underline">browse files</span> (up to 250 MB · optional)
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <textarea
                          rows={3}
                          placeholder="Paste a code snippet, link, exam question, or private note..."
                          value={stagedNote}
                          onChange={(e) => setStagedNote(e.target.value)}
                          className={`w-full rounded-[18px] bg-[#e7f3f0] dark:bg-[#0e1513] border border-[#3f494729] dark:border-[#82d5c81a] p-3.5 text-[14px] leading-relaxed text-[#05201c] dark:text-white placeholder-[#3f4947]/70 dark:placeholder-[#a0b0ad]/60 focus:outline-none focus:ring-2 focus:ring-[#006a60] dark:focus:ring-[#82d5c8] resize-none transition-all ${
                            isCodeFont ? 'font-mono' : 'font-sans'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#3f4947] dark:text-[#a0b0ad] px-1">
                        <button
                          type="button"
                          onClick={() => setIsCodeFont(!isCodeFont)}
                          className={`inline-flex items-center gap-1 font-semibold hover:text-[#006a60] dark:hover:text-[#82d5c8] cursor-pointer ${
                            isCodeFont ? 'text-[#006a60] dark:text-[#82d5c8]' : ''
                          }`}
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>{isCodeFont ? 'Monospace active' : 'Toggle Monospace'}</span>
                        </button>

                        {stagedNote.trim() && (
                          <span className="font-mono">{stagedNote.length} characters</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: AUTHENTICATION FORM */}
              {authMode !== 'recovery' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#3f4947] dark:text-[#a0b0ad]">
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
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      icon={<User className="w-4 h-4 text-[#006a60] dark:text-[#82d5c8]" />}
                      required
                    />
                  </div>

                  {/* Key Input */}
                  <div>
                    {authMode === 'register' && (
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[13px] font-semibold text-[#05201c] dark:text-white">
                          Private Login Key
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateKey}
                          className="text-[12px] font-semibold text-[#006a60] dark:text-[#82d5c8] hover:underline flex items-center gap-1 cursor-pointer"
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
                        icon={<KeyRound className="w-4 h-4 text-[#006a60] dark:text-[#82d5c8]" />}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-[33px] text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white cursor-pointer"
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
                        <span className="text-[11px] font-semibold text-[#3f4947] dark:text-[#a0b0ad]">{keyStrength.label}</span>
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
                          className="text-[12px] text-[#006a60] dark:text-[#82d5c8] font-semibold hover:underline cursor-pointer"
                        >
                          Forgot key?
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Registration Security Question & Answer */}
                  {authMode === 'register' && (
                    <div className="space-y-3.5 pt-1">
                      <div>
                        <label className="block text-[13px] font-semibold text-[#05201c] dark:text-white mb-1.5">
                          Security Question (for Key Recovery)
                        </label>
                        <select
                          value={selectedQuestionPreset}
                          onChange={(e) => setSelectedQuestionPreset(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-[12px] text-[13px] bg-[#e7f3f0] dark:bg-[#0e1513] border border-[#3f494729] dark:border-[#82d5c81a] text-[#05201c] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006a60] dark:focus:ring-[#82d5c8]"
                        >
                          {PRESET_SECURITY_QUESTIONS.map((q) => (
                            <option key={q} value={q} className="dark:bg-[#131e1c]">
                              {q}
                            </option>
                          ))}
                          <option value="custom" className="dark:bg-[#131e1c]">
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
                            icon={<HelpCircle className="w-4 h-4 text-[#006a60] dark:text-[#82d5c8]" />}
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
                            className="absolute right-3 top-[33px] text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white cursor-pointer"
                            aria-label={showSecurityAnswer ? 'Hide answer' : 'Show answer'}
                          >
                            {showSecurityAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-[#3f4947] dark:text-[#a0b0ad] mt-1.5">
                          Answers are case-insensitive. Minimum 4 characters.
                        </p>
                      </div>

                      <div className="pt-1">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={acknowledgedWarning}
                            onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                            className="mt-0.5 rounded-[4px] border-black/20 text-[#006a60] dark:text-[#82d5c8] focus:ring-[#006a60]"
                          />
                          <span className="text-[12px] text-[#3f4947] dark:text-[#a0b0ad] leading-snug">
                            If I forget my key AND my security answer, my account cannot be recovered.
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Primary Submit Pill Button */}
                  <button
                    type="submit"
                    disabled={!username.trim() || !loginKey.trim() || isLoading}
                    className="w-full mt-2 py-3.5 px-6 rounded-full font-bold text-[15px] bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{submitButtonLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Switch Mode Footer */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setAuthMode(authMode === 'signin' ? 'register' : 'signin');
                      }}
                      className="text-[13px] text-[#006a60] dark:text-[#82d5c8] font-semibold hover:underline cursor-pointer"
                    >
                      {authMode === 'signin'
                        ? "Don't have a vault yet? Create new vault"
                        : 'Already have a vault? Sign in'}
                    </button>
                  </div>
                </form>
              ) : (
                /* RECOVERY FLOW */
                <div className="space-y-4">
                  <div className="mb-2">
                    <h2 className="text-[18px] font-bold text-[#05201c] dark:text-white">
                      Recover Vault Key
                    </h2>
                    <p className="text-[13px] text-[#3f4947] dark:text-[#a0b0ad] mt-0.5">
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
                          icon={<User className="w-4 h-4 text-[#006a60] dark:text-[#82d5c8]" />}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!recoveryUsername.trim() || isLoading}
                        className="w-full py-3.5 px-6 rounded-full font-bold text-[15px] bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setAuthMode('signin');
                          }}
                          className="text-[13px] text-[#006a60] dark:text-[#82d5c8] font-semibold hover:underline cursor-pointer"
                        >
                          Remember your key? Back to sign in
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleResetRecoveryKey} className="space-y-4">
                      <div className="p-4 rounded-[16px] bg-[#cce8e2]/40 dark:bg-[#82d5c8]/10 border border-[#006a60]/20 dark:border-[#82d5c8]/20">
                        <div className="text-[11px] font-bold text-[#006a60] dark:text-[#82d5c8] uppercase tracking-wider mb-1">
                          Security Question
                        </div>
                        <p className="text-[14px] font-medium text-[#05201c] dark:text-white">
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
                            className="absolute right-3 top-[33px] text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white cursor-pointer"
                            aria-label={showRecoveryAnswer ? 'Hide answer' : 'Show answer'}
                          >
                            {showRecoveryAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-[#3f4947] dark:text-[#a0b0ad] mt-1.5">
                          Answers are case-insensitive and tolerate whitespace.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[13px] font-semibold text-[#05201c] dark:text-white">
                            New Private Login Key
                          </label>
                          <button
                            type="button"
                            onClick={handleGenerateRecoveryKey}
                            className="text-[12px] font-semibold text-[#006a60] dark:text-[#82d5c8] hover:underline flex items-center gap-1 cursor-pointer"
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
                            icon={<KeyRound className="w-4 h-4 text-[#006a60] dark:text-[#82d5c8]" />}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewRecoveryKey(!showNewRecoveryKey)}
                            className="absolute right-3 top-[10px] text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white cursor-pointer"
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
                            <span className="text-[11px] font-semibold text-[#3f4947] dark:text-[#a0b0ad]">{recoveryKeyStrength.label}</span>
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
                            icon={<KeyRound className="w-4 h-4 text-[#006a60] dark:text-[#82d5c8]" />}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmRecoveryKey(!showConfirmRecoveryKey)}
                            className="absolute right-3 top-[33px] text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white cursor-pointer"
                            aria-label={showConfirmRecoveryKey ? 'Hide confirm key' : 'Show confirm key'}
                          >
                            {showConfirmRecoveryKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!recoveryAnswer.trim() || !newRecoveryKey.trim() || newRecoveryKey !== confirmRecoveryKey || isLoading}
                        className="w-full py-3.5 px-6 rounded-full font-bold text-[15px] bg-[#006a60] dark:bg-[#82d5c8] text-white dark:text-[#0e1513] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Reset Key &amp; Return to Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setRecoveryStep(1);
                            setAuthMode('signin');
                          }}
                          className="text-[13px] text-[#3f4947] dark:text-[#a0b0ad] hover:text-[#05201c] dark:hover:text-white cursor-pointer"
                        >
                          Cancel recovery
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* LOCALSEND STATS SECTION */}
      <section className="px-5 pb-20">
        <div className="max-w-[1000px] mx-auto rounded-[24px] bg-[#eff5f2] dark:bg-[#131e1c] border border-[#3f494729] dark:border-[#82d5c81a] p-8 sm:p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-[#3f49471f] dark:divide-[#82d5c81a]">
            
            <div className="space-y-1">
              <span className="block text-[2rem] sm:text-[2.5rem] font-black tracking-tight text-[#006a60] dark:text-[#82d5c8]">
                100%
              </span>
              <span className="text-[0.95rem] font-semibold text-[#3f4947] dark:text-[#a0b0ad]">
                Private &amp; Decentralized
              </span>
            </div>

            <div className="space-y-1 pt-6 md:pt-0">
              <span className="block text-[2rem] sm:text-[2.5rem] font-black tracking-tight text-[#006a60] dark:text-[#82d5c8]">
                256-bit
              </span>
              <span className="text-[0.95rem] font-semibold text-[#3f4947] dark:text-[#a0b0ad]">
                Argon2id Key Derivation
              </span>
            </div>

            <div className="space-y-1 pt-6 md:pt-0">
              <span className="block text-[2rem] sm:text-[2.5rem] font-black tracking-tight text-[#006a60] dark:text-[#82d5c8]">
                24 Hours
              </span>
              <span className="text-[0.95rem] font-semibold text-[#3f4947] dark:text-[#a0b0ad]">
                Default Self-Destruct
              </span>
            </div>

            <div className="space-y-1 pt-6 md:pt-0">
              <span className="block text-[2rem] sm:text-[2.5rem] font-black tracking-tight text-[#006a60] dark:text-[#82d5c8]">
                Zero
              </span>
              <span className="text-[0.95rem] font-semibold text-[#3f4947] dark:text-[#a0b0ad]">
                Third-Party Tracking
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* LOCALSEND FEATURES SECTION */}
      <section id="features" className="px-5 py-16 max-w-[1100px] mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-[2.2rem] sm:text-[2.6rem] font-black tracking-tight text-[#05201c] dark:text-white">
            Features
          </h2>
          <p className="text-[1.05rem] text-[#3f4947] dark:text-[#a0b0ad] leading-relaxed">
            Everything you need for secure, fast, and temporary file sharing across devices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Feature 1 */}
          <div className="p-7 rounded-[22px] bg-[#eff5f2] dark:bg-[#131e1c] border border-[#3f494729] dark:border-[#82d5c81a] space-y-4 hover:-translate-y-1 transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-[#cce8e2] dark:bg-[#82d5c8]/15 text-[#006a60] dark:text-[#82d5c8] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-[1.25rem] font-extrabold text-[#05201c] dark:text-white">
              No Cloud Accounts
            </h3>
            <p className="text-[0.95rem] text-[#3f4947] dark:text-[#a0b0ad] leading-relaxed">
              No Google OAuth, Apple ID, or phone numbers. Sign in with only your unique username and private encryption key.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-[22px] bg-[#eff5f2] dark:bg-[#131e1c] border border-[#3f494729] dark:border-[#82d5c81a] space-y-4 hover:-translate-y-1 transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-[#cce8e2] dark:bg-[#82d5c8]/15 text-[#006a60] dark:text-[#82d5c8] flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-[1.25rem] font-extrabold text-[#05201c] dark:text-white">
              Automatic Purge
            </h3>
            <p className="text-[0.95rem] text-[#3f4947] dark:text-[#a0b0ad] leading-relaxed">
              Files and notes automatically vanish after your chosen expiration (1h, 24h, 7d). Zero permanent digital residue.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-[22px] bg-[#eff5f2] dark:bg-[#131e1c] border border-[#3f494729] dark:border-[#82d5c81a] space-y-4 hover:-translate-y-1 transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-[#cce8e2] dark:bg-[#82d5c8]/15 text-[#006a60] dark:text-[#82d5c8] flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-[1.25rem] font-extrabold text-[#05201c] dark:text-white">
              Universal Sync
            </h3>
            <p className="text-[0.95rem] text-[#3f4947] dark:text-[#a0b0ad] leading-relaxed">
              Save code snippets on your mobile phone, open your desktop browser, and click Copy to place it directly on your clipboard.
            </p>
          </div>

        </div>
      </section>

      {/* LOCALSEND HOW IT WORKS SECTION */}
      <section id="how-it-works" className="px-5 py-16 max-w-[1100px] mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-[2.2rem] sm:text-[2.6rem] font-black tracking-tight text-[#05201c] dark:text-white">
            How It Works
          </h2>
          <p className="text-[1.05rem] text-[#3f4947] dark:text-[#a0b0ad] leading-relaxed">
            Zero configuration. Just drop, authenticate, and sync seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-7 rounded-[22px] bg-[#eff5f2] dark:bg-[#131e1c] border border-[#3f494729] dark:border-[#82d5c81a] text-center space-y-3">
            <span className="inline-block text-[1.8rem] font-black text-[#006a60] dark:text-[#82d5c8]">
              01
            </span>
            <h3 className="text-[1.2rem] font-extrabold text-[#05201c] dark:text-white">
              Drop &amp; Compose
            </h3>
            <p className="text-[0.95rem] text-[#3f4947] dark:text-[#a0b0ad] leading-relaxed">
              Drop any photo, document, video, or paste code snippets directly onto the front-page transfer console.
            </p>
          </div>

          <div className="p-7 rounded-[22px] bg-[#eff5f2] dark:bg-[#131e1c] border border-[#3f494729] dark:border-[#82d5c81a] text-center space-y-3">
            <span className="inline-block text-[1.8rem] font-black text-[#006a60] dark:text-[#82d5c8]">
              02
            </span>
            <h3 className="text-[1.2rem] font-extrabold text-[#05201c] dark:text-white">
              Authorize with Key
            </h3>
            <p className="text-[0.95rem] text-[#3f4947] dark:text-[#a0b0ad] leading-relaxed">
              Enter your username and private key. Argon2id derives your session with constant-time verification.
            </p>
          </div>

          <div className="p-7 rounded-[22px] bg-[#eff5f2] dark:bg-[#131e1c] border border-[#3f494729] dark:border-[#82d5c81a] text-center space-y-3">
            <span className="inline-block text-[1.8rem] font-black text-[#006a60] dark:text-[#82d5c8]">
              03
            </span>
            <h3 className="text-[1.2rem] font-extrabold text-[#05201c] dark:text-white">
              Instant Vault Sync
            </h3>
            <p className="text-[0.95rem] text-[#3f4947] dark:text-[#a0b0ad] leading-relaxed">
              Your item is saved directly into your vault timeline and available immediately on all your active devices.
            </p>
          </div>

        </div>
      </section>

      {/* LOCALSEND SECURITY SECTION */}
      <section id="security" className="px-5 py-16 max-w-[1100px] mx-auto w-full">
        <div className="p-8 sm:p-12 rounded-[28px] bg-[#eff5f2] dark:bg-[#131e1c] border border-[#3f494729] dark:border-[#82d5c81a] space-y-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-[2rem] sm:text-[2.4rem] font-black tracking-tight text-[#05201c] dark:text-white">
              Security by Design
            </h2>
            <p className="text-[1rem] text-[#3f4947] dark:text-[#a0b0ad] leading-relaxed">
              Every cryptographic and access-control guarantee is verified server-side.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-5 rounded-[18px] bg-[#e7f3f0] dark:bg-[#0e1513] border border-[#3f49471f] dark:border-[#82d5c814] space-y-2">
              <div className="flex items-center gap-2 text-[#006a60] dark:text-[#82d5c8] font-bold text-[1rem]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Argon2id Salted Hashes</span>
              </div>
              <p className="text-[0.9rem] text-[#3f4947] dark:text-[#a0b0ad]">
                Keys and recovery answers are never stored in plaintext and never leaked in API payloads.
              </p>
            </div>

            <div className="p-5 rounded-[18px] bg-[#e7f3f0] dark:bg-[#0e1513] border border-[#3f49471f] dark:border-[#82d5c814] space-y-2">
              <div className="flex items-center gap-2 text-[#006a60] dark:text-[#82d5c8] font-bold text-[1rem]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Anti-Enumeration HMAC</span>
              </div>
              <p className="text-[0.9rem] text-[#3f4947] dark:text-[#a0b0ad]">
                Querying unknown accounts produces deterministic HMAC fake questions so attackers cannot probe usernames.
              </p>
            </div>

            <div className="p-5 rounded-[18px] bg-[#e7f3f0] dark:bg-[#0e1513] border border-[#3f49471f] dark:border-[#82d5c814] space-y-2">
              <div className="flex items-center gap-2 text-[#006a60] dark:text-[#82d5c8] font-bold text-[1rem]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Persistent Lockout</span>
              </div>
              <p className="text-[0.9rem] text-[#3f4947] dark:text-[#a0b0ad]">
                5 wrong attempts lock recovery for 30 minutes, doubling up to 24 hours across all sessions and IPs.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* LOCALSEND FOOTER */}
      <footer className="pt-16 pb-12 px-5 border-t border-[#3f49471f] dark:border-[#82d5c81a] mt-auto">
        <div className="max-w-[1100px] mx-auto space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            
            {/* Brand Column */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <Logo size={28} className="shadow-none border-none" />
                <span className="text-[1.2rem] font-black tracking-tight text-[#05201c] dark:text-white">
                  {SITE_CONFIG.name}
                </span>
              </div>
              <p className="text-[0.95rem] text-[#3f4947] dark:text-[#a0b0ad] max-w-sm leading-relaxed">
                Open source, end-to-end encrypted file sharing and private vault across nearby devices and browsers.
              </p>
            </div>

            {/* Links Column 1 */}
            <div className="space-y-3">
              <h4 className="text-[0.95rem] font-bold text-[#05201c] dark:text-white uppercase tracking-wider">
                App
              </h4>
              <ul className="space-y-2 text-[0.9rem] text-[#3f4947] dark:text-[#a0b0ad]">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('transfer')}
                    className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors cursor-pointer"
                  >
                    Transfer Console
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('features')}
                    className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors cursor-pointer"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('how-it-works')}
                    className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors cursor-pointer"
                  >
                    How It Works
                  </button>
                </li>
              </ul>
            </div>

            {/* Links Column 2 */}
            <div className="space-y-3">
              <h4 className="text-[0.95rem] font-bold text-[#05201c] dark:text-white uppercase tracking-wider">
                Open Source
              </h4>
              <ul className="space-y-2 text-[0.9rem] text-[#3f4947] dark:text-[#a0b0ad]">
                <li>
                  <a
                    href="https://github.com/ayushagnihotrii/global-send"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors cursor-pointer"
                  >
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('security')}
                    className="hover:text-[#006a60] dark:hover:text-[#82d5c8] transition-colors cursor-pointer"
                  >
                    Security Model
                  </button>
                </li>
                <li>
                  <span className="text-[0.85rem] text-[#3f4947]/70 dark:text-[#a0b0ad]/70">
                    MIT License
                  </span>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-[#3f49471f] dark:border-[#82d5c81a] flex flex-col sm:flex-row items-center justify-between gap-4 text-[0.85rem] text-[#3f4947] dark:text-[#a0b0ad]">
            <p>© {new Date().getFullYear()} Global Send. Inspired by LocalSend design template.</p>
            <p>No telemetry · No third-party cookies · Open source</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
