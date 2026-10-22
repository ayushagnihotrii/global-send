'use client';

import React, { useState, useEffect } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { User } from '@/lib/types';
import { Lock } from 'lucide-react';
import { SITE_CONFIG } from '@/config/site';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f7] dark:bg-black">
        <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center mb-3 animate-pulse">
          <Lock className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
          {SITE_CONFIG.name}
        </p>
        <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
          Opening secure locker...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal onSuccess={(newUser) => setUser(newUser)} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
