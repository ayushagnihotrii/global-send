'use client';

import React, { useState, useMemo } from 'react';
import {
  KeyRound,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    return { score: 0, label: '8–128 characters required', colorClass: 'bg-zinc-200 dark:bg-zinc-800' };
  }
  if (len < 8) {
    return { score: 0, label: `Too short (${len}/8 min)`, colorClass: 'bg-red-500' };
  }

  let variety = 0;
  if (/[a-z]/.test(key)) variety++;
  if (/[A-Z]/.test(key)) variety++;
  if (/[0-9]/.test(key)) variety++;
  if (/[^a-zA-Z0-9]/.test(key)) variety++;

  const uniqueChars = new Set(Array.from(key)).size;

  if (len >= 20 && uniqueChars >= 10) {
    return { score: 4, label: 'Very strong key', colorClass: 'bg-emerald-500' };
  }
  if (len >= 14 && (variety >= 2 || uniqueChars >= 8)) {
    return { score: 3, label: 'Strong key', colorClass: 'bg-emerald-500' };
  }
  if (len >= 10 && uniqueChars >= 5) {
    return { score: 2, label: 'Moderate key', colorClass: 'bg-amber-500' };
  }
  return { score: 1, label: 'Basic — longer keys are safer', colorClass: 'bg-amber-500' };
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
        'Please acknowledge the warning that your login key cannot be recovered if lost.'
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
        `Account created! Welcome, @${data.user.displayUsername || data.user.username}.`
      );
      onSuccess(data.user);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] dark:bg-[#09090b] text-[#1d1d1f] dark:text-[#f4f4f5]">
      {/* Minimal Header */}
      <header className="h-16 bg-white/80 dark:bg-[#121215]/80 backdrop-blur-md border-b border-[#e5e5ea] dark:border-[#27272a]">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={32} className="rounded-xl" />
            <span className="text-base sm:text-lg font-semibold tracking-tight">
              {SITE_CONFIG.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => switchView('login')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                view === 'login'
                  ? 'bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f]'
                  : 'text-[#6e6e73] dark:text-[#a1a1aa] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              Enter Key
            </button>
            <button
              type="button"
              onClick={() => switchView('register')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                view === 'register'
                  ? 'bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f]'
                  : 'text-[#6e6e73] dark:text-[#a1a1aa] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-[#141417] rounded-3xl border border-[#e5e5ea] dark:border-[#27272a] shadow-sm p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                {view === 'login' ? 'Unlock Your Vault' : 'Create Your Account'}
              </h1>
              <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#a1a1aa] mt-1">
                {view === 'login'
                  ? 'Enter your private login key to open your personal vault and chats.'
                  : 'Choose a unique public username and a private login key. No email or Google login required.'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-700 dark:text-red-300"
              >
                {error}
              </div>
            )}

            {/* RETURNING USER LOGIN: KEY ONLY */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="relative">
                  <Input
                    label="Private Login Key"
                    type={showKey ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your login key"
                    value={loginKey}
                    onChange={(e) => setLoginKey(e.target.value)}
                    icon={<KeyRound className="w-4 h-4" />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-[34px] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
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
                  <span>Unlock Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="pt-4 border-t border-[#f0f0f2] dark:border-[#27272a] text-center">
                  <p className="text-xs text-[#6e6e73] dark:text-[#a1a1aa]">
                    First time here?{' '}
                    <button
                      type="button"
                      onClick={() => switchView('register')}
                      className="text-[#0071e3] dark:text-[#3898ec] font-semibold hover:underline cursor-pointer"
                    >
                      Create a new account
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* FIRST VISIT REGISTRATION: USERNAME + PRIVATE KEY */}
            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Input
                    label="Public Username"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. ayush_01 (3–24 characters)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                    maxLength={24}
                    required
                  />
                  <p className="mt-1 text-[11px] text-[#86868b] dark:text-[#a1a1aa]">
                    Letters, numbers, underscores (_), and periods (.). Other users can find and message you by this username.
                  </p>
                </div>

                <div>
                  <div className="relative">
                    <Input
                      label="Private Login Key"
                      type={showKey ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="8–128 characters (letters, numbers, or symbols)"
                      value={loginKey}
                      onChange={(e) => setLoginKey(e.target.value)}
                      icon={<KeyRound className="w-4 h-4" />}
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3.5 top-[34px] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
                      aria-label={showKey ? 'Hide login key' : 'Show login key'}
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Key Strength Indicator */}
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 rounded-full transition-colors ${
                            keyStrength.score >= level
                              ? keyStrength.colorClass
                              : 'bg-[#e5e5ea] dark:bg-[#27272a]'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#6e6e73] dark:text-[#a1a1aa]">
                      <span>{keyStrength.label}</span>
                      <span>Recommend 14+ unpredictable characters</span>
                    </div>
                  </div>
                </div>

                {/* Mandatory Unrecoverable Key Warning */}
                <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
                      Your key cannot be recovered. If you forget it, you permanently lose access to this account. There is no password reset or account recovery. Save your key somewhere safe.
                    </p>
                  </div>

                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acknowledgedWarning}
                      onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                      className="mt-0.5 rounded border-amber-400 text-[#0071e3] focus:ring-[#0071e3] accent-[#0071e3]"
                      required
                    />
                    <span className="text-xs text-amber-950 dark:text-amber-100 font-semibold">
                      I have saved my login key and understand it can never be recovered or reset.
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
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="pt-3 border-t border-[#f0f0f2] dark:border-[#27272a] text-center">
                  <p className="text-xs text-[#6e6e73] dark:text-[#a1a1aa]">
                    Already have a login key?{' '}
                    <button
                      type="button"
                      onClick={() => switchView('login')}
                      className="text-[#0071e3] dark:text-[#3898ec] font-semibold hover:underline cursor-pointer"
                    >
                      Enter your key
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* Minimal Feature Summary */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#141417]/70 border border-[#e5e5ea] dark:border-[#27272a]">
              <ShieldCheck className="w-4 h-4 mx-auto text-[#0071e3] mb-1" />
              <p className="text-[11px] font-medium text-[#1d1d1f] dark:text-white">
                Key-Only Access
              </p>
              <p className="text-[10px] text-[#86868b]">No email or Google login</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#141417]/70 border border-[#e5e5ea] dark:border-[#27272a]">
              <Clock className="w-4 h-4 mx-auto text-[#0071e3] mb-1" />
              <p className="text-[11px] font-medium text-[#1d1d1f] dark:text-white">
                Auto-Expiring
              </p>
              <p className="text-[10px] text-[#86868b]">24h default lifetime</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#141417]/70 border border-[#e5e5ea] dark:border-[#27272a]">
              <MessageSquare className="w-4 h-4 mx-auto text-[#0071e3] mb-1" />
              <p className="text-[11px] font-medium text-[#1d1d1f] dark:text-white">
                Private Chat
              </p>
              <p className="text-[10px] text-[#86868b]">1-to-1 file &amp; text sharing</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
