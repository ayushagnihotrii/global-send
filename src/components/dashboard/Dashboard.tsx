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
      className="relative min-h-screen flex bg-[#f2f2f7] dark:bg-[#000000] text-[#1c1c1e] dark:text-[#f5f5f7]"
    >
      {/* Full-Screen Drag & Drop Overlay */}
      {isWorkspaceDragging && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-[#007aff]/10 dark:bg-[#0a84ff]/15 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="rounded-[24px] border-2 border-dashed border-[#007aff] dark:border-[#0a84ff] bg-white/95 dark:bg-[#1c1c1e]/95 px-8 py-7 shadow-2xl text-center max-w-sm">
            <div className="w-12 h-12 rounded-[14px] bg-[#007aff]/12 dark:bg-[#0a84ff]/20 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-[16px] font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">
              Drop files anywhere to queue
            </p>
            <p className="text-[13px] text-[#8e8e93] mt-1">
              Drop one or multiple files to add them to your vault
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
        <div className="flex md:hidden items-center justify-between pb-3.5 mb-4 border-b border-black/[0.07] dark:border-white/[0.09]">
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-semibold text-[16px] tracking-[-0.015em] text-[#1c1c1e] dark:text-[#f5f5f7]">
              {SITE_CONFIG.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setCurrentSection('settings')}
            className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.12] text-[#1c1c1e] dark:text-[#f5f5f7] cursor-pointer"
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
            {/* iOS Large Title Header & Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-[26px] sm:text-[30px] font-bold tracking-[-0.025em] text-[#1c1c1e] dark:text-[#f5f5f7] leading-tight">
                  {getSectionTitle()}
                </h2>
                <p className="text-[13px] text-[#8e8e93] mt-0.5 tabular-nums">
                  {currentSection === 'trash'
                    ? `${items.length} ${items.length === 1 ? 'item' : 'items'} · Items expire on schedule`
                    : `${items.length} ${items.length === 1 ? 'item' : 'items'} in vault`}
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Native iOS Search Field */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-[#8e8e93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-14 rounded-[10px] bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-[14px] text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#8e8e93] focus:bg-white dark:focus:bg-[#1c1c1e] focus:outline-none focus:ring-2 focus:ring-[#007aff]/25 border border-transparent focus:border-[#007aff] transition-all"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#8e8e93] font-mono">
                      ⌘K
                    </span>
                  )}
                </div>

                {/* Sort Pill */}
                <div className="inline-flex items-center gap-1 h-9 px-3 rounded-[10px] bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.12] text-[13px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7] shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#8e8e93]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent focus:outline-none cursor-pointer pr-1"
                    aria-label="Sort items"
                  >
                    <option value="created_desc">Newest</option>
                    <option value="created_asc">Oldest</option>
                    <option value="title_asc">Name</option>
                  </select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={fetchItems}
                  className="h-9 w-9 rounded-[10px] shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* TAG FILTER CHIPS */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
                <span className="text-[#8e8e93] text-[12px] font-medium mr-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                    selectedTag === null
                      ? 'bg-[#007aff] dark:bg-[#0a84ff] text-white'
                      : 'bg-white dark:bg-[#1c1c1e] text-[#6c6c70] dark:text-[#98989d] border border-black/[0.07] dark:border-white/[0.1]'
                  }`}
                >
                  All
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                      selectedTag === tag
                        ? 'bg-[#007aff] dark:bg-[#0a84ff] text-white'
                        : 'bg-white dark:bg-[#1c1c1e] text-[#6c6c70] dark:text-[#98989d] border border-black/[0.07] dark:border-white/[0.1]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* RECENTLY DELETED BANNER */}
            {currentSection === 'trash' && (
              <div className="mb-5 px-4 py-3 rounded-[14px] bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between gap-3 text-[13px] text-[#6c6c70] dark:text-[#98989d]">
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
                  className="text-[#ff3b30] dark:text-[#ff453a] hover:bg-[#ff3b30]/10 shrink-0"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-36 rounded-[16px] bg-white/70 dark:bg-[#1c1c1e]/70 border border-black/[0.06] dark:border-white/[0.08] animate-pulse p-4"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              /* NATIVE iOS EMPTY STATE */
              <div className="text-center py-16 px-4 ios-card rounded-[18px]">
                <div className="w-12 h-12 rounded-[14px] bg-[#767680]/[0.1] dark:bg-[#767680]/[0.22] text-[#8e8e93] flex items-center justify-center mx-auto mb-3">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {searchQuery ? 'No Results' : 'No Items'}
                </h3>
                <p className="text-[13px] text-[#8e8e93] mt-1 max-w-xs mx-auto leading-relaxed">
                  {searchQuery
                    ? `No items matched "${searchQuery}".`
                    : 'Add a note, code snippet, document, photo, or web link above.'}
                </p>
                {searchQuery && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              /* TIMELINE DATE GROUPS */
              <div className="space-y-7">
                {dateGroups.map((group) => (
                  <section key={group.key} className="space-y-2.5">
                    <div className="flex items-center justify-between px-0.5">
                      <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[#6c6c70] dark:text-[#98989d]">
                        {group.title}
                      </h3>
                      <span className="text-[12px] text-[#8e8e93] tabular-nums">
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
