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
  const navItems: { id: NavSection; label: string; icon: React.ReactNode; countKey?: keyof NonNullable<typeof itemCounts> }[] = [
    { id: 'all', label: 'All Items', icon: <Layers className="w-4 h-4" />, countKey: 'all' },
    { id: 'text', label: 'Texts & Notes', icon: <FileText className="w-4 h-4" />, countKey: 'text' },
    { id: 'image', label: 'Photos', icon: <ImageIcon className="w-4 h-4" />, countKey: 'image' },
    { id: 'video', label: 'Videos', icon: <Film className="w-4 h-4" />, countKey: 'video' },
    { id: 'file', label: 'Files & Docs', icon: <Folder className="w-4 h-4" />, countKey: 'file' },
    { id: 'link', label: 'Links', icon: <Link2 className="w-4 h-4" />, countKey: 'link' },
    { id: 'favourites', label: 'Favourites', icon: <Star className="w-4 h-4" />, countKey: 'favourites' },
    { id: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4" />, countKey: 'trash' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#f5f5f7] dark:bg-[#121214] border-r border-[#e5e5ea] dark:border-[#2c2c2e] p-4 select-none shrink-0 justify-between">
      {/* Top Branding */}
      <div>
        <div className="flex items-center gap-2.5 px-3 py-3 mb-4">
          <Logo size="sm" className="rounded-xl shadow-xs" withGlow />
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#1d1d1f] dark:text-white leading-tight">
              {SITE_CONFIG.name}
            </h1>
            <p className="text-[10px] text-[#86868b] dark:text-[#98989d]">
              Cloud Locker
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentSection === item.id;
            const count = itemCounts && item.countKey ? itemCounts[item.countKey] : undefined;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#e5e5ea] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white font-semibold shadow-xs'
                    : 'text-[#86868b] dark:text-[#98989d] hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-[#1d1d1f] dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(isActive ? 'text-[#0071e3]' : 'text-zinc-500')}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {count !== undefined && count > 0 && (
                  <span className="text-[11px] font-medium text-zinc-400">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User & Settings */}
      <div className="pt-3 border-t border-[#e5e5ea] dark:border-[#2c2c2e] space-y-1">
        <button
          type="button"
          onClick={() => onSelectSection('settings')}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
            currentSection === 'settings'
              ? 'bg-[#e5e5ea] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white font-semibold'
              : 'text-[#86868b] dark:text-[#98989d] hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-[#1d1d1f] dark:hover:text-white'
          )}
        >
          <Settings className="w-4 h-4 text-zinc-500" />
          <span>Settings</span>
        </button>

        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/70 dark:bg-[#1c1c1e] border border-[#e5e5ea]/60 dark:border-[#38383a]/60 mt-2">
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white truncate">
              @{user.username}
            </p>
            <p className="text-[10px] text-[#86868b] dark:text-[#98989d]">
              Personal Vault
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-zinc-400 hover:text-[#ff3b30] p-1 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
