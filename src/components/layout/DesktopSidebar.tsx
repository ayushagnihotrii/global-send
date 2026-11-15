'use client';

import React from 'react';
import Image from 'next/image';
import {
  Layers,
  FileText,
  Image as ImageIcon,
  Film,
  Folder,
  Link2,
  Star,
  Trash2,
  Settings,
  LogOut,
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
    tintClass: string;
    countKey?: keyof NonNullable<typeof itemCounts>;
  }[] = [
    {
      id: 'all',
      label: 'All Items',
      icon: <Layers className="w-4 h-4 stroke-[2.2]" />,
      tintClass: 'text-[#111111] dark:text-white',
      countKey: 'all',
    },
    {
      id: 'text',
      label: 'Notes & Code',
      icon: <FileText className="w-4 h-4 stroke-[2.2]" />,
      tintClass: 'text-[#FF8559]',
      countKey: 'text',
    },
    {
      id: 'image',
      label: 'Photos',
      icon: <ImageIcon className="w-4 h-4 stroke-[2.2]" />,
      tintClass: 'text-[#38BDF8]',
      countKey: 'image',
    },
    {
      id: 'video',
      label: 'Videos',
      icon: <Film className="w-4 h-4 stroke-[2.2]" />,
      tintClass: 'text-[#C17BF3]',
      countKey: 'video',
    },
    {
      id: 'file',
      label: 'Documents',
      icon: <Folder className="w-4 h-4 stroke-[2.2]" />,
      tintClass: 'text-[#A3E635]',
      countKey: 'file',
    },
    {
      id: 'link',
      label: 'Web Links',
      icon: <Link2 className="w-4 h-4 stroke-[2.2]" />,
      tintClass: 'text-[#FBBF24]',
      countKey: 'link',
    },
    {
      id: 'favourites',
      label: 'Favourites',
      icon: <Star className="w-4 h-4 stroke-[2.2]" />,
      tintClass: 'text-[#F59E0B]',
      countKey: 'favourites',
    },
    {
      id: 'trash',
      label: 'Recently Deleted',
      icon: <Trash2 className="w-4 h-4 stroke-[2.2]" />,
      tintClass: 'text-neutral-400',
      countKey: 'trash',
    },
  ];

  const displayUsername = user.displayUsername || user.username;

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#FBFBFC] dark:bg-[#121215] border-r-2 border-neutral-900/10 dark:border-white/10 px-4 py-5 select-none shrink-0 justify-between">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-1">
          <Logo size={34} className="shadow-xs" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-headline text-[17px] font-extrabold tracking-tight text-[#111111] dark:text-white uppercase leading-none truncate">
                {SITE_CONFIG.name}
              </h1>
              <span className="bg-[#CDFF5D] text-black font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                VAULT
              </span>
            </div>
            <p className="font-eyebrow text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              encrypted peer relay
            </p>
          </div>
        </div>

        {/* Neo-Editorial Capsule Segment Switcher */}
        <div className="grid grid-cols-3 p-1 rounded-full bg-neutral-200/60 dark:bg-neutral-800/80 border border-neutral-300/40 dark:border-white/10">
          <button
            type="button"
            onClick={() => onSelectSection('all')}
            className={cn(
              'py-1.5 px-2 rounded-full text-xs transition-all cursor-pointer text-center font-bold',
              currentSection !== 'chats' && currentSection !== 'settings'
                ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            )}
          >
            Vault
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('chats')}
            className={cn(
              'py-1.5 px-2 rounded-full text-xs transition-all cursor-pointer text-center font-bold',
              currentSection === 'chats'
                ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            )}
          >
            Chats
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('settings')}
            className={cn(
              'py-1.5 px-2 rounded-full text-xs transition-all cursor-pointer text-center font-bold',
              currentSection === 'settings'
                ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            )}
          >
            Settings
          </button>
        </div>

        {/* Library Section Header */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              LIBRARY
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
                    'w-full flex items-center justify-between px-3 h-10 rounded-full text-[13px] transition-all cursor-pointer',
                    isActive
                      ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 font-bold shadow-xs'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-white/10 font-medium'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('shrink-0', isActive ? 'text-inherit' : item.tintClass)}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-mono font-black px-2 py-0.5 rounded-full ml-2 tabular-nums',
                        isActive
                          ? 'bg-[#CDFF5D] text-black dark:bg-[#CDFF5D] dark:text-black'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              MESSAGES &amp; PREFS
            </span>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectSection('chats')}
              className={cn(
                'w-full flex items-center justify-between px-3 h-10 rounded-full text-[13px] transition-all cursor-pointer',
                currentSection === 'chats'
                  ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-white/10 font-medium'
              )}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare
                  className={cn(
                    'w-4 h-4 stroke-[2.2]',
                    currentSection === 'chats' ? 'text-inherit' : 'text-[#38BDF8]'
                  )}
                />
                <span>Private Chats</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectSection('settings')}
              className={cn(
                'w-full flex items-center justify-between px-3 h-10 rounded-full text-[13px] transition-all cursor-pointer',
                currentSection === 'settings'
                  ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-white/10 font-medium'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Settings
                  className={cn(
                    'w-4 h-4 stroke-[2.2]',
                    currentSection === 'settings' ? 'text-inherit' : 'text-neutral-400'
                  )}
                />
                <span>Settings</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom User Card */}
      <div className="pt-3 border-t-2 border-neutral-900/10 dark:border-white/10">
        <div className="flex items-center justify-between p-2 rounded-[20px] bg-white dark:bg-[#18181B] border border-neutral-900/10 dark:border-white/10 shadow-xs">
          <div
            onClick={() => onSelectSection('settings')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={displayUsername}
                className="w-8 h-8 rounded-full object-cover border border-neutral-900/10 dark:border-white/20 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#111111] dark:bg-white text-white dark:text-neutral-950 font-black text-xs flex items-center justify-center shrink-0 uppercase">
                {displayUsername.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111111] dark:text-white truncate leading-tight">
                @{displayUsername}
              </p>
              <p className="font-mono text-[10px] text-neutral-400 truncate leading-tight mt-0.5">
                Account &amp; Storage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-neutral-400 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-full transition-colors cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
