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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 ios-material border-t border-black/[0.08] dark:border-white/[0.1] px-2 pt-1.5 pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Vault */}
        <button
          type="button"
          onClick={() => onSelectSection('all')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors cursor-pointer',
            currentSection === 'all'
              ? 'text-[#007aff] dark:text-[#0a84ff]'
              : 'text-[#8e8e93]'
          )}
          aria-label="Vault"
        >
          <Layers className="w-[21px] h-[21px]" />
          <span className="text-[10px] font-medium mt-0.5">Vault</span>
        </button>

        {/* Chats */}
        <button
          type="button"
          onClick={() => onSelectSection('chats')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors cursor-pointer',
            currentSection === 'chats'
              ? 'text-[#007aff] dark:text-[#0a84ff]'
              : 'text-[#8e8e93]'
          )}
          aria-label="Chats"
        >
          <MessageSquare className="w-[21px] h-[21px]" />
          <span className="text-[10px] font-medium mt-0.5">Chats</span>
        </button>

        {/* New Item Button */}
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#007aff] dark:bg-[#0a84ff] text-white shadow-[0_2px_8px_rgba(0,122,255,0.35)] active:scale-95 transition-transform cursor-pointer"
          aria-label="New vault item"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Files */}
        <button
          type="button"
          onClick={() => onSelectSection('file')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors cursor-pointer',
            currentSection === 'file'
              ? 'text-[#007aff] dark:text-[#0a84ff]'
              : 'text-[#8e8e93]'
          )}
          aria-label="Documents"
        >
          <Folder className="w-[21px] h-[21px]" />
          <span className="text-[10px] font-medium mt-0.5">Files</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => onSelectSection('settings')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors cursor-pointer',
            currentSection === 'settings'
              ? 'text-[#007aff] dark:text-[#0a84ff]'
              : 'text-[#8e8e93]'
          )}
          aria-label="Settings"
        >
          <User className="w-[21px] h-[21px]" />
          <span className="text-[10px] font-medium mt-0.5">Settings</span>
        </button>
      </div>
    </div>
  );
}
