'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Send,
  Paperclip,
  Ban,
  Trash2,
  Download,
  Copy,
  Check,
  ExternalLink,
  Clock,
  FileText,
  Image as ImageIcon,
  Film,
  Link2,
  FileCode,
  AlertCircle,
  MessageSquare,
  X,
  ArrowLeft,
} from 'lucide-react';
import {
  User,
  Item,
  PublicUserProfile,
  ConversationSummary,
  ChatMessage,
} from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn, formatBytes } from '@/lib/utils';
import { formatExpirationStatus } from '@/components/items/ItemCard';

interface ChatViewProps {
  currentUser: User;
  vaultItems: Item[];
  pendingShareItem?: Item | null;
  onClearPendingShareItem?: () => void;
}

function UserAvatar({
  username,
  avatarUrl,
  size = 'md',
}: {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims =
    size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`@${username}`}
        className={cn(
          dims,
          'rounded-full object-cover border border-[#e5e5ea] dark:border-[#27272a] shrink-0 bg-[#f5f5f7] dark:bg-[#1c1c21]'
        )}
      />
    );
  }

  const initial = (username || '?').replace(/^@/, '').charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        dims,
        'rounded-full bg-[#0071e3]/12 text-[#0071e3] font-semibold flex items-center justify-center shrink-0 border border-[#0071e3]/20'
      )}
    >
      {initial}
    </div>
  );
}

export function ChatView({
  currentUser,
  vaultItems,
  pendingShareItem,
  onClearPendingShareItem,
}: ChatViewProps) {
  const { toast } = useToast();

  // Conversations list & active conversation
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Username search
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Composer & Vault Attachment Picker
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chats');
      const data = await res.json();
      if (res.ok && data.conversations) {
        setConversations(data.conversations);
      }
    } catch {
      // ignore background poll error
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(convId)}`);
      const data = await res.json();
      if (res.ok) {
        setActiveConversation(data.conversation);
        setMessages(data.messages || []);
      }
    } catch {
      if (!silent) toast.error('Failed to load conversation messages');
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll active conversation and conversation list every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (activeConversationId) {
        fetchMessages(activeConversationId, true);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [activeConversationId, fetchConversations, fetchMessages]);

  // Scroll to bottom when new message count changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConversationId]);

  // Debounced username search
  useEffect(() => {
    const q = userSearchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok && data.users) {
          setSearchResults(data.users);
        }
      } catch {
        // ignore
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const handleStartConversation = async (targetUsername: string) => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not start conversation');
        return;
      }

      setUserSearchQuery('');
      setSearchResults([]);
      const conv: ConversationSummary = data.conversation;
      setActiveConversationId(conv.id);
      setActiveConversation(conv);
      await fetchConversations();
      await fetchMessages(conv.id);
    } catch {
      toast.error('Network error starting conversation');
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(activeConversationId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageType: 'text',
          textContent: messageText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send message');
        return;
      }

      setMessageText('');
      setMessages((prev) => [...prev, data.message]);
      fetchConversations();
    } catch {
      toast.error('Network error sending message');
    } finally {
      setIsSending(false);
    }
  };

  const handleShareVaultItem = async (item: Item, targetConvId?: string) => {
    const convId = targetConvId || activeConversationId;
    if (!convId) {
      toast.info('Select or start a conversation first to share this item');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(convId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageType: 'attachment',
          sharedItemId: item.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to share vault item');
        return;
      }

      toast.success(`Shared "${item.title}" in chat`);
      setShowAttachmentModal(false);
      if (onClearPendingShareItem) onClearPendingShareItem();
      if (convId === activeConversationId) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        setActiveConversationId(convId);
        await fetchMessages(convId);
      }
      fetchConversations();
    } catch {
      toast.error('Network error sharing item');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!activeConversation) return;
    const nextAction = activeConversation.isBlockedByMe ? 'unblock' : 'block';

    try {
      const res = await fetch('/api/chats/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: activeConversation.peer.username,
          action: nextAction,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update block status');
        return;
      }

      toast.success(data.message);
      setActiveConversation({
        ...activeConversation,
        isBlockedByMe: data.isBlockedByMe,
      });
      fetchConversations();
    } catch {
      toast.error('Network error updating block status');
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConversationId) return;
    if (
      !window.confirm(
        'Remove this conversation from your chat list? Note: This clears the conversation from your screen without erasing the other participant’s copy.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(activeConversationId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to remove conversation');
        return;
      }

      toast.success('Conversation removed from your list');
      setActiveConversationId(null);
      setActiveConversation(null);
      setMessages([]);
      fetchConversations();
    } catch {
      toast.error('Network error removing conversation');
    }
  };

  const activeShareableItems = vaultItems.filter(
    (item) => !item.isExpired && !item.deletedAt
  );

  return (
    <div className="bg-white dark:bg-[#141417] rounded-3xl border border-[#e5e5ea] dark:border-[#27272a] overflow-hidden shadow-xs min-h-[580px] flex flex-col md:flex-row">
      {/* Pending Share Banner if user clicked "Share in Chat" from Vault */}
      {pendingShareItem && (
        <div className="md:hidden p-3 bg-[#0071e3]/10 border-b border-[#0071e3]/20 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-[#0071e3] truncate">
            Select a chat to send &ldquo;{pendingShareItem.title}&rdquo;
          </span>
          <button
            type="button"
            onClick={onClearPendingShareItem}
            className="text-[#6e6e73] hover:text-[#1d1d1f]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LEFT SIDEBAR: User Search & Conversation List */}
      <div
        className={cn(
          'w-full md:w-80 border-b md:border-b-0 md:border-r border-[#e5e5ea] dark:border-[#27272a] flex flex-col',
          activeConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        <div className="p-4 border-b border-[#f0f0f2] dark:border-[#27272a] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
              Private Chats
            </h2>
            <span className="text-[11px] text-[#86868b]">
              @{currentUser.displayUsername || currentUser.username}
            </span>
          </div>

          {/* Search username box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search username..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1c21] border border-transparent focus:border-[#0071e3] text-xs text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none"
            />
            {userSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setUserSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {userSearchQuery.trim().length >= 2 && (
            <div className="rounded-2xl border border-[#e5e5ea] dark:border-[#27272a] bg-[#f9f9fb] dark:bg-[#1c1c21] p-2 space-y-1 max-h-52 overflow-y-auto">
              {isSearchingUsers ? (
                <p className="text-xs text-[#86868b] p-2 text-center">Searching users...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-[#86868b] p-2 text-center">
                  No user found matching &ldquo;{userSearchQuery}&rdquo;
                </p>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => handleStartConversation(u.username)}
                    className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-white dark:hover:bg-[#27272a] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <UserAvatar username={u.username} avatarUrl={u.avatarUrl} size="sm" />
                      <span className="text-xs font-semibold text-[#1d1d1f] dark:text-white truncate">
                        @{u.username}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#0071e3]">Message</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0f2] dark:divide-[#27272a]">
          {isLoadingConversations ? (
            <div className="p-6 text-center text-xs text-[#86868b]">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageSquare className="w-7 h-7 mx-auto text-[#86868b]" />
              <p className="text-xs font-medium text-[#1d1d1f] dark:text-white">
                No conversations yet
              </p>
              <p className="text-[11px] text-[#86868b]">
                Search for a friend&apos;s username above to start a private conversation.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setActiveConversationId(conv.id);
                    setActiveConversation(conv);
                    fetchMessages(conv.id);
                  }}
                  className={cn(
                    'w-full p-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-[#0071e3]/8 dark:bg-[#0071e3]/15'
                      : 'hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c21]'
                  )}
                >
                  <UserAvatar
                    username={conv.peer.username}
                    avatarUrl={conv.peer.avatarUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-[#1d1d1f] dark:text-white truncate">
                        @{conv.peer.username}
                      </span>
                      <span className="text-[10px] text-[#86868b] shrink-0">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6e6e73] dark:text-[#a1a1aa] truncate mt-0.5">
                      {conv.isBlockedByMe
                        ? 'Blocked'
                        : conv.lastMessagePreview || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Active Conversation Messages & Composer */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-[500px]',
          !activeConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] dark:bg-[#1c1c21] flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-[#86868b]" />
            </div>
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
              Select a Conversation
            </h3>
            <p className="text-xs text-[#86868b] max-w-xs mt-1">
              Search for any Global Send user by their public username to send messages or share items from your vault.
            </p>
          </div>
        ) : (
          <>
            {/* Conversation Header */}
            <div className="h-16 px-4 sm:px-6 border-b border-[#f0f0f2] dark:border-[#27272a] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f]"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <UserAvatar
                  username={activeConversation.peer.username}
                  avatarUrl={activeConversation.peer.avatarUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white truncate">
                    @{activeConversation.peer.username}
                  </h3>
                  <p className="text-[11px] text-[#86868b]">
                    {activeConversation.isBlockedByMe
                      ? 'You have blocked this user'
                      : activeConversation.hasBlockedMe
                      ? 'Messaging unavailable'
                      : 'Private 1-to-1 conversation'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {pendingShareItem && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      handleShareVaultItem(pendingShareItem, activeConversation.id)
                    }
                    isLoading={isSending}
                  >
                    Send &ldquo;{pendingShareItem.title.slice(0, 18)}&rdquo;
                  </Button>
                )}

                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className={cn(
                    'px-2.5 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer',
                    activeConversation.isBlockedByMe
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'text-[#6e6e73] hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c21]'
                  )}
                  title={
                    activeConversation.isBlockedByMe ? 'Unblock user' : 'Block user'
                  }
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{activeConversation.isBlockedByMe ? 'Unblock' : 'Block'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteConversation}
                  className="p-2 rounded-xl text-[#6e6e73] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  title="Remove conversation from my list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 bg-[#f9f9fb] dark:bg-[#0e0e11]">
              {isLoadingMessages ? (
                <p className="text-xs text-center text-[#86868b] py-8">
                  Loading messages...
                </p>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 space-y-1">
                  <p className="text-xs font-medium text-[#1d1d1f] dark:text-white">
                    No messages with @{activeConversation.peer.username} yet
                  </p>
                  <p className="text-[11px] text-[#86868b]">
                    Send a message or click the paperclip icon to share an item from your vault.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.isOwnMessage;
                  const att = msg.attachment;
                  const expStatus = att?.expiresAt
                    ? formatExpirationStatus(att.expiresAt)
                    : null;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col max-w-[82%] sm:max-w-[70%]',
                        isMine ? 'ml-auto items-end' : 'mr-auto items-start'
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed',
                          isMine
                            ? 'bg-[#0071e3] text-white rounded-br-sm'
                            : 'bg-white dark:bg-[#1c1c21] text-[#1d1d1f] dark:text-white border border-[#e5e5ea] dark:border-[#27272a] rounded-bl-sm'
                        )}
                      >
                        {msg.messageType === 'text' && (
                          <p className="whitespace-pre-wrap break-words">
                            {msg.textContent}
                          </p>
                        )}

                        {msg.messageType === 'attachment' && att && (
                          <div className="space-y-2 min-w-[210px]">
                            {!att.isAvailable ? (
                              /* EXPIRED OR DELETED ATTACHMENT PLACEHOLDER */
                              <div
                                className={cn(
                                  'flex items-center gap-2.5 p-2.5 rounded-xl border',
                                  isMine
                                    ? 'bg-white/10 border-white/20 text-white/90'
                                    : 'bg-[#f5f5f7] dark:bg-[#141417] border-[#e5e5ea] dark:border-[#27272a] text-[#86868b]'
                                )}
                              >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold">
                                    {att.isExpired ? 'File expired' : 'Item unavailable'}
                                  </p>
                                  <p className="text-[10px] opacity-80">
                                    This shared item has expired and is no longer accessible.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              /* ACTIVE SHARED ATTACHMENT CARD */
                              <div
                                className={cn(
                                  'p-3 rounded-xl border space-y-2',
                                  isMine
                                    ? 'bg-white/12 border-white/20 text-white'
                                    : 'bg-[#f5f5f7] dark:bg-[#141417] border-[#e5e5ea] dark:border-[#27272a] text-[#1d1d1f] dark:text-white'
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {att.type === 'image' ? (
                                      <ImageIcon className="w-4 h-4 shrink-0" />
                                    ) : att.type === 'video' ? (
                                      <Film className="w-4 h-4 shrink-0" />
                                    ) : att.type === 'link' ? (
                                      <Link2 className="w-4 h-4 shrink-0" />
                                    ) : att.type === 'text' ? (
                                      <FileText className="w-4 h-4 shrink-0" />
                                    ) : (
                                      <FileCode className="w-4 h-4 shrink-0" />
                                    )}
                                    <span className="text-xs font-semibold truncate">
                                      {att.filename || att.title}
                                    </span>
                                  </div>

                                  {att.fileSize ? (
                                    <span className="text-[10px] font-mono opacity-80 shrink-0">
                                      {formatBytes(att.fileSize)}
                                    </span>
                                  ) : null}
                                </div>

                                {att.type === 'text' && att.textContent && (
                                  <p className="text-xs opacity-90 line-clamp-4 whitespace-pre-wrap font-mono bg-black/10 p-2 rounded-lg">
                                    {att.textContent}
                                  </p>
                                )}

                                <div className="flex items-center justify-between gap-2 pt-1">
                                  {expStatus && (
                                    <span className="inline-flex items-center gap-1 text-[10px] opacity-80">
                                      <Clock className="w-3 h-3" />
                                      <span>{expStatus.label}</span>
                                    </span>
                                  )}

                                  {att.downloadUrl && (
                                    <a
                                      href={`${att.downloadUrl}?download=true`}
                                      download={att.filename || att.title}
                                      className={cn(
                                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                                        isMine
                                          ? 'bg-white text-[#0071e3] hover:bg-white/90'
                                          : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
                                      )}
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download</span>
                                    </a>
                                  )}

                                  {att.type === 'text' && att.textContent && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await navigator.clipboard.writeText(
                                          att.textContent || ''
                                        );
                                        setCopiedId(msg.id);
                                        toast.success('Copied shared text');
                                        setTimeout(() => setCopiedId(null), 2000);
                                      }}
                                      className={cn(
                                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer',
                                        isMine
                                          ? 'bg-white text-[#0071e3]'
                                          : 'bg-[#0071e3] text-white'
                                      )}
                                    >
                                      {copiedId === msg.id ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span>Copy</span>
                                    </button>
                                  )}

                                  {att.type === 'link' && att.url && (
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold',
                                        isMine
                                          ? 'bg-white text-[#0071e3]'
                                          : 'bg-[#0071e3] text-white'
                                      )}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Open</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {msg.textContent && (
                              <p className="text-xs whitespace-pre-wrap">{msg.textContent}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-[#86868b] mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar */}
            {activeConversation.isBlockedByMe || activeConversation.hasBlockedMe ? (
              <div className="p-4 border-t border-[#f0f0f2] dark:border-[#27272a] text-center text-xs text-[#86868b]">
                Messaging is disabled because one of the participants has blocked this conversation.
              </div>
            ) : (
              <form
                onSubmit={handleSendText}
                className="p-3 sm:p-4 border-t border-[#f0f0f2] dark:border-[#27272a] bg-white dark:bg-[#141417] flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setShowAttachmentModal(true)}
                  className="p-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1c21] text-[#6e6e73] hover:text-[#0071e3] transition-colors cursor-pointer shrink-0"
                  title="Share an item from your Vault"
                  aria-label="Attach vault item"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={`Message @${activeConversation.peer.username}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 h-10 px-3.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1c21] text-xs sm:text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20"
                />

                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSending}
                  disabled={!messageText.trim() || isSending}
                  className="h-10 px-4"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            )}
          </>
        )}
      </div>

      {/* MODAL: Select Existing Vault Item to Share */}
      {showAttachmentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141417] rounded-3xl border border-[#e5e5ea] dark:border-[#27272a] w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-[#f0f0f2] dark:border-[#27272a] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                  Share from Your Vault
                </h3>
                <p className="text-[11px] text-[#86868b]">
                  Sharing links directly to your vault item without duplicating files or extending its expiration time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="p-1.5 rounded-lg text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {activeShareableItems.length === 0 ? (
                <p className="text-xs text-[#86868b] text-center py-8">
                  You have no active items in your vault to share. Upload a file or save a note in My Vault first.
                </p>
              ) : (
                activeShareableItems.map((item) => {
                  const exp = formatExpirationStatus(item.expiresAt);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-[#e5e5ea] dark:border-[#27272a] hover:border-[#0071e3] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white truncate">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[#86868b] mt-0.5">
                          <span className="uppercase">{item.type}</span>
                          {item.file && <span>· {formatBytes(item.file.fileSize)}</span>}
                          <span>· {exp.label}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleShareVaultItem(item)}
                        isLoading={isSending}
                      >
                        Share
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
