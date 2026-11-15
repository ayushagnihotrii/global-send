'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  RefreshCw,
  FolderOpen,
  ArrowUpDown,
  Tag,
  Upload,
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

  // Full-dashboard drag and drop state for multi-file upload
  const [externalDroppedFiles, setExternalDroppedFiles] = useState<File[] | null>(null);
  const [isWorkspaceDragging, setIsWorkspaceDragging] = useState(false);
  const dragDepthRef = React.useRef(0);

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
      toast.success('Google Drive connected');
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
        toast.success(nextState ? 'Added to Favourites' : 'Removed from Favourites');
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
        toast.success(data.message || (permanent ? 'Deleted permanently' : 'Moved to Recently Deleted'));
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
        toast.success('Restored to Vault');
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
        return 'Notes & Code';
      case 'image':
        return 'Photos';
      case 'video':
        return 'Videos';
      case 'file':
        return 'Documents';
      case 'link':
        return 'Web Links';
      case 'favourites':
        return 'Favourites';
      case 'trash':
        return 'Recently Deleted';
      default:
        return 'All Items';
    }
  };

  const displayUsername = user.displayUsername || user.username;

  return (
    <div
      onDragEnter={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          dragDepthRef.current += 1;
          setIsWorkspaceDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
        }
      }}
      onDragLeave={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) {
            setIsWorkspaceDragging(false);
          }
        }
      }}
      onDrop={(e) => {
        dragDepthRef.current = 0;
        setIsWorkspaceDragging(false);
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          if (currentSection === 'trash' || currentSection === 'settings' || currentSection === 'chats') {
            setCurrentSection('all');
          }
          setExternalDroppedFiles(Array.from(e.dataTransfer.files));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
      className="relative min-h-screen flex bg-[#F0F0F0] dark:bg-[#0E0E10] text-[#111111] dark:text-neutral-100 selection:bg-[#CCFF00] selection:text-neutral-950"
    >
      {/* Full-Screen Drag & Drop Overlay */}
      {isWorkspaceDragging && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-neutral-900/30 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="rounded-[28px] border-3 border-dashed border-[#111111] dark:border-white bg-white dark:bg-[#18181B] px-10 py-9 shadow-2xl text-center max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#CDFF5D] text-black flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Upload className="w-7 h-7 stroke-[2.5]" />
            </div>
            <p className="font-headline text-xl font-extrabold text-[#111111] dark:text-white uppercase tracking-tight">
              DROP FILES ANYWHERE
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
              Queue one or multiple files directly into your encrypted vault
            </p>
          </div>
        </div>
      )}

      {/* 1. DESKTOP SIDEBAR */}
      <DesktopSidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        user={user}
        onLogout={onLogout}
        itemCounts={itemCounts}
      />

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:px-10 lg:py-8 pb-24 md:pb-12 max-w-6xl mx-auto w-full">
        {/* Mobile Top Navigation Bar */}
        <div className="flex md:hidden items-center justify-between pb-3.5 mb-5 border-b-2 border-neutral-900/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-headline font-extrabold text-[17px] tracking-tight text-[#111111] dark:text-white uppercase">
              {SITE_CONFIG.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setCurrentSection('settings')}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white dark:bg-[#18181B] border-2 border-neutral-900/10 dark:border-white/10 text-[#111111] dark:text-white shadow-xs cursor-pointer"
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
            {/* Editorial Title Header & Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <span className="font-eyebrow text-xl text-neutral-500 dark:text-neutral-400 block mb-1">
                  client-sealed repository
                </span>
                <div className="flex items-center gap-3">
                  <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#111111] dark:text-white uppercase leading-none">
                    {getSectionTitle()}
                  </h2>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-[#CDFF5D] text-black">
                    {currentSection === 'trash'
                      ? `${items.length} expiring`
                      : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                  </span>
                </div>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Pill Search Field */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Search vault…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-10 pr-12 rounded-full bg-white dark:bg-[#18181B] border-2 border-neutral-900/10 dark:border-white/10 text-xs sm:text-sm font-medium text-[#111111] dark:text-white placeholder:text-neutral-400 focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all shadow-xs"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                      ⌘K
                    </span>
                  )}
                </div>

                {/* Sort Pill */}
                <div className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full bg-white dark:bg-[#18181B] border-2 border-neutral-900/10 dark:border-white/10 text-xs font-bold font-mono text-[#111111] dark:text-white shrink-0 shadow-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent focus:outline-none cursor-pointer pr-1 uppercase tracking-wider"
                    aria-label="Sort items"
                  >
                    <option value="created_desc" className="bg-white dark:bg-[#18181B]">Newest</option>
                    <option value="created_asc" className="bg-white dark:bg-[#18181B]">Oldest</option>
                    <option value="title_asc" className="bg-white dark:bg-[#18181B]">Name</option>
                  </select>
                </div>

                {/* Refresh Pill */}
                <button
                  type="button"
                  onClick={fetchItems}
                  className="h-11 w-11 rounded-full bg-white dark:bg-[#18181B] border-2 border-neutral-900/10 dark:border-white/10 text-neutral-700 dark:text-neutral-200 flex items-center justify-center shrink-0 shadow-xs hover:border-neutral-900 dark:hover:border-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Refresh items"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* TAG FILTER CHIPS */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
                <span className="text-neutral-400 text-xs font-mono font-bold mr-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedTag === null
                      ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                      : 'bg-white dark:bg-[#18181B] text-neutral-600 dark:text-neutral-400 border border-neutral-900/10 dark:border-white/10 hover:border-neutral-900/30'
                  }`}
                >
                  All
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedTag === tag
                        ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'bg-white dark:bg-[#18181B] text-neutral-600 dark:text-neutral-400 border border-neutral-900/10 dark:border-white/10 hover:border-neutral-900/30'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* RECENTLY DELETED BANNER */}
            {currentSection === 'trash' && (
              <div className="mb-6 px-5 py-4 rounded-[22px] bg-white dark:bg-[#18181B] border-2 border-neutral-900/10 dark:border-white/10 flex items-center justify-between gap-4 text-xs font-medium text-neutral-600 dark:text-neutral-400 shadow-xs">
                <span>Items in Recently Deleted continue to expire on schedule.</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (window.confirm('Permanently delete all items in Recently Deleted?')) {
                      await fetch('/api/items/trash/empty', { method: 'POST' });
                      toast.success('Recently Deleted emptied');
                      fetchItems();
                    }
                  }}
                  className="rounded-full text-red-600 hover:bg-red-500/10 font-bold shrink-0"
                >
                  Delete All
                </Button>
              </div>
            )}

            {/* QUICK COMPOSER */}
            {currentSection !== 'trash' && (
              <QuickComposer
                onItemCreated={handleItemCreated}
                externalFiles={externalDroppedFiles}
                onExternalFilesConsumed={() => setExternalDroppedFiles(null)}
              />
            )}

            {/* ITEMS LIST */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-40 rounded-[24px] bg-white/70 dark:bg-[#18181B]/70 border-2 border-neutral-900/10 dark:border-white/10 animate-pulse p-5"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              /* PLAYFUL RIDICULOUS.DESIGN EMPTY STATE */
              <div className="text-center py-16 px-6 rounded-[28px] border-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-[#18181B] shadow-xs relative overflow-hidden">
                <div className="relative inline-block mb-4 select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/stickers/sticker-peace.png"
                    alt="Peace sticker"
                    className="w-16 sm:w-20 h-auto mx-auto drop-shadow-md animate-bounce"
                  />
                </div>
                <span className="font-eyebrow text-2xl text-neutral-500 dark:text-neutral-400 block mb-1">
                  clean slate
                </span>
                <h3 className="font-headline text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#111111] dark:text-white">
                  {searchQuery ? 'NO MATCHING ITEMS' : 'VAULT IS EMPTY'}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed font-medium">
                  {searchQuery
                    ? `No vault items matched "${searchQuery}".`
                    : 'Drop files anywhere on screen or use the composer above to seal notes, code, documents, or links on your device.'}
                </p>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-5 inline-flex items-center px-6 py-2.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-neutral-950 font-bold text-xs uppercase tracking-wider shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    Clear Search
                  </button>
                ) : null}
              </div>
            ) : (
              /* TIMELINE DATE GROUPS */
              <div className="space-y-7">
                {dateGroups.map((group) => (
                  <section key={group.key} className="space-y-2.5">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                        {group.title}
                      </h3>
                      <span className="font-mono text-[11px] font-bold text-neutral-400 bg-neutral-200/60 dark:bg-neutral-800/60 px-2 py-0.5 rounded-full tabular-nums">
                        {group.items.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
          toast.info('Ready to add a new item');
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
