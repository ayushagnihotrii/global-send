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
      icon: <Layers className="w-[17px] h-[17px]" />,
      tintClass: 'text-[#007aff] dark:text-[#0a84ff]',
      countKey: 'all',
    },
    {
      id: 'text',
      label: 'Notes & Code',
      icon: <FileText className="w-[17px] h-[17px]" />,
      tintClass: 'text-[#ff9500] dark:text-[#ff9f0a]',
      countKey: 'text',
    },
    {
      id: 'image',
      label: 'Photos',
      icon: <ImageIcon className="w-[17px] h-[17px]" />,
      tintClass: 'text-[#34c759] dark:text-[#30d158]',
      countKey: 'image',
    },
    {
      id: 'video',
      label: 'Videos',
      icon: <Film className="w-[17px] h-[17px]" />,
      tintClass: 'text-[#af52de] dark:text-[#bf5af2]',
      countKey: 'video',
    },
    {
      id: 'file',
      label: 'Documents',
      icon: <Folder className="w-[17px] h-[17px]" />,
      tintClass: 'text-[#007aff] dark:text-[#0a84ff]',
      countKey: 'file',
    },
    {
      id: 'link',
      label: 'Web Links',
      icon: <Link2 className="w-[17px] h-[17px]" />,
      tintClass: 'text-[#5856d6] dark:text-[#5e5ce6]',
      countKey: 'link',
    },
    {
      id: 'favourites',
      label: 'Favourites',
      icon: <Star className="w-[17px] h-[17px]" />,
      tintClass: 'text-[#ffcc00] dark:text-[#ffd60a]',
      countKey: 'favourites',
    },
    {
      id: 'trash',
      label: 'Recently Deleted',
      icon: <Trash2 className="w-[17px] h-[17px]" />,
      tintClass: 'text-[#8e8e93]',
      countKey: 'trash',
    },
  ];

  const displayUsername = user.displayUsername || user.username;

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 ios-sidebar-material border-r border-black/[0.08] dark:border-white/[0.1] px-3 py-4 select-none shrink-0 justify-between">
      <div>
        {/* Brand Title */}
        <div className="flex items-center gap-2.5 px-2.5 pb-3.5">
          <Logo size={30} />
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-[-0.015em] text-[#1c1c1e] dark:text-[#f5f5f7] leading-tight truncate">
              {SITE_CONFIG.name}
            </h1>
            <p className="text-[11px] text-[#8e8e93] leading-tight mt-0.5">
              iCloud-grade Vault
            </p>
          </div>
        </div>

        {/* iOS Segmented Mode Switcher */}
        <div className="grid grid-cols-3 p-[2px] mb-5 rounded-[9px] bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24]">
          <button
            type="button"
            onClick={() => onSelectSection('all')}
            className={cn(
              'py-1 px-2 rounded-[7px] text-[12px] transition-all cursor-pointer text-center',
              currentSection !== 'chats' && currentSection !== 'settings'
                ? 'bg-white dark:bg-[#636366] text-[#1c1c1e] dark:text-white ios-segmented-thumb font-semibold'
                : 'text-[#6c6c70] dark:text-[#ebebf5]/70 hover:text-[#1c1c1e] dark:hover:text-white font-medium'
            )}
          >
            Vault
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('chats')}
            className={cn(
              'py-1 px-2 rounded-[7px] text-[12px] transition-all cursor-pointer text-center',
              currentSection === 'chats'
                ? 'bg-white dark:bg-[#636366] text-[#1c1c1e] dark:text-white ios-segmented-thumb font-semibold'
                : 'text-[#6c6c70] dark:text-[#ebebf5]/70 hover:text-[#1c1c1e] dark:hover:text-white font-medium'
            )}
          >
            Chats
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('settings')}
            className={cn(
              'py-1 px-2 rounded-[7px] text-[12px] transition-all cursor-pointer text-center',
              currentSection === 'settings'
                ? 'bg-white dark:bg-[#636366] text-[#1c1c1e] dark:text-white ios-segmented-thumb font-semibold'
                : 'text-[#6c6c70] dark:text-[#ebebf5]/70 hover:text-[#1c1c1e] dark:hover:text-white font-medium'
            )}
          >
            Settings
          </button>
        </div>

        {/* macOS / iPadOS Source List Section Header */}
        <div className="px-2.5 mb-1">
          <span className="text-[11px] font-semibold text-[#8e8e93] tracking-[-0.005em]">
            Library
          </span>
        </div>

        {/* Vault Categories */}
        <nav className="space-y-0.5">
          {vaultItems.map((item) => {
            const isActive = currentSection === item.id;
            const count = itemCounts && item.countKey ? itemCounts[item.countKey] : undefined;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 h-9 rounded-[9px] text-[13.5px] transition-colors duration-100 cursor-pointer',
                  isActive
                    ? 'bg-[#007aff] dark:bg-[#0a84ff] text-white font-medium'
                    : 'text-[#1c1c1e] dark:text-[#ebebf5] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] font-normal'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn('shrink-0', isActive ? 'text-white' : item.tintClass)}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      'text-[12px] tabular-nums ml-2',
                      isActive
                        ? 'text-white/90 font-medium'
                        : 'text-[#8e8e93]'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Direct Messages Section */}
        <div className="px-2.5 mt-5 mb-1">
          <span className="text-[11px] font-semibold text-[#8e8e93] tracking-[-0.005em]">
            Messages
          </span>
        </div>

        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => onSelectSection('chats')}
            className={cn(
              'w-full flex items-center justify-between px-2.5 h-9 rounded-[9px] text-[13.5px] transition-colors duration-100 cursor-pointer',
              currentSection === 'chats'
                ? 'bg-[#007aff] dark:bg-[#0a84ff] text-white font-medium'
                : 'text-[#1c1c1e] dark:text-[#ebebf5] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
            )}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare
                className={cn(
                  'w-[17px] h-[17px]',
                  currentSection === 'chats'
                    ? 'text-white'
                    : 'text-[#34c759] dark:text-[#30d158]'
                )}
              />
              <span>Private Chats</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('settings')}
            className={cn(
              'w-full flex items-center justify-between px-2.5 h-9 rounded-[9px] text-[13.5px] transition-colors duration-100 cursor-pointer',
              currentSection === 'settings'
                ? 'bg-[#007aff] dark:bg-[#0a84ff] text-white font-medium'
                : 'text-[#1c1c1e] dark:text-[#ebebf5] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
            )}
          >
            <div className="flex items-center gap-2.5">
              <Settings
                className={cn(
                  'w-[17px] h-[17px]',
                  currentSection === 'settings' ? 'text-white' : 'text-[#8e8e93]'
                )}
              />
              <span>Settings</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Apple Account Row */}
      <div className="pt-3 border-t border-black/[0.07] dark:border-white/[0.09]">
        <div className="flex items-center justify-between p-2 rounded-[12px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
          <div
            onClick={() => onSelectSection('settings')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={displayUsername}
                className="w-8 h-8 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.12] shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#007aff]/12 dark:bg-[#0a84ff]/20 text-[#007aff] dark:text-[#409cff] font-semibold text-[12px] flex items-center justify-center shrink-0 uppercase">
                {displayUsername.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate leading-tight">
                @{displayUsername}
              </p>
              <p className="text-[11px] text-[#8e8e93] truncate leading-tight mt-0.5">
                Account &amp; Storage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-[#8e8e93] hover:text-[#ff3b30] dark:hover:text-[#ff453a] p-1.5 rounded-[8px] transition-colors cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
