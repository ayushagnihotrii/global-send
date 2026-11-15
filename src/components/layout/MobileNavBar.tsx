'use client';

import { Layers, Plus, Folder, User, MessageSquare } from 'lucide-react';
import { NavSection } from './DesktopSidebar';
import { cn } from '@/lib/utils';

interface MobileNavBarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenComposer: () => void;
}

export function MobileNavBar({
  currentSection,
  onSelectSection,
  onOpenComposer,
}: MobileNavBarProps) {
  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto rounded-full bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border-2 border-neutral-900/10 dark:border-white/10 px-3 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        {/* Vault */}
        <button
          type="button"
          onClick={() => onSelectSection('all')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[50px] py-1 transition-all cursor-pointer rounded-full',
            currentSection === 'all'
              ? 'text-black dark:text-white font-bold'
              : 'text-neutral-400 hover:text-black dark:hover:text-white'
          )}
          aria-label="Vault"
        >
          <Layers className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[9px] uppercase font-mono tracking-wider mt-0.5">Vault</span>
        </button>

        {/* Chats */}
        <button
          type="button"
          onClick={() => onSelectSection('chats')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[50px] py-1 transition-all cursor-pointer rounded-full',
            currentSection === 'chats'
              ? 'text-black dark:text-white font-bold'
              : 'text-neutral-400 hover:text-black dark:hover:text-white'
          )}
          aria-label="Chats"
        >
          <MessageSquare className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[9px] uppercase font-mono tracking-wider mt-0.5">Chats</span>
        </button>

        {/* New Item Button */}
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-[#111111] dark:bg-white text-white dark:text-neutral-950 shadow-md active:scale-90 transition-transform cursor-pointer"
          aria-label="New vault item"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
        </button>

        {/* Files */}
        <button
          type="button"
          onClick={() => onSelectSection('file')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[50px] py-1 transition-all cursor-pointer rounded-full',
            currentSection === 'file'
              ? 'text-black dark:text-white font-bold'
              : 'text-neutral-400 hover:text-black dark:hover:text-white'
          )}
          aria-label="Documents"
        >
          <Folder className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[9px] uppercase font-mono tracking-wider mt-0.5">Files</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => onSelectSection('settings')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[50px] py-1 transition-all cursor-pointer rounded-full',
            currentSection === 'settings'
              ? 'text-black dark:text-white font-bold'
              : 'text-neutral-400 hover:text-black dark:hover:text-white'
          )}
          aria-label="Settings"
        >
          <User className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[9px] uppercase font-mono tracking-wider mt-0.5">Settings</span>
        </button>
      </div>
    </div>
  );
}
