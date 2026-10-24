'use client';

import React from 'react';
import {
  Layers,
  FileText,
  Image as ImageIcon,
  Film,
  Folder,
  Link2,
  Star,
  Trash2,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SITE_CONFIG } from '@/config/site';
import { User } from '@/lib/types';
import { Logo } from '@/components/ui/Logo';

export type NavSection =
  | 'all'
  | 'text'
  | 'image'
  | 'video'
  | 'file'
  | 'link'
  | 'favourites'
  | 'trash'
  | 'chats'
  | 'settings';

interface DesktopSidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  user: User;
  onLogout: () => void;
  itemCounts?: {
    all: number;
    text: number;
    image: number;
    video: number;
    file: number;
    link: number;
    favourites: number;
    trash: number;
  };
}

export function DesktopSidebar({
  currentSection,
  onSelectSection,
  user,
  onLogout,
  itemCounts,
}: DesktopSidebarProps) {
  const vaultItems: {
    id: NavSection;
    label: string;
    icon: React.ReactNode;
    countKey?: keyof NonNullable<typeof itemCounts>;
  }[] = [
    { id: 'all', label: 'My Vault (All)', icon: <Layers className="w-4 h-4" />, countKey: 'all' },
    { id: 'text', label: 'Texts & Notes', icon: <FileText className="w-4 h-4" />, countKey: 'text' },
    { id: 'image', label: 'Photos', icon: <ImageIcon className="w-4 h-4" />, countKey: 'image' },
    { id: 'video', label: 'Videos', icon: <Film className="w-4 h-4" />, countKey: 'video' },
    { id: 'file', label: 'Files & Docs', icon: <Folder className="w-4 h-4" />, countKey: 'file' },
    { id: 'link', label: 'Links', icon: <Link2 className="w-4 h-4" />, countKey: 'link' },
    { id: 'favourites', label: 'Favourites', icon: <Star className="w-4 h-4" />, countKey: 'favourites' },
    { id: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4" />, countKey: 'trash' },
  ];

  const displayUsername = user.displayUsername || user.username;

  return (
    <aside className="hidden md:flex flex-col w-68 h-screen sticky top-0 bg-white/85 dark:bg-[#111b2c]/90 backdrop-blur-xl border-r border-[#dce7f4] dark:border-[#2b3f58] p-4 select-none shrink-0 justify-between shadow-[4px_0_24px_-12px_rgba(27,55,85,0.06)]">
      <div>
        <div className="flex items-center justify-between px-3 py-2.5 mb-2">
          <div className="flex items-center gap-2.5">
            <Logo size={36} className="rounded-xl shadow-xs" withGlow />
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#0f172b] dark:text-white leading-tight">
                {SITE_CONFIG.name}
              </h1>
              <p className="text-[11px] font-medium text-[#607187] dark:text-[#98b0c9]">
                Private Vault &amp; Chat
              </p>
            </div>
          </div>
        </div>

        {/* Primary Mode Switcher: My Vault | Chats | Profile */}
        <div className="grid grid-cols-3 gap-1 p-1 mb-4 rounded-2xl bg-[#edf4fb] dark:bg-[#152338] border border-[#dce7f4] dark:border-[#2b3f58]">
          <button
            type="button"
            onClick={() => onSelectSection('all')}
            className={cn(
              'py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center',
              currentSection !== 'chats' && currentSection !== 'settings'
                ? 'bg-white dark:bg-[#1f3452] text-[#1677df] dark:text-[#78bbff] shadow-2xs'
                : 'text-[#53667a] dark:text-[#98b0c9] hover:text-[#0f172b] dark:hover:text-white'
            )}
          >
            My Vault
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('chats')}
            className={cn(
              'py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1',
              currentSection === 'chats'
                ? 'bg-white dark:bg-[#1f3452] text-[#1677df] dark:text-[#78bbff] shadow-2xs'
                : 'text-[#53667a] dark:text-[#98b0c9] hover:text-[#0f172b] dark:hover:text-white'
            )}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chats</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('settings')}
            className={cn(
              'py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center',
              currentSection === 'settings'
                ? 'bg-white dark:bg-[#1f3452] text-[#1677df] dark:text-[#78bbff] shadow-2xs'
                : 'text-[#53667a] dark:text-[#98b0c9] hover:text-[#0f172b] dark:hover:text-white'
            )}
          >
            Profile
          </button>
        </div>

        <div className="px-3 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#74859d] dark:text-[#8bb5dc]">
            My Vault Filters
          </span>
        </div>

        {/* Vault Categories */}
        <nav className="space-y-1">
          {vaultItems.map((item) => {
            const isActive = currentSection === item.id;
            const count = itemCounts && item.countKey ? itemCounts[item.countKey] : undefined;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer',
                  isActive
                    ? 'bg-gradient-to-r from-[#eaf4ff] to-[#f3f8ff] dark:from-[#1d304a] dark:to-[#192940] text-[#0876cf] dark:text-[#8ac5fb] font-semibold border border-[#cde3fa] dark:border-[#3b5675] shadow-2xs'
                    : 'text-[#536174] dark:text-[#c3cfdd] hover:bg-[#edf5fd]/80 dark:hover:bg-[#19283d] hover:text-[#1677df] dark:hover:text-white border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                      isActive
                        ? 'bg-[#1677df] text-white shadow-2xs'
                        : 'bg-[#f1f6fd] dark:bg-[#19283d] text-[#418fd0] dark:text-[#7eb9ec]'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums',
                      isActive
                        ? 'bg-[#1677df]/15 text-[#0876cf] dark:bg-[#38bdf8]/20 dark:text-[#8ac5fb]'
                        : 'bg-[#f1f5f9] dark:bg-[#19283d] text-[#68788c] dark:text-[#98b0c9]'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 mt-4 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#74859d] dark:text-[#8bb5dc]">
            Direct Messaging
          </span>
        </div>

        <button
          type="button"
          onClick={() => onSelectSection('chats')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer',
            currentSection === 'chats'
              ? 'bg-gradient-to-r from-[#eaf4ff] to-[#f3f8ff] dark:from-[#1d304a] dark:to-[#192940] text-[#0876cf] dark:text-[#8ac5fb] font-semibold border border-[#cde3fa] dark:border-[#3b5675] shadow-2xs'
              : 'text-[#536174] dark:text-[#c3cfdd] hover:bg-[#edf5fd]/80 dark:hover:bg-[#19283d] hover:text-[#1677df] dark:hover:text-white border border-transparent'
          )}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                currentSection === 'chats'
                  ? 'bg-[#1677df] text-white shadow-2xs'
                  : 'bg-[#f1f6fd] dark:bg-[#19283d] text-[#418fd0] dark:text-[#7eb9ec]'
              )}
            >
              <MessageSquare className="w-4 h-4" />
            </span>
            <span>Private Chats</span>
          </div>
        </button>
      </div>

      {/* Bottom User & Profile */}
      <div className="pt-3 border-t border-[#e5edf7] dark:border-[#2b3f58] space-y-2">
        <button
          type="button"
          onClick={() => onSelectSection('settings')}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer',
            currentSection === 'settings'
              ? 'bg-gradient-to-r from-[#eaf4ff] to-[#f3f8ff] dark:from-[#1d304a] dark:to-[#192940] text-[#0876cf] dark:text-[#8ac5fb] font-semibold border border-[#cde3fa] dark:border-[#3b5675]'
              : 'text-[#536174] dark:text-[#c3cfdd] hover:bg-[#edf5fd]/80 dark:hover:bg-[#19283d] hover:text-[#1677df] dark:hover:text-white border border-transparent'
          )}
        >
          <span
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center',
              currentSection === 'settings'
                ? 'bg-[#1677df] text-white'
                : 'bg-[#f1f6fd] dark:bg-[#19283d] text-[#418fd0] dark:text-[#7eb9ec]'
            )}
          >
            <UserIcon className="w-4 h-4" />
          </span>
          <span>Profile &amp; Settings</span>
        </button>

        {/* Identity Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-[#f3f8ff] to-white dark:from-[#19283d] dark:to-[#142033] border border-[#dce7f4] dark:border-[#34465e] shadow-2xs">
          <div
            onClick={() => onSelectSection('settings')}
            className="flex items-center gap-2.5 overflow-hidden cursor-pointer"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayUsername}
                className="w-9 h-9 rounded-xl object-cover border border-[#d3e5f7] dark:border-[#3b5675] shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#eaf4ff] dark:bg-[#223b54] border border-[#d3e5f7] dark:border-[#3b5675] text-[#1677df] dark:text-[#78bbff] font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                {displayUsername.slice(0, 2)}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-[#0f172b] dark:text-white truncate">
                @{displayUsername}
              </p>
              <p className="text-[10px] font-medium text-[#607187] dark:text-[#98b0c9] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#1677df] dark:text-[#60a5fa] shrink-0" />
                Key Protected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-[#74859d] hover:text-[#e11d48] hover:bg-[#fff1f2] dark:hover:bg-[#3e2124] p-2 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
