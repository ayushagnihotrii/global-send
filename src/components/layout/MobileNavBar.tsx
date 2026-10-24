'use client';

import { Home, Plus, Folder, User, MessageSquare } from 'lucide-react';
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#111b2c]/95 backdrop-blur-xl border-t border-[#dce7f4] dark:border-[#2b3f58] px-3 py-2 pb-safe shadow-[0_-4px_22px_rgba(27,55,85,0.06)]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* My Vault */}
        <button
          type="button"
          onClick={() => onSelectSection('all')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-colors cursor-pointer',
            currentSection === 'all'
              ? 'text-[#1677df] dark:text-[#78bbff] font-semibold'
              : 'text-[#607187] dark:text-[#98b0c9]'
          )}
          aria-label="My Vault"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Vault</span>
        </button>

        {/* Chats */}
        <button
          type="button"
          onClick={() => onSelectSection('chats')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-colors cursor-pointer',
            currentSection === 'chats'
              ? 'text-[#1677df] dark:text-[#78bbff] font-semibold'
              : 'text-[#607187] dark:text-[#98b0c9]'
          )}
          aria-label="Private Chats"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Chats</span>
        </button>

        {/* Floating Add Button */}
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex items-center justify-center w-11 h-11 rounded-2xl qs-primary-btn text-white active:scale-95 transition-transform cursor-pointer"
          aria-label="Save something new"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Files / Photos */}
        <button
          type="button"
          onClick={() => onSelectSection('file')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-colors cursor-pointer',
            currentSection === 'file'
              ? 'text-[#1677df] dark:text-[#78bbff] font-semibold'
              : 'text-[#607187] dark:text-[#98b0c9]'
          )}
          aria-label="Files and documents"
        >
          <Folder className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Files</span>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => onSelectSection('settings')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-colors cursor-pointer',
            currentSection === 'settings'
              ? 'text-[#1677df] dark:text-[#78bbff] font-semibold'
              : 'text-[#607187] dark:text-[#98b0c9]'
          )}
          aria-label="Profile & Settings"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Profile</span>
        </button>
      </div>
    </div>
  );
}
