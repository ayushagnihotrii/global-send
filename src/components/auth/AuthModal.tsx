'use client';

import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, KeyRound, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { SITE_CONFIG } from '@/config/site';

interface AuthModalProps {
  onSuccess: (user: any) => void;
}

type AuthView = 'login' | 'register' | 'recovery' | 'show-recovery-code';

export function AuthModal({ onSuccess }: AuthModalProps) {
  const { toast } = useToast();
  const [view, setView] = useState<AuthView>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recovery code created during registration
  const [createdRecoveryCode, setCreatedRecoveryCode] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const resetForm = () => {
    setError(null);
    setPassword('');
    setNewPassword('');
    setRecoveryCodeInput('');
    setInviteCode('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to sign in');
        return;
      }

      toast.success(`Welcome back, ${data.user.username}!`);
      onSuccess(data.user);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          inviteCode: inviteCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      setCreatedRecoveryCode(data.recoveryCode);
      setCreatedUser(data.user);
      setView('show-recovery-code');
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          recoveryCode: recoveryCodeInput,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Recovery failed');
        return;
      }

      toast.success('Password reset! Please sign in with your new password.');
      setView('login');
      setPassword('');
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyRecoveryCode = async () => {
    if (!createdRecoveryCode) return;
    try {
      await navigator.clipboard.writeText(createdRecoveryCode);
      setCopiedCode(true);
      toast.success('Recovery code copied to clipboard');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.info('Please copy the code manually');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#f5f5f7] dark:bg-black">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-xl border border-[#e5e5ea] dark:border-[#38383a] p-6 sm:p-8">
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-white">
            {SITE_CONFIG.name}
          </h1>
          <p className="text-sm text-[#86868b] dark:text-[#98989d] mt-1">
            {SITE_CONFIG.tagline}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* 1. SIGN IN VIEW */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Username"
              type="text"
              autoComplete="username"
              placeholder="e.g. alex24"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />

            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<KeyRound className="w-4 h-4" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-[34px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#86868b] dark:text-[#98989d]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#d1d1d6] text-[#0071e3] focus:ring-[#0071e3]"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView('recovery');
                }}
                className="text-[#0071e3] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Sign In
            </Button>

            <div className="text-center pt-3 border-t border-[#e5e5ea]/60 dark:border-[#38383a]/60">
              <p className="text-xs text-[#86868b] dark:text-[#98989d]">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setView('register');
                  }}
                  className="text-[#0071e3] font-semibold hover:underline"
                >
                  Create one now
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 2. REGISTRATION VIEW */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Choose Username"
              type="text"
              autoComplete="username"
              placeholder="3-30 letters or numbers"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />

            <div>
              <div className="relative">
                <Input
                  label="Create Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<KeyRound className="w-4 h-4" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-[34px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Input
              label="Invite Code (Optional)"
              type="text"
              placeholder="Leave blank unless required"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />

            <p className="text-[11px] text-[#86868b] dark:text-[#98989d]">
              No Google account needed. Your data is stored privately in your personal vault.
            </p>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Create Account
            </Button>

            <div className="text-center pt-3 border-t border-[#e5e5ea]/60 dark:border-[#38383a]/60">
              <p className="text-xs text-[#86868b] dark:text-[#98989d]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setView('login');
                  }}
                  className="text-[#0071e3] font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 3. SHOW RECOVERY CODE AFTER REGISTRATION */}
        {view === 'show-recovery-code' && (
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#34c759]/15 text-[#34c759] mb-1">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
              Save Your Recovery Code
            </h3>

            <p className="text-xs text-[#86868b] dark:text-[#98989d]">
              QuickVault does not use Google accounts or email verification. If you ever forget your password, this recovery code is the <strong>only way</strong> to restore access.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#f2f2f7] dark:bg-[#2c2c2e] border border-[#e5e5ea] dark:border-[#38383a] flex items-center justify-between">
              <span className="font-mono text-sm tracking-wider font-bold text-[#0071e3] select-all">
                {createdRecoveryCode}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={copyRecoveryCode}
                className="h-7 text-xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>

            <Button
              type="button"
              className="w-full mt-3"
              onClick={() => {
                if (createdUser) {
                  toast.success(`Account created! Welcome, ${createdUser.username}.`);
                  onSuccess(createdUser);
                }
              }}
            >
              I&apos;ve Saved My Code — Open Locker
            </Button>
          </div>
        )}

        {/* 4. RECOVERY VIEW */}
        {view === 'recovery' && (
          <form onSubmit={handleRecover} className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                Account Recovery
              </h3>
              <p className="text-xs text-[#86868b] dark:text-[#98989d]">
                Enter your username and the one-time code generated when you registered.
              </p>
            </div>

            <Input
              label="Username"
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Recovery Code"
              type="text"
              placeholder="e.g. QV-ABCD-1234-EFGH"
              value={recoveryCodeInput}
              onChange={(e) => setRecoveryCodeInput(e.target.value)}
              icon={<KeyRound className="w-4 h-4" />}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Reset Password
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView('login');
                }}
                className="text-xs text-[#0071e3] hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
