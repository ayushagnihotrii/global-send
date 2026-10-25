'use client';

import React, { useState, useMemo } from 'react';
import {
  KeyRound,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Lock,
  Clock,
  MessageSquare,
  FileText,
  Check,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { SITE_CONFIG } from '@/config/site';
import { Logo } from '@/components/ui/Logo';

interface AuthModalProps {
  onSuccess: (user: any) => void;
}

type AuthView = 'login' | 'register';

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
    return { score: 4, label: 'Strong key', colorClass: 'bg-[#34c759]' };
  }
  if (len >= 14 && (variety >= 2 || uniqueChars >= 8)) {
    return { score: 3, label: 'Good key', colorClass: 'bg-[#34c759]' };
  }
  if (len >= 10 && uniqueChars >= 5) {
    return { score: 2, label: 'Moderate key', colorClass: 'bg-[#ff9500]' };
  }
  return { score: 1, label: 'Fair — longer keys are safer', colorClass: 'bg-[#ff9500]' };
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const { toast } = useToast();
  const [view, setView] = useState<AuthView>('login');
  const [username, setUsername] = useState('');
  const [loginKey, setLoginKey] = useState('');
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyStrength = useMemo(() => computeClientKeyStrength(loginKey), [loginKey]);

  const switchView = (nextView: AuthView) => {
    setError(null);
    setLoginKey('');
    setShowKey(false);
    setAcknowledgedWarning(false);
    setView(nextView);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: loginKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid key. Please check your key and try again.');
        return;
      }

      toast.success(`Signed in as @${data.user.displayUsername || data.user.username}`);
      onSuccess(data.user);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acknowledgedWarning) {
      setError(
        'Please acknowledge that your private login key cannot be recovered if lost.'
      );
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
          acknowledgedWarning: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      toast.success(
        `Welcome, @${data.user.displayUsername || data.user.username}`
      );
      onSuccess(data.user);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f7] dark:bg-[#000000] text-[#1c1c1e] dark:text-[#f5f5f7]">
      {/* Native Apple Translucent Navigation Bar */}
      <header className="sticky top-0 z-30 h-13 ios-material border-b border-black/[0.07] dark:border-white/[0.09]">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-[15px] font-semibold tracking-[-0.015em] text-[#1c1c1e] dark:text-[#f5f5f7]">
              {SITE_CONFIG.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => switchView('login')}
              className={`px-3 py-1 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer ${
                view === 'login'
                  ? 'bg-[#007aff] text-white dark:bg-[#0a84ff]'
                  : 'text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchView('register')}
              className={`px-3 py-1 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer ${
                view === 'register'
                  ? 'bg-[#007aff] text-white dark:bg-[#0a84ff]'
                  : 'text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white'
              }`}
            >
              New Vault
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Native iOS / macOS Continuity Product Showcase */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[12px] font-medium text-[#3c3c43] dark:text-[#ebebf5]/80">
                <Lock className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff]" />
                <span>Key-only private cloud vault &amp; direct messaging</span>
              </div>

              <h1 className="text-[30px] sm:text-[38px] font-bold tracking-[-0.03em] leading-[1.12] text-[#1c1c1e] dark:text-[#f5f5f7]">
                Your files, notes, and messages. Ready on every device.
              </h1>

              <p className="text-[15px] sm:text-[16px] leading-relaxed text-[#6c6c70] dark:text-[#98989d]">
                Drop a file, save a code snippet, or send an attachment directly to another user by username. Everything expires automatically on your schedule—with zero email or phone number required.
              </p>
            </div>

            {/* Authentic iOS Grouped Surface Preview Stack */}
            <div className="space-y-2.5 max-w-xl">
              {/* Preview Row 1: Vault File Item */}
              <div className="ios-card rounded-[16px] p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[11px] bg-[#007aff]/10 dark:bg-[#0a84ff]/18 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                        System_Architecture_v4.pdf
                      </p>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-[6px] bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-[#6c6c70] dark:text-[#98989d] tabular-nums shrink-0">
                        4.8 MB
                      </span>
                    </div>
                    <p className="text-[12px] text-[#8e8e93] flex items-center gap-1.5 mt-0.5 tabular-nums">
                      <Clock className="w-3 h-3 text-[#ff9500]" />
                      <span>Expires in 23h 42m · Synced across devices</span>
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#007aff]/10 dark:bg-[#0a84ff]/16 text-[#007aff] dark:text-[#409cff] text-[12px] font-medium shrink-0">
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ready</span>
                </span>
              </div>

              {/* Preview Row 2: Two-column mini bento (Snippet + Direct Chat) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="ios-card rounded-[16px] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                      Quick Note &amp; Code
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#34c759] dark:text-[#30d158]">
                      <Check className="w-3 h-3" />
                      Copied
                    </span>
                  </div>
                  <pre className="text-[11px] leading-relaxed p-2.5 rounded-[10px] bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#3c3c43] dark:text-[#ebebf5] overflow-hidden font-mono">
                    {`curl -X POST /api/items \\\n  -d '{"ttl": 86400}'`}
                  </pre>
                </div>

                <div className="ios-card rounded-[16px] p-3.5 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff]" />
                      Direct Chat
                    </span>
                    <span className="text-[11px] text-[#8e8e93]">@alex_dev</span>
                  </div>
                  <div className="self-end bg-[#007aff] text-white text-[12px] px-3 py-1.5 rounded-[14px] rounded-br-[4px] max-w-[92%]">
                    Sent Release_Build.zip from Vault
                  </div>
                  <p className="text-[11px] text-[#8e8e93] tabular-nums">
                    Zero duplicate storage · Live expiry
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: iOS Sheet-Style Auth Card */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[22px] border border-black/[0.08] dark:border-white/[0.12] ios-sheet-shadow p-6 sm:p-7">
              {/* Mode Switcher */}
              <div className="mb-6">
                <SegmentedControl
                  className="w-full"
                  value={view}
                  onChange={(v) => switchView(v)}
                  options={[
                    { value: 'login', label: 'Enter Key' },
                    { value: 'register', label: 'Create Vault' },
                  ]}
                />
              </div>

              <div className="mb-5">
                <h2 className="text-[22px] font-bold tracking-[-0.022em] text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {view === 'login' ? 'Unlock Your Vault' : 'Create Your Vault'}
                </h2>
                <p className="text-[13px] text-[#6c6c70] dark:text-[#98989d] mt-1 leading-relaxed">
                  {view === 'login'
                    ? 'Enter your private login key to access your saved items and conversations.'
                    : 'Pick a public username and a private key. No email or phone number is collected.'}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-[12px] bg-[#ff3b30]/10 dark:bg-[#ff453a]/15 border border-[#ff3b30]/20 text-[13px] font-medium text-[#ff3b30] dark:text-[#ff453a]"
                >
                  {error}
                </div>
              )}

              {/* RETURNING USER LOGIN */}
              {view === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Input
                      label="Private Login Key"
                      type={showKey ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your private key"
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
                      {showKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={!loginKey.trim()}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <div className="pt-4 border-t border-black/[0.07] dark:border-white/[0.08] text-center">
                    <p className="text-[13px] text-[#6c6c70] dark:text-[#98989d]">
                      New to {SITE_CONFIG.name}?{' '}
                      <button
                        type="button"
                        onClick={() => switchView('register')}
                        className="text-[#007aff] dark:text-[#0a84ff] font-medium hover:underline cursor-pointer"
                      >
                        Create a vault key
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* NEW ACCOUNT REGISTRATION */}
              {view === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Input
                      label="Public Username"
                      type="text"
                      autoComplete="username"
                      placeholder="e.g. alex_01 (3–24 characters)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      icon={<User className="w-4 h-4" />}
                      maxLength={24}
                      required
                    />
                    <p className="mt-1 text-[11px] text-[#8e8e93]">
                      Used so contacts can find you in Chats. Letters, numbers, underscores, and periods.
                    </p>
                  </div>

                  <div>
                    <div className="relative">
                      <Input
                        label="Private Login Key"
                        type={showKey ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="8–128 characters"
                        value={loginKey}
                        onChange={(e) => setLoginKey(e.target.value)}
                        icon={<KeyRound className="w-4 h-4" />}
                        maxLength={128}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-[33px] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                        aria-label={showKey ? 'Hide login key' : 'Show login key'}
                      >
                        {showKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* iOS Segmented Strength Bar */}
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1 h-1 w-full">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`flex-1 rounded-full transition-colors ${
                              keyStrength.score >= level
                                ? keyStrength.colorClass
                                : 'bg-black/[0.08] dark:bg-white/[0.12]'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#8e8e93]">
                        <span>{keyStrength.label}</span>
                        <span>14+ characters recommended</span>
                      </div>
                    </div>
                  </div>

                  {/* Unrecoverable Key Notice */}
                  <div className="p-3.5 rounded-[14px] bg-[#ff9500]/10 dark:bg-[#ff9f0a]/14 border border-[#ff9500]/25 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#ff9500] dark:text-[#ff9f0a] shrink-0 mt-0.5" />
                      <p className="text-[12px] text-[#1c1c1e] dark:text-[#f5f5f7] leading-relaxed">
                        Your login key is never stored in plain text and <span className="font-semibold">cannot be reset or recovered</span> if forgotten. Save a copy before continuing.
                      </p>
                    </div>

                    <label className="flex items-start gap-2.5 pt-0.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={acknowledgedWarning}
                        onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                        className="mt-0.5 rounded border-black/20 text-[#007aff] focus:ring-[#007aff] accent-[#007aff]"
                        required
                      />
                      <span className="text-[12px] text-[#1c1c1e] dark:text-[#f5f5f7] font-medium">
                        I have saved my private login key in a safe place.
                      </span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={!acknowledgedWarning || !username.trim() || loginKey.length < 8}
                  >
                    <span>Create Vault</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <div className="pt-3 border-t border-black/[0.07] dark:border-white/[0.08] text-center">
                    <p className="text-[13px] text-[#6c6c70] dark:text-[#98989d]">
                      Already have a key?{' '}
                      <button
                        type="button"
                        onClick={() => switchView('login')}
                        className="text-[#007aff] dark:text-[#0a84ff] font-medium hover:underline cursor-pointer"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
