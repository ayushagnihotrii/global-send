'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  RefreshCw,
  FolderOpen,
  Lock,
  ArrowUpDown,
  Tag,
} from 'lucide-react';
import { User, Item, DateGroupedItems } from '@/lib/types';
import { DesktopSidebar, NavSection } from '@/components/layout/DesktopSidebar';
import { MobileNavBar } from '@/components/layout/MobileNavBar';
import { QuickComposer } from '@/components/composer/QuickComposer';
import { ItemCard } from '@/components/items/ItemCard';
import { TextDetailModal } from '@/components/items/TextDetailModal';
import { MediaViewerModal } from '@/components/items/MediaViewerModal';
import { SettingsView } from '@/components/settings/SettingsView';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { groupItemsByDate } from '@/lib/utils';
import { SITE_CONFIG } from '@/config/site';
import { Logo } from '@/components/ui/Logo';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState<NavSection>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'title_asc'>('created_desc');

  // Selected item modals
  const [selectedTextItem, setSelectedTextItem] = useState<Item | null>(null);
  const [selectedMediaItem, setSelectedMediaItem] = useState<Item | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut Ctrl/Cmd + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Google Drive OAuth callback redirect notifications
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const gdrive = url.searchParams.get('gdrive');
    const gdriveError = url.searchParams.get('gdrive_error');
    if (gdrive === 'connected') {
      toast.success('Google Drive successfully connected!');
      url.searchParams.delete('gdrive');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } else if (gdriveError) {
      toast.error(`Google Drive connection error: ${gdriveError}`);
      url.searchParams.delete('gdrive_error');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  }, [toast]);

  // Fetch items based on active section and search
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (currentSection === 'trash') {
        params.set('inTrash', 'true');
      } else if (currentSection === 'favourites') {
        params.set('favourite', 'true');
      } else if (currentSection !== 'all' && currentSection !== 'settings') {
        params.set('type', currentSection);
      }

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      if (selectedTag) {
        params.set('tag', selectedTag);
      }

      params.set('sortBy', sortBy);

      const res = await fetch(`/api/items?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.items) {
        setItems(data.items);

        // Collect unique tags
        const allTags = new Set<string>();
        data.items.forEach((item: Item) => {
          item.tags?.forEach((t) => allTags.add(t));
        });
        setAvailableTags(Array.from(allTags));
      } else {
        toast.error('Failed to load items');
      }
    } catch {
      toast.error('Network error loading your locker');
    } finally {
      setIsLoading(false);
    }
  }, [currentSection, debouncedSearch, selectedTag, sortBy, toast]);

  useEffect(() => {
    if (currentSection !== 'settings') {
      fetchItems();
    }
  }, [fetchItems, currentSection]);

  // Item counts for sidebar badges
  const itemCounts = useMemo(() => {
    const counts = {
      all: 0,
      text: 0,
      image: 0,
      video: 0,
      file: 0,
      link: 0,
      favourites: 0,
      trash: 0,
    };
    items.forEach((item) => {
      if (item.deletedAt) {
        counts.trash += 1;
      } else {
        counts.all += 1;
        if (item.type === 'text') counts.text += 1;
        if (item.type === 'image') counts.image += 1;
        if (item.type === 'video') counts.video += 1;
        if (item.type === 'file') counts.file += 1;
        if (item.type === 'link') counts.link += 1;
        if (item.isFavourite) counts.favourites += 1;
      }
    });
    return counts;
  }, [items]);

  // Handling new item creation
  const handleItemCreated = (newItem: Item) => {
    setItems((prev) => [newItem, ...prev]);
  };

  // Handling open detail
  const handleOpenDetail = (item: Item) => {
    if (item.type === 'text') {
      setSelectedTextItem(item);
    } else {
      setSelectedMediaItem(item);
    }
  };

  // Toggle favourite
  const handleToggleFavourite = async (item: Item) => {
    try {
      const res = await fetch(`/api/items/${item.id}/favourite`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const nextState = data.isFavourite;
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isFavourite: nextState } : i))
        );
        toast.success(nextState ? 'Added to favourites' : 'Removed from favourites');
      }
    } catch {
      toast.error('Could not update favourite');
    }
  };

  // Delete item (soft delete or permanent delete)
  const handleDeleteItem = async (item: Item, permanent = false) => {
    if (permanent) {
      if (!window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) {
        return;
      }
    }

    try {
      const url = `/api/items/${item.id}${permanent ? '?permanent=true' : ''}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        toast.success(data.message || (permanent ? 'Permanently deleted' : 'Moved to trash'));
      } else {
        toast.error('Failed to delete item');
      }
    } catch {
      toast.error('Could not delete item');
    }
  };

  // Restore item from trash
  const handleRestoreItem = async (item: Item) => {
    try {
      const res = await fetch(`/api/items/${item.id}/restore`, { method: 'POST' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        toast.success('Restored to locker');
      }
    } catch {
      toast.error('Could not restore item');
    }
  };

  // Group items by relative date
  const dateGroups: DateGroupedItems[] = useMemo(() => {
    return groupItemsByDate(items);
  }, [items]);

  // Section titles
  const getSectionTitle = () => {
    switch (currentSection) {
      case 'text':
        return 'Texts & Notes';
      case 'image':
        return 'Photos & Screenshots';
      case 'video':
        return 'Videos';
      case 'file':
        return 'Files & Documents';
      case 'link':
        return 'Website Links';
      case 'favourites':
        return 'Favourites';
      case 'trash':
        return 'Trash';
      default:
        return 'Your Locker';
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-black text-[#1d1d1f] dark:text-white">
      {/* 1. DESKTOP SIDEBAR */}
      <DesktopSidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        user={user}
        onLogout={onLogout}
        itemCounts={itemCounts}
      />

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:p-10 pb-24 md:pb-12 max-w-6xl mx-auto w-full">
        {/* Mobile Header Bar */}
        <div className="flex md:hidden items-center justify-between pb-4 mb-4 border-b border-[#e5e5ea] dark:border-[#2c2c2e]">
          <div className="flex items-center gap-2.5">
            <Logo size={28} className="rounded-lg shadow-xs" withGlow />
            <span className="font-bold text-base tracking-tight">{SITE_CONFIG.name}</span>
          </div>

          <span className="text-xs text-[#86868b] dark:text-[#98989d]">
            @{user.username}
          </span>
        </div>

        {/* SETTINGS VIEW */}
        {currentSection === 'settings' ? (
          <SettingsView user={user} onLogout={onLogout} />
        ) : (
          <>
            {/* WORKSPACE TOP HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-white">
                  {getSectionTitle()}
                </h2>
                <p className="text-xs sm:text-sm text-[#86868b] dark:text-[#98989d] mt-1">
                  {currentSection === 'trash'
                    ? 'Items here can be restored or permanently removed.'
                    : "Everything you've saved, in one place."}
                </p>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchItems}
                  className="h-9 px-2 text-xs text-zinc-500"
                  title="Refresh items"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1c1c1e] border border-[#e5e5ea] dark:border-[#38383a] text-xs font-medium text-[#1d1d1f] dark:text-white shadow-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="created_desc">Newest First</option>
                    <option value="created_asc">Oldest First</option>
                    <option value="title_asc">Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEARCH BAR */}
            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-input"
                type="text"
                placeholder="Search titles, text questions, links, code, and tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white placeholder:text-zinc-400 rounded-2xl pl-11 pr-24 py-3 text-sm border border-[#e5e5ea] dark:border-[#38383a] shadow-xs focus:outline-none focus:border-[#0071e3] transition-all"
              />

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 items-center gap-1 text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-[#f2f2f7] dark:bg-[#2c2c2e]">
                  <span>⌘K</span>
                </div>
              )}
            </div>

            {/* TAG FILTER CHIPS */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none text-xs">
                <span className="text-[#86868b] text-[11px] mr-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-3 py-1 rounded-full font-medium transition-colors ${
                    selectedTag === null
                      ? 'bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1c1c1e] text-[#86868b] border border-[#e5e5ea] dark:border-[#38383a]'
                  }`}
                >
                  All
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`px-3 py-1 rounded-full font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-[#0071e3] text-white'
                        : 'bg-white dark:bg-[#1c1c1e] text-[#86868b] border border-[#e5e5ea] dark:border-[#38383a]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* TRASH WARNING BANNER */}
            {currentSection === 'trash' && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                <span>Items in Trash are safe until permanently deleted or emptied.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (window.confirm('Permanently delete all items in trash?')) {
                      await fetch('/api/items/trash/empty', { method: 'POST' });
                      toast.success('Trash emptied');
                      fetchItems();
                    }
                  }}
                  className="h-7 text-xs text-[#ff3b30]"
                >
                  Empty Trash
                </Button>
              </div>
            )}

            {/* QUICK COMPOSER (Visible in normal sections) */}
            {currentSection !== 'trash' && (
              <QuickComposer onItemCreated={handleItemCreated} />
            )}

            {/* ITEMS LIST (Grouped by Date) */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-36 rounded-2xl bg-white/60 dark:bg-[#1c1c1e]/60 border border-[#e5e5ea]/50 dark:border-[#38383a]/50 animate-pulse p-4"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              /* EMPTY STATE */
              <div className="text-center py-16 px-4 bg-white/50 dark:bg-[#1c1c1e]/50 rounded-3xl border border-dashed border-[#d1d1d6] dark:border-[#38383a]">
                <div className="w-14 h-14 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center mx-auto mb-3">
                  <FolderOpen className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                  {searchQuery ? 'No matches found' : 'Your locker is empty'}
                </h3>
                <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No items matched "${searchQuery}". Try clearing your search filter.`
                    : 'Save your first question, exam prompt, code snippet, photo, or link above.'}
                </p>
                {searchQuery && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="mt-4 text-xs"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              /* TIMELINE DATE GROUPS */
              <div className="space-y-8">
                {dateGroups.map((group) => (
                  <section key={group.key} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#86868b] dark:text-[#98989d] ml-1">
                      {group.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.items.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onOpenDetail={handleOpenDetail}
                          onToggleFavourite={handleToggleFavourite}
                          onDelete={handleDeleteItem}
                          onRestore={handleRestoreItem}
                          inTrash={currentSection === 'trash'}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* 3. MOBILE BOTTOM NAVBAR */}
      <MobileNavBar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        onOpenComposer={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          toast.info('Composer ready at the top');
        }}
      />

      {/* 4. TEXT DETAIL MODAL (Apple Notes Reading View) */}
      <TextDetailModal
        item={selectedTextItem}
        isOpen={Boolean(selectedTextItem)}
        onClose={() => setSelectedTextItem(null)}
        onUpdate={(updated) => {
          setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          setSelectedTextItem(updated);
        }}
        onDelete={(item) => handleDeleteItem(item, false)}
        onToggleFavourite={handleToggleFavourite}
      />

      {/* 5. MEDIA VIEWER MODAL (Photos, Videos, Files) */}
      <MediaViewerModal
        item={selectedMediaItem}
        isOpen={Boolean(selectedMediaItem)}
        onClose={() => setSelectedMediaItem(null)}
        onDelete={(item) => handleDeleteItem(item, false)}
        onToggleFavourite={handleToggleFavourite}
      />
    </div>
  );
}
