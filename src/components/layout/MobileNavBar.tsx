'use client';

import { Home, Plus, Folder, Settings } from 'lucide-react';
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-md border-t border-[#e5e5ea] dark:border-[#38383a] px-3 py-2 pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Home */}
        <button
          type="button"
          onClick={() => onSelectSection('all')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors',
            currentSection === 'all'
              ? 'text-[#0071e3] font-semibold'
              : 'text-[#86868b] dark:text-[#98989d]'
          )}
          aria-label="Home / All items"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Texts / Notes */}
        <button
          type="button"
          onClick={() => onSelectSection('text')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors',
            currentSection === 'text'
              ? 'text-[#0071e3] font-semibold'
              : 'text-[#86868b] dark:text-[#98989d]'
          )}
          aria-label="Texts and notes"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider">TXT</span>
          <span className="text-[10px] mt-0.5">Texts</span>
        </button>

        {/* Floating Add Button */}
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-[#0071e3] text-white shadow-md active:scale-95 transition-transform"
          aria-label="Save something new"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Files / Photos */}
        <button
          type="button"
          onClick={() => onSelectSection('file')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors',
            currentSection === 'file'
              ? 'text-[#0071e3] font-semibold'
              : 'text-[#86868b] dark:text-[#98989d]'
          )}
          aria-label="Files and documents"
        >
          <Folder className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Files</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => onSelectSection('settings')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors',
            currentSection === 'settings'
              ? 'text-[#0071e3] font-semibold'
              : 'text-[#86868b] dark:text-[#98989d]'
          )}
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Settings</span>
        </button>
      </div>
    </div>
  );
}
