'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  RefreshCw,
  FolderOpen,
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
import { ChatView } from '@/components/chats/ChatView';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { groupItemsByDate } from '@/lib/utils';
import { SITE_CONFIG } from '@/config/site';
import { Logo } from '@/components/ui/Logo';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdated?: (user: User) => void;
}

export function Dashboard({ user, onLogout, onUserUpdated }: DashboardProps) {
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

  // Item queued to be shared in chat
  const [pendingShareItem, setPendingShareItem] = useState<Item | null>(null);

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
      } else if (
        currentSection !== 'all' &&
        currentSection !== 'settings' &&
        currentSection !== 'chats'
      ) {
        params.set('type', currentSection);
      }

      if (debouncedSearch.trim() && currentSection !== 'chats') {
        params.set('search', debouncedSearch.trim());
      }

      if (selectedTag && currentSection !== 'chats') {
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
      toast.error('Network error loading your vault');
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

  // Share item in chat
  const handleShareInChat = (item: Item) => {
    setPendingShareItem(item);
    setCurrentSection('chats');
    toast.info(`Select a chat to share "${item.title}"`);
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
        toast.success('Restored to vault');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Could not restore item');
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
        return 'My Vault';
    }
  };

  const displayUsername = user.displayUsername || user.username;

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-[#f8fbff] via-[#f5f8fc] to-[#fafbfe] dark:from-[#0c1c30] dark:via-[#0b1422] dark:to-[#0b1422] text-[#0f172b] dark:text-[#e9f1fc] relative">
      {/* Subtle Ambient Top Glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] overflow-hidden z-0">
        <div className="absolute -top-36 left-1/3 w-[520px] h-[340px] rounded-full bg-radial from-[#cceaff]/45 to-transparent blur-3xl dark:from-[#1d4ed8]/15" />
        <div className="absolute -top-24 right-10 w-[400px] h-[300px] rounded-full bg-radial from-[#d8d4ff]/35 to-transparent blur-3xl dark:from-[#4f46e5]/10" />
      </div>

      {/* 1. DESKTOP SIDEBAR */}
      <DesktopSidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        user={user}
        onLogout={onLogout}
        itemCounts={itemCounts}
      />

      {/* 2. MAIN WORKSPACE */}
      <main className="relative z-10 flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:p-10 pb-24 md:pb-12 max-w-6xl mx-auto w-full">
        {/* Mobile Header Bar */}
        <div className="flex md:hidden items-center justify-between pb-4 mb-5 border-b border-[#dce7f4] dark:border-[#2b3f58]">
          <div className="flex items-center gap-2.5">
            <Logo size={30} className="rounded-xl shadow-xs" withGlow />
            <span className="font-bold text-base tracking-tight text-[#0f172b] dark:text-white">
              {SITE_CONFIG.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setCurrentSection('settings')}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#eaf4ff] dark:bg-[#1d304a] text-[#1677df] dark:text-[#78bbff] border border-[#dbe9fa] dark:border-[#3b5675] cursor-pointer"
          >
            {user.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={displayUsername}
                className="w-4 h-4 rounded-full object-cover"
              />
            )}
            <span>@{displayUsername}</span>
          </button>
        </div>

        {/* SETTINGS / PROFILE VIEW */}
        {currentSection === 'settings' ? (
          <SettingsView user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />
        ) : currentSection === 'chats' ? (
          /* PRIVATE CHATS VIEW */
          <ChatView
            currentUser={user}
            vaultItems={items.filter((i) => !i.deletedAt)}
            pendingShareItem={pendingShareItem}
            onClearPendingShareItem={() => setPendingShareItem(null)}
          />
        ) : (
          <>
            {/* WORKSPACE TOP HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#5481aa] dark:text-[#8bb5dc] mb-1">
                  TEMPORARY CLOUD VAULT
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f172b] dark:text-white">
                  {getSectionTitle()}
                </h2>
                <p className="text-xs sm:text-sm text-[#53667a] dark:text-[#a4b5ce] mt-1">
                  {currentSection === 'trash'
                    ? 'Items here can be restored before expiration or permanently removed.'
                    : 'Save temporary files, notes, and links with automatic expiration or share them in chat.'}
                </p>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchItems}
                  className="h-9 px-2.5 text-xs"
                  title="Refresh items"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>

                <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#19263a] border border-[#dce7f4] dark:border-[#34465e] text-xs font-semibold text-[#263a50] dark:text-[#e9f1fc] shadow-2xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#418fd0] dark:text-[#7eb9ec]" />
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
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#649dd3] pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-input"
                type="text"
                placeholder="Search titles, text questions, links, code, and tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#19263a] text-[#0f172b] dark:text-white placeholder:text-[#8292a7] rounded-2xl pl-11 pr-24 py-3.5 text-sm border border-[#dbe6f2] dark:border-[#34465e] shadow-[0_8px_24px_-16px_rgba(30,95,168,0.18)] focus:outline-none focus:border-[#1677df] dark:focus:border-[#60a5fa] focus:ring-3 focus:ring-[#1677df]/12 transition-all"
              />

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#74859d] hover:text-[#0f172b] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 items-center gap-1 text-[11px] font-mono font-semibold text-[#5481aa] dark:text-[#8bb5dc] px-2 py-0.5 rounded-lg bg-[#f1f6fd] dark:bg-[#203149] border border-[#dce8f6] dark:border-[#3b5675]">
                  <span>⌘K</span>
                </div>
              )}
            </div>

            {/* TAG FILTER CHIPS */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none text-xs">
                <span className="text-[#65758b] dark:text-[#98b0c9] text-[11px] font-semibold mr-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#418fd0]" /> Tags:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                    selectedTag === null
                      ? 'bg-[#1677df] text-white shadow-xs'
                      : 'bg-white dark:bg-[#19263a] text-[#53667a] dark:text-[#a4b5ce] border border-[#dce7f4] dark:border-[#34465e] hover:border-[#1677df]'
                  }`}
                >
                  All
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                      selectedTag === tag
                        ? 'bg-[#1677df] text-white shadow-xs'
                        : 'bg-white dark:bg-[#19263a] text-[#53667a] dark:text-[#a4b5ce] border border-[#dce7f4] dark:border-[#34465e] hover:border-[#1677df]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* TRASH WARNING BANNER */}
            {currentSection === 'trash' && (
              <div className="mb-6 p-4 rounded-2xl bg-[#fff8e9] dark:bg-[#342c1d] border border-[#efcc8a] dark:border-[#6d5630] flex items-center justify-between text-xs font-medium text-[#805719] dark:text-[#e7c68d]">
                <span>Items in Trash still expire on schedule or can be permanently deleted now.</span>
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
                  className="h-7 text-xs text-[#e11d48]"
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
                    className="h-36 rounded-[20px] bg-white/75 dark:bg-[#19263a]/75 border border-[#dce7f4] dark:border-[#34465e] animate-pulse p-4"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              /* EMPTY STATE */
              <div className="text-center py-16 px-4 bg-[#f8fbff] dark:bg-[#17263b]/70 rounded-[24px] border border-dashed border-[#bfd4ec] dark:border-[#3b5675]">
                <div className="w-14 h-14 rounded-2xl bg-[#eaf4ff] dark:bg-[#203954] border border-[#dbe9fa] dark:border-[#344b65] text-[#1677df] dark:text-[#60a5fa] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                  <FolderOpen className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#0f172b] dark:text-white">
                  {searchQuery ? 'No matches found' : 'Your personal vault is empty'}
                </h3>
                <p className="text-xs text-[#65758b] dark:text-[#a4b5ce] mt-1 max-w-sm mx-auto leading-relaxed">
                  {searchQuery
                    ? `No items matched "${searchQuery}". Try clearing your search filter.`
                    : 'Save your first temporary note, code snippet, photo, video, or document above.'}
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
                  <section key={group.key} className="space-y-3.5">
                    <div className="flex items-center gap-2 ml-1">
                      <span className="w-1.5 h-4 rounded-full bg-[#1677df]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#5481aa] dark:text-[#8bb5dc]">
                        {group.title}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.items.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onOpenDetail={handleOpenDetail}
                          onToggleFavourite={handleToggleFavourite}
                          onDelete={handleDeleteItem}
                          onRestore={handleRestoreItem}
                          onShareInChat={handleShareInChat}
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
          if (currentSection === 'chats' || currentSection === 'settings') {
            setCurrentSection('all');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
          toast.info('Composer ready at the top');
        }}
      />

      {/* 4. TEXT DETAIL MODAL */}
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

      {/* 5. MEDIA VIEWER MODAL */}
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
