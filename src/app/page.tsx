'use client';

import React, { useState, useEffect } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { Logo } from '@/components/ui/Logo';
import { User } from '@/lib/types';
import { SITE_CONFIG } from '@/config/site';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setUser(null);
  };

  return (
    <>
      {showSplash && (
        <SplashScreen durationMs={1000} onFinish={() => setShowSplash(false)} />
      )}

      {isCheckingAuth ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#f8fbff] via-[#f5f8fc] to-[#fafbfe] dark:from-[#0c1c30] dark:via-[#0b1422] dark:to-[#0b1422]">
          <div className="mb-3.5 animate-pulse">
            <Logo size="lg" withGlow />
          </div>
          <p className="text-base font-bold tracking-tight text-[#0f172b] dark:text-white">
            {SITE_CONFIG.name}
          </p>
          <p className="text-xs text-[#53667a] dark:text-[#a4b5ce] mt-1">
            Opening your cloud workspace...
          </p>
        </div>
      ) : !user ? (
        <AuthModal onSuccess={(newUser) => setUser(newUser)} />
      ) : (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onUserUpdated={(updatedUser) => setUser(updatedUser)}
        />
      )}
    </>
  );
}

