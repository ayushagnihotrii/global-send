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
  FolderPlus,
  ChevronRight,
  CornerLeftUp,
  FolderInput,
  Folder as FolderIcon,
  Trash2,
  LayoutGrid,
  List,
  CheckSquare,
  Image as ImageIcon,
  Film,
  FileText,
  Music,
  Check,
  Sparkles,
} from 'lucide-react';
import { User, Item, DateGroupedItems } from '@/lib/types';
import { DesktopSidebar, NavSection } from '@/components/layout/DesktopSidebar';
import { MobileNavBar } from '@/components/layout/MobileNavBar';
import { QuickComposer } from '@/components/composer/QuickComposer';
import { ItemCard } from '@/components/items/ItemCard';
import { ItemRow } from '@/components/items/ItemRow';
import { TextDetailModal } from '@/components/items/TextDetailModal';
import { MediaViewerModal } from '@/components/items/MediaViewerModal';
import { ShareModal } from '@/components/items/ShareModal';
import { SettingsView } from '@/components/settings/SettingsView';
import { ChatView } from '@/components/chats/ChatView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { groupItemsByDate, cn } from '@/lib/utils';
import { SITE_CONFIG } from '@/config/site';
import { Logo } from '@/components/ui/Logo';

// Authentic macOS Finder Folder Graphic with gradient depth
function MacFolderGraphic({ isHovered }: { isHovered?: boolean }) {
  return (
    <div className={cn('relative w-10 h-10 shrink-0 transition-transform duration-200', isHovered && 'scale-110')}>
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full drop-shadow-xs">
        <defs>
          <linearGradient id="macFolderBackGrad" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0077F5" />
            <stop offset="1" stopColor="#0058C6" />
          </linearGradient>
          <linearGradient id="macFolderFrontGrad" x1="0" y1="12" x2="0" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5AC8FA" />
            <stop offset="0.25" stopColor="#30B0F4" />
            <stop offset="1" stopColor="#0071E3" />
          </linearGradient>
          <linearGradient id="macFolderTabGrad" x1="0" y1="6" x2="0" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#64D2FF" />
            <stop offset="1" stopColor="#0A84FF" />
          </linearGradient>
        </defs>
        {/* Back Plate */}
        <rect x="3" y="10" width="34" height="24" rx="4" fill="url(#macFolderBackGrad)" />
        {/* Folder Tab */}
        <path d="M4 11C4 8.79086 5.79086 7 8 7H16.2C17.3 7 18.3 7.5 19 8.3L20.8 10.4C21.3 11 22 11.3 22.8 11.3H32C34.2091 11.3 36 13.0909 36 15.3V16H4V11Z" fill="url(#macFolderTabGrad)" />
        {/* Front Flap */}
        <rect x="2" y="13.5" width="36" height="22.5" rx="4.5" fill="url(#macFolderFrontGrad)" />
        {/* Top Edge Highlight Sheen */}
        <rect x="3" y="14" width="34" height="1.2" rx="0.6" fill="white" fillOpacity="0.4" />
      </svg>
    </div>
  );
}

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
  const [sharingItem, setSharingItem] = useState<Item | null>(null);

  // macOS View Mode & Category Filters
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'image' | 'video' | 'pdf' | 'audio' | 'text'>('all');

  // Multi-selection & Batch Actions
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [isBatchMoving, setIsBatchMoving] = useState(false);

  // Folder drag target highlight state
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDraggingInternalItem, setIsDraggingInternalItem] = useState(false);

  // Folder navigation & modal states
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Item[]>([]);
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([]);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Move item modal states
  const [movingItem, setMovingItem] = useState<Item | null>(null);
  const [allUserFolders, setAllUserFolders] = useState<Item[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  // Item queued to be shared in chat
  const [pendingShareItem, setPendingShareItem] = useState<Item | null>(null);

  // Full-dashboard drag and drop state for multi-file upload
  const [externalDroppedFiles, setExternalDroppedFiles] = useState<File[] | null>(null);
  const [isWorkspaceDragging, setIsWorkspaceDragging] = useState(false);
  const dragDepthRef = React.useRef(0);
  const isDraggingInternalRef = React.useRef(false);

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
    const handleDragEnd = () => {
      isDraggingInternalRef.current = false;
      setIsDraggingInternalItem(false);
      setDragOverFolderId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dragend', handleDragEnd);
    };
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

    const pwaStagedId = url.searchParams.get('pwa_staged');
    if (pwaStagedId) {
      url.searchParams.delete('pwa_staged');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      fetch(`/api/pwa-stash/${pwaStagedId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.entry?.files?.length) {
            const files: File[] = data.entry.files.map((f: any) => {
              const binary = atob(f.dataBase64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              return new File([bytes], f.name, { type: f.type });
            });
            setExternalDroppedFiles(files);
            toast.info(`Received ${files.length} shared file${files.length > 1 ? 's' : ''}`);
          }
        })
        .catch((e) => console.error('Failed to load PWA shared files:', e));
    }
  }, [toast]);

  // Fetch folders for current parent
  const fetchFolders = useCallback(async () => {
    try {
      const parentParam = currentFolderId ? `?parentFolderId=${encodeURIComponent(currentFolderId)}` : '?parentFolderId=root';
      const res = await fetch(`/api/items/folders${parentParam}`);
      const data = await res.json();
      if (res.ok && data.folders) {
        setFolders(data.folders);
        setFolderPath(data.path || []);
      }
    } catch {
      // ignore
    }
  }, [currentFolderId]);

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

      // Filter by folder when in normal vault browsing
      if (
        currentSection !== 'trash' &&
        currentSection !== 'favourites' &&
        !debouncedSearch.trim() &&
        !selectedTag
      ) {
        params.set('parentFolderId', currentFolderId || 'root');
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
  }, [currentSection, currentFolderId, debouncedSearch, selectedTag, sortBy, toast]);

  useEffect(() => {
    if (currentSection !== 'settings') {
      fetchItems();
      if (currentSection !== 'trash' && currentSection !== 'chats') {
        fetchFolders();
      }
    }
  }, [fetchItems, fetchFolders, currentSection, currentFolderId]);

  // Handle new folder creation
  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newFolderName.trim();
    if (!name) {
      toast.error('Please enter a folder name');
      return;
    }
    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/items/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          parentFolderId: currentFolderId || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.folder) {
        toast.success(`Created folder "${name}"`);
        setNewFolderName('');
        setIsNewFolderModalOpen(false);
        fetchFolders();
        fetchItems();
      } else {
        toast.error(data.error || 'Failed to create folder');
      }
    } catch {
      toast.error('Network error creating folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Open move modal
  const handleOpenMoveModal = async (item: Item) => {
    setMovingItem(item);
    try {
      const res = await fetch('/api/items/folders?parentFolderId=all');
      const data = await res.json();
      if (res.ok && data.folders) {
        setAllUserFolders(data.folders.filter((f: Item) => f.id !== item.id));
      }
    } catch {
      // ignore
    }
  };

  // Move item to destination folder
  const handleMoveItem = async (targetFolderId: string | null) => {
    if (!movingItem) return;
    setIsMoving(true);
    try {
      const res = await fetch(`/api/items/${movingItem.id}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFolderId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Moved "${movingItem.title}"`);
        setMovingItem(null);
        fetchItems();
        fetchFolders();
      } else {
        toast.error(data.error || 'Failed to move item');
      }
    } catch {
      toast.error('Network error moving item');
    } finally {
      setIsMoving(false);
    }
  };

  // Toggle selection for an item
  const handleToggleSelect = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  // Select all or clear selection
  const handleSelectAll = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedItemIds(new Set());
  };

  // Open batch move modal
  const handleOpenBatchMoveModal = async () => {
    if (selectedItemIds.size === 0) return;
    try {
      const res = await fetch('/api/items/folders?parentFolderId=all');
      const data = await res.json();
      if (res.ok && data.folders) {
        setAllUserFolders(data.folders.filter((f: Item) => !selectedItemIds.has(f.id)));
      }
    } catch {
      // ignore
    }
    setIsBatchMoveModalOpen(true);
  };

  // Execute batch move
  const handleBatchMove = async (targetFolderId: string | null) => {
    if (selectedItemIds.size === 0) return;
    setIsBatchMoving(true);
    try {
      const res = await fetch('/api/items/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          itemIds: Array.from(selectedItemIds),
          targetFolderId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Items moved successfully');
        setIsBatchMoveModalOpen(false);
        setSelectedItemIds(new Set());
        fetchItems();
        fetchFolders();
      } else {
        toast.error(data.error || 'Failed to move items');
      }
    } catch {
      toast.error('Network error executing batch move');
    } finally {
      setIsBatchMoving(false);
    }
  };

  // Execute batch delete
  const handleBatchDelete = async () => {
    if (selectedItemIds.size === 0) return;
    if (!window.confirm(`Move ${selectedItemIds.size} selected item(s) to Recently Deleted?`)) return;

    try {
      const res = await fetch('/api/items/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentSection === 'trash' ? 'permanent_delete' : 'delete',
          itemIds: Array.from(selectedItemIds),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Items deleted');
        setSelectedItemIds(new Set());
        fetchItems();
      } else {
        toast.error(data.error || 'Failed to delete items');
      }
    } catch {
      toast.error('Network error deleting items');
    }
  };

  // Drag and Drop directly onto Folder card or Breadcrumb
  const handleDropOnFolder = async (targetFolderId: string | null, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    // 1. Check if external desktop files were dropped onto this folder
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      if (currentFolderId !== targetFolderId) {
        setCurrentFolderId(targetFolderId);
      }
      setExternalDroppedFiles(Array.from(e.dataTransfer.files));
      toast.info(`Uploading dropped file(s) into folder...`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Internal item move
    let idsToMove: string[] = [];
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.itemIds)) {
          idsToMove = parsed.itemIds;
        } else if (parsed.itemId) {
          idsToMove = [parsed.itemId];
        }
      }
    } catch {}

    const internalId = e.dataTransfer.getData('application/x-quickvault-item');
    if (!idsToMove.length && internalId) {
      idsToMove = [internalId];
    }

    if (!idsToMove.length && selectedItemIds.size > 0) {
      idsToMove = Array.from(selectedItemIds);
    }

    if (!idsToMove.length) return;

    try {
      const res = await fetch('/api/items/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          itemIds: idsToMove,
          targetFolderId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Moved ${idsToMove.length} item(s)`);
        setSelectedItemIds(new Set());
        fetchItems();
        fetchFolders();
      } else {
        toast.error(data.error || 'Failed to move items');
      }
    } catch {
      toast.error('Network error moving items');
    }
  };

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

  // Category counts for macOS clubbing tabs
  const categoryCounts = useMemo(() => {
    let images = 0;
    let videos = 0;
    let pdfs = 0;
    let audio = 0;
    let text = 0;
    items.forEach((item) => {
      if (item.type === 'image') images++;
      else if (item.type === 'video') videos++;
      else if (
        item.file?.mimeType === 'application/pdf' ||
        /\.(pdf)$/i.test(item.file?.originalFilename || item.title || '')
      ) {
        pdfs++;
      } else if (
        (item.file?.mimeType && item.file.mimeType.startsWith('audio/')) ||
        /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(item.file?.originalFilename || '')
      ) {
        audio++;
      } else if (item.type === 'text' || item.type === 'link') {
        text++;
      }
    });
    return { all: items.length, images, videos, pdfs, audio, text };
  }, [items]);

  // Filter items by active category
  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return items;
    return items.filter((item) => {
      if (categoryFilter === 'image') return item.type === 'image';
      if (categoryFilter === 'video') return item.type === 'video';
      if (categoryFilter === 'pdf') {
        return (
          item.file?.mimeType === 'application/pdf' ||
          /\.(pdf)$/i.test(item.file?.originalFilename || item.title || '')
        );
      }
      if (categoryFilter === 'audio') {
        return (
          (item.file?.mimeType && item.file.mimeType.startsWith('audio/')) ||
          /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(item.file?.originalFilename || '')
        );
      }
      if (categoryFilter === 'text') {
        return item.type === 'text' || item.type === 'link';
      }
      return true;
    });
  }, [items, categoryFilter]);

  // Group items by relative date
  const dateGroups: DateGroupedItems[] = useMemo(() => {
    return groupItemsByDate(filteredItems);
  }, [filteredItems]);

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
        if (isDraggingInternalRef.current || e.dataTransfer?.types?.includes('application/x-quickvault-item')) return;
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          dragDepthRef.current += 1;
          setIsWorkspaceDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (isDraggingInternalRef.current || e.dataTransfer?.types?.includes('application/x-quickvault-item')) return;
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
        }
      }}
      onDragLeave={(e) => {
        if (isDraggingInternalRef.current || e.dataTransfer?.types?.includes('application/x-quickvault-item')) return;
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
        if (isDraggingInternalRef.current || e.dataTransfer?.types?.includes('application/x-quickvault-item')) return;
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          if (currentSection === 'trash' || currentSection === 'settings' || currentSection === 'chats') {
            setCurrentSection('all');
          }
          setExternalDroppedFiles(Array.from(e.dataTransfer.files));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
      className="relative min-h-screen flex bg-[#F6F6F6] dark:bg-[#000000] text-[#111111] dark:text-neutral-100 selection:bg-[#007aff]/30 selection:text-neutral-950 font-sans"
    >
      {/* Non-intrusive macOS Window Drop Accent & Floating Banner (ZERO BLUR, all folders 100% visible) */}
      {isWorkspaceDragging && !isDraggingInternalItem && (
        <div className="fixed inset-0 z-40 pointer-events-none ring-4 ring-inset ring-[#007aff]/60 bg-[#007aff]/[0.02] animate-in fade-in duration-150 flex items-start justify-center pt-5">
          <div className="pointer-events-none bg-neutral-900/90 dark:bg-[#1C1C1E]/95 backdrop-blur-xl text-white px-5 py-2.5 rounded-full shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-3 duration-150">
            <Upload className="w-4 h-4 text-[#38BDF8] animate-bounce" />
            <span>Drop files anywhere to upload to {currentFolderId ? (folderPath[folderPath.length - 1]?.name || 'current folder') : 'Vault Root'}</span>
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

                {/* macOS Finder View Mode Switcher */}
                <div className="inline-flex items-center p-1 h-11 rounded-full bg-white dark:bg-[#18181B] border-2 border-neutral-900/10 dark:border-white/10 shrink-0 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'h-8 px-2.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                      viewMode === 'grid'
                        ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'text-neutral-500 hover:text-black dark:hover:text-white'
                    )}
                    title="Icons / Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Icons</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'h-8 px-2.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                      viewMode === 'list'
                        ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'text-neutral-500 hover:text-black dark:hover:text-white'
                    )}
                    title="List / Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">List</span>
                  </button>
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

            {/* macOS FINDER CATEGORY SEGMENTED TABS (CLUBBING) */}
            {currentSection !== 'trash' && (
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-200/50 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-md mb-5 overflow-x-auto scrollbar-none shadow-xs">
                {[
                  { id: 'all', label: 'All Files', icon: LayoutGrid, count: categoryCounts.all, color: 'text-neutral-500' },
                  { id: 'image', label: 'Photos', icon: ImageIcon, count: categoryCounts.images, color: 'text-[#0284c7] dark:text-[#38bdf8]' },
                  { id: 'video', label: 'Videos', icon: Film, count: categoryCounts.videos, color: 'text-[#9333ea] dark:text-[#c084fc]' },
                  { id: 'pdf', label: 'PDFs & Docs', icon: FileText, count: categoryCounts.pdfs, color: 'text-red-500' },
                  { id: 'audio', label: 'Audio', icon: Music, count: categoryCounts.audio, color: 'text-emerald-600 dark:text-emerald-400' },
                  { id: 'text', label: 'Notes & Links', icon: Sparkles, count: categoryCounts.text, color: 'text-amber-500' },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isActive = categoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id as any)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer select-none',
                        isActive
                          ? 'bg-white dark:bg-[#1C1C1E] text-neutral-900 dark:text-white shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.08]'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5', isActive ? cat.color : 'text-neutral-400')} />
                      <span>{cat.label}</span>
                      <span
                        className={cn(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded-full tabular-nums',
                          isActive
                            ? 'bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 font-bold'
                            : 'text-neutral-400'
                        )}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

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
              <div className="mb-6 px-5 py-4 rounded-[22px] bg-white dark:bg-[#18181B] border-2 border-neutral-900/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-medium text-neutral-600 dark:text-neutral-400 shadow-xs">
                <div>
                  <span className="font-bold text-[#111111] dark:text-white block sm:inline mr-2">30-Day Trash Retention:</span>
                  <span>Items in Recently Deleted are automatically purged permanently after 30 days. You can restore them anytime.</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (window.confirm('Permanently delete all items in Recently Deleted? This cannot be undone.')) {
                      await fetch('/api/items/trash/empty', { method: 'POST' });
                      toast.success('Recently Deleted emptied');
                      fetchItems();
                    }
                  }}
                  className="rounded-full text-red-600 hover:bg-red-500/10 font-bold shrink-0 self-start sm:self-center"
                >
                  Empty Trash
                </Button>
              </div>
            )}

            {/* QUICK COMPOSER (ABOVE FOLDER NAVIGATION) */}
            {currentSection !== 'trash' && (
              <div className="mb-6">
                <QuickComposer
                  onItemCreated={handleItemCreated}
                  parentFolderId={currentFolderId}
                  externalFiles={externalDroppedFiles}
                  onExternalFilesConsumed={() => setExternalDroppedFiles(null)}
                />
              </div>
            )}

            {/* FOLDER NAVIGATION & BREADCRUMBS (BELOW COMPOSER) */}
            {currentSection !== 'trash' && !debouncedSearch.trim() && !selectedTag && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold scrollbar-none min-w-0 py-0.5">
                    <button
                      type="button"
                      onClick={() => setCurrentFolderId(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverFolderId('root');
                      }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={(e) => handleDropOnFolder(null, e)}
                      className={cn(
                        'px-2.5 py-1 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
                        dragOverFolderId === 'root'
                          ? 'bg-[#007aff] text-white scale-105 shadow-md ring-2 ring-[#007aff]/40'
                          : currentFolderId === null
                          ? 'bg-neutral-100 dark:bg-white/10 text-neutral-950 dark:text-white font-bold'
                          : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                      )}
                    >
                      <FolderIcon className="w-3.5 h-3.5 text-[#007aff]" />
                      <span>Vault Root</span>
                    </button>
                    {folderPath.map((crumb, idx) => {
                      const isLast = idx === folderPath.length - 1;
                      const isCrumbTarget = dragOverFolderId === crumb.id;
                      return (
                        <React.Fragment key={crumb.id}>
                          <ChevronRight className="w-3 h-3 text-neutral-400 shrink-0" />
                          <button
                            type="button"
                            onClick={() => setCurrentFolderId(crumb.id)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverFolderId(crumb.id);
                            }}
                            onDragLeave={() => setDragOverFolderId(null)}
                            onDrop={(e) => handleDropOnFolder(crumb.id, e)}
                            className={cn(
                              'px-2.5 py-1 rounded-xl transition-all cursor-pointer shrink-0 truncate max-w-[150px]',
                              isCrumbTarget
                                ? 'bg-[#007aff] text-white scale-105 shadow-md ring-2 ring-[#007aff]/40'
                                : isLast
                                ? 'bg-neutral-100 dark:bg-white/10 text-neutral-950 dark:text-white font-bold'
                                : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                            )}
                          >
                            {crumb.name}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Folder Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {currentFolderId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (folderPath.length > 1) {
                            setCurrentFolderId(folderPath[folderPath.length - 2].id);
                          } else {
                            setCurrentFolderId(null);
                          }
                        }}
                        className="h-7 px-2.5 rounded-lg border border-neutral-200 dark:border-white/10 text-xs font-medium flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                        title="Go up one folder"
                      >
                        <CornerLeftUp className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Up</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsNewFolderModalOpen(true)}
                      className="h-7 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>New Folder</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Folders Grid (macOS Finder Style with Drag-and-Drop) */}
                {folders.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {folders.map((folder) => {
                      const isHoveredTarget = dragOverFolderId === folder.id;
                      return (
                        <div
                          key={folder.id}
                          onClick={() => setCurrentFolderId(folder.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverFolderId(folder.id);
                          }}
                          onDragLeave={() => {
                            if (dragOverFolderId === folder.id) setDragOverFolderId(null);
                          }}
                          onDrop={(e) => handleDropOnFolder(folder.id, e)}
                          className={cn(
                            'group relative p-3 rounded-2xl border transition-all duration-200 flex items-center gap-3 active:scale-[0.98] cursor-pointer select-none',
                            isHoveredTarget
                              ? 'border-[#007aff] ring-2 ring-[#007aff] bg-[#007aff]/10 dark:bg-[#007aff]/20 scale-[1.02] shadow-md'
                              : 'bg-white dark:bg-[#1C1C1E] border-black/[0.07] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 hover:shadow-sm'
                          )}
                        >
                          <MacFolderGraphic isHovered={isHoveredTarget} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {folder.title}
                            </p>
                            <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                              {isHoveredTarget ? (
                                <span className="text-[#007aff] font-bold">Drop to move here</span>
                              ) : (
                                'Folder'
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(folder, false);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Delete folder"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
              viewMode === 'list' ? (
                <div className="space-y-6">
                  {/* Select All Toolbar Header */}
                  <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-mono font-bold text-neutral-400 border-b border-black/5 dark:border-white/5 uppercase tracking-wider">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="hover:text-black dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>{selectedItemIds.size === items.length && items.length > 0 ? 'Deselect All' : 'Select All'}</span>
                      </button>
                      <span className="hidden sm:inline">Name</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="hidden sm:inline w-28">Kind</span>
                      <span className="hidden md:inline w-20 text-right">Size</span>
                      <span className="hidden lg:inline w-28 text-right">Date Added</span>
                      <span className="w-24 text-right">Status</span>
                      <span className="w-24 text-right">Actions</span>
                    </div>
                  </div>

                  {dateGroups.map((group) => (
                    <section key={group.key} className="space-y-1">
                      <div className="flex items-center justify-between px-3 py-1">
                        <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          {group.title}
                        </h3>
                        <span className="font-mono text-[10px] font-bold text-neutral-400 bg-neutral-200/50 dark:bg-neutral-800/50 px-2 py-0.5 rounded-full tabular-nums">
                          {group.items.length}
                        </span>
                      </div>
                      <div className="bg-white/80 dark:bg-[#18181B]/80 rounded-2xl border border-neutral-200/80 dark:border-white/10 p-1 divide-y divide-black/5 dark:divide-white/5 shadow-xs">
                        {group.items.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            isSelected={selectedItemIds.has(item.id)}
                            onToggleSelect={handleToggleSelect}
                            onOpenDetail={handleOpenDetail}
                            onToggleFavourite={handleToggleFavourite}
                            onDelete={handleDeleteItem}
                            onRestore={handleRestoreItem}
                            onShareInChat={handleShareInChat}
                            onShareLink={(item) => setSharingItem(item)}
                            onMove={handleOpenMoveModal}
                            inTrash={currentSection === 'trash'}
                            onDragStart={(e, item) => {
                              isDraggingInternalRef.current = true;
                              setIsDraggingInternalItem(true);
                              if (!selectedItemIds.has(item.id)) {
                                setSelectedItemIds(new Set([item.id]));
                              }
                            }}
                            onDragEnd={() => {
                              isDraggingInternalRef.current = false;
                              setIsDraggingInternalItem(false);
                              setDragOverFolderId(null);
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                /* Icons / Grid View */
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
                            isSelected={selectedItemIds.has(item.id)}
                            onToggleSelect={handleToggleSelect}
                            onOpenDetail={handleOpenDetail}
                            onToggleFavourite={handleToggleFavourite}
                            onDelete={handleDeleteItem}
                            onRestore={handleRestoreItem}
                            onShareInChat={handleShareInChat}
                            onShareLink={(item) => setSharingItem(item)}
                            onMove={handleOpenMoveModal}
                            inTrash={currentSection === 'trash'}
                            onDragStart={(e, item) => {
                              isDraggingInternalRef.current = true;
                              setIsDraggingInternalItem(true);
                              if (!selectedItemIds.has(item.id)) {
                                setSelectedItemIds(new Set([item.id]));
                              }
                            }}
                            onDragEnd={() => {
                              isDraggingInternalRef.current = false;
                              setIsDraggingInternalItem(false);
                              setDragOverFolderId(null);
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )
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
        onShare={(item) => setSharingItem(item)}
      />

      {/* 5.5. SECURE SHARE MODAL */}
      <ShareModal
        item={sharingItem}
        isOpen={Boolean(sharingItem)}
        onClose={() => setSharingItem(null)}
      />

      {/* 6. NEW FOLDER MODAL */}
      <Modal
        isOpen={isNewFolderModalOpen}
        onClose={() => {
          setIsNewFolderModalOpen(false);
          setNewFolderName('');
        }}
        title="Create New Folder"
        subtitle={currentFolderId ? `Inside: ${folderPath[folderPath.length - 1]?.name || 'Current Folder'}` : 'In Vault Root'}
        maxWidth="sm"
      >
        <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
          <Input
            label="Folder Name"
            placeholder="e.g. Video Projects, Receipts..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsNewFolderModalOpen(false);
                setNewFolderName('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreatingFolder || !newFolderName.trim()}
              className="bg-[#111111] text-white dark:bg-white dark:text-black font-bold"
            >
              {isCreatingFolder ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. MOVE ITEM MODAL */}
      <Modal
        isOpen={Boolean(movingItem)}
        onClose={() => setMovingItem(null)}
        title="Move to Folder"
        subtitle={movingItem ? `Choose destination for "${movingItem.title}"` : undefined}
        maxWidth="sm"
      >
        <div className="p-5 space-y-3">
          <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
            <button
              type="button"
              disabled={isMoving || movingItem?.parentFolderId === null}
              onClick={() => handleMoveItem(null)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left',
                movingItem?.parentFolderId === null
                  ? 'border-neutral-300 bg-neutral-100 dark:bg-white/5 opacity-50 cursor-not-allowed'
                  : 'border-neutral-200 dark:border-white/10 hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-neutral-400" />
                <span>Vault Root (Top Level)</span>
              </div>
              {movingItem?.parentFolderId === null && (
                <span className="text-[10px] font-mono text-neutral-400">Current</span>
              )}
            </button>

            {allUserFolders.map((f) => {
              const isCurrent = movingItem?.parentFolderId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={isMoving || isCurrent}
                  onClick={() => handleMoveItem(f.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left',
                    isCurrent
                      ? 'border-neutral-300 bg-neutral-100 dark:bg-white/5 opacity-50 cursor-not-allowed'
                      : 'border-neutral-200 dark:border-white/10 hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderIcon className="w-4 h-4 text-[#FBBF24]" />
                    <span className="truncate">{f.title}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">Current</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMovingItem(null)}
              disabled={isMoving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* 8. macOS FLOATING BATCH ACTION DOCK */}
      {selectedItemIds.size > 0 && currentSection !== 'trash' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-neutral-950/90 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl text-white shadow-2xl border border-white/15 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 pl-1 pr-2.5 border-r border-white/15 text-xs font-semibold">
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#007aff] text-[11px] font-bold text-white tabular-nums">
              {selectedItemIds.size}
            </span>
            <span className="hidden sm:inline">selected</span>
          </div>

          <button
            type="button"
            onClick={handleOpenBatchMoveModal}
            className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderInput className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Move to Folder</span>
          </button>

          <button
            type="button"
            onClick={handleBatchDelete}
            className="h-8 px-3 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={handleClearSelection}
            className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-0.5"
            title="Deselect All"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 9. BATCH MOVE MODAL */}
      <Modal
        isOpen={isBatchMoveModalOpen}
        onClose={() => setIsBatchMoveModalOpen(false)}
        title="Move Selected Items"
        subtitle={`Club ${selectedItemIds.size} item(s) into a folder`}
        maxWidth="sm"
      >
        <div className="p-5 space-y-3">
          <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
            <button
              type="button"
              disabled={isBatchMoving || currentFolderId === null}
              onClick={() => handleBatchMove(null)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left',
                currentFolderId === null
                  ? 'border-neutral-300 bg-neutral-100 dark:bg-white/5 opacity-50 cursor-not-allowed'
                  : 'border-neutral-200 dark:border-white/10 hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-neutral-400" />
                <span>Vault Root (Top Level)</span>
              </div>
              {currentFolderId === null && (
                <span className="text-[10px] font-mono text-neutral-400">Current</span>
              )}
            </button>

            {allUserFolders.map((f) => {
              const isCurrent = currentFolderId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={isBatchMoving || isCurrent}
                  onClick={() => handleBatchMove(f.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left',
                    isCurrent
                      ? 'border-neutral-300 bg-neutral-100 dark:bg-white/5 opacity-50 cursor-not-allowed'
                      : 'border-neutral-200 dark:border-white/10 hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderIcon className="w-4 h-4 text-[#FBBF24]" />
                    <span className="truncate">{f.title}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">Current</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsBatchMoveModalOpen(false)}
              disabled={isBatchMoving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
