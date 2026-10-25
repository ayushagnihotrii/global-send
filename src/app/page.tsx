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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f2f2f7] dark:bg-[#000000]">
          <div className="mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-[15px] font-semibold tracking-tight text-[#1c1c1e] dark:text-[#f5f5f7]">
            {SITE_CONFIG.name}
          </p>
          <p className="text-[13px] text-[#8e8e93] dark:text-[#636366] mt-0.5">
            Verifying session…
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
