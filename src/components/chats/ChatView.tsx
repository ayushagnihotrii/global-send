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
    size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-[13px]';

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`@${username}`}
        className={cn(
          dims,
          'rounded-full object-cover border border-black/[0.08] dark:border-white/[0.12] shrink-0 bg-[#f2f2f7] dark:bg-[#2c2c2e]'
        )}
      />
    );
  }

  const initial = (username || '?').replace(/^@/, '').charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        dims,
        'rounded-full bg-[#8e8e93]/20 dark:bg-[#636366]/40 text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold flex items-center justify-center shrink-0'
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

      toast.success(`Shared "${item.title}"`);
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
        'Remove this conversation from your list? This clears it from your screen without erasing the other participant’s copy.'
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

      toast.success('Conversation removed');
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
    <div className="ios-card rounded-[20px] overflow-hidden min-h-[600px] flex flex-col md:flex-row">
      {/* Pending Share Banner */}
      {pendingShareItem && (
        <div className="md:hidden p-3 bg-[#007aff]/10 border-b border-[#007aff]/20 flex items-center justify-between gap-2 text-[12px]">
          <span className="font-medium text-[#007aff] dark:text-[#0a84ff] truncate">
            Select a conversation to send &ldquo;{pendingShareItem.title}&rdquo;
          </span>
          <button
            type="button"
            onClick={onClearPendingShareItem}
            className="text-[#8e8e93] hover:text-[#1c1c1e]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LEFT SIDEBAR: iMessage Conversation List */}
      <div
        className={cn(
          'w-full md:w-80 border-b md:border-b-0 md:border-r border-black/[0.07] dark:border-white/[0.09] flex flex-col bg-[#fbfbfd] dark:bg-[#161618]',
          activeConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">
              Messages
            </h2>
            <span className="text-[12px] text-[#8e8e93]">
              @{currentUser.displayUsername || currentUser.username}
            </span>
          </div>

          {/* Native iOS Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8e8e93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search username…"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full h-8.5 pl-9 pr-8 rounded-[9px] bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-[13px] text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#007aff]/25"
            />
            {userSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setUserSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#1c1c1e] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {userSearchQuery.trim().length >= 2 && (
            <div className="rounded-[12px] border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1c1c1e] p-1.5 space-y-0.5 max-h-52 overflow-y-auto shadow-sm">
              {isSearchingUsers ? (
                <p className="text-[12px] text-[#8e8e93] p-2 text-center">Searching…</p>
              ) : searchResults.length === 0 ? (
                <p className="text-[12px] text-[#8e8e93] p-2 text-center">
                  No user found for &ldquo;{userSearchQuery}&rdquo;
                </p>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => handleStartConversation(u.username)}
                    className="w-full flex items-center justify-between gap-2.5 p-2 rounded-[9px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <UserAvatar username={u.username} avatarUrl={u.avatarUrl} size="sm" />
                      <span className="text-[13px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                        @{u.username}
                      </span>
                    </div>
                    <span className="text-[12px] font-medium text-[#007aff] dark:text-[#0a84ff]">
                      Message
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isLoadingConversations ? (
            <div className="p-6 text-center text-[13px] text-[#8e8e93]">
              Loading…
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <MessageSquare className="w-6 h-6 mx-auto text-[#8e8e93]" />
              <p className="text-[13px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                No Conversations
              </p>
              <p className="text-[12px] text-[#8e8e93] leading-relaxed">
                Search for a username above to start a conversation or send a vault item.
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
                    'w-full px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-left transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-[#007aff] dark:bg-[#0a84ff] text-white'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#1c1c1e] dark:text-[#f5f5f7]'
                  )}
                >
                  <UserAvatar
                    username={conv.peer.username}
                    avatarUrl={conv.peer.avatarUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          'text-[14px] font-semibold truncate',
                          isSelected ? 'text-white' : 'text-[#1c1c1e] dark:text-[#f5f5f7]'
                        )}
                      >
                        @{conv.peer.username}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] tabular-nums shrink-0',
                          isSelected ? 'text-white/80' : 'text-[#8e8e93]'
                        )}
                      >
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-[12px] truncate mt-0.5',
                        isSelected ? 'text-white/85' : 'text-[#8e8e93]'
                      )}
                    >
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
          'flex-1 flex flex-col min-h-[520px] bg-white dark:bg-[#1c1c1e]',
          !activeConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-11 h-11 rounded-full bg-[#767680]/[0.1] dark:bg-[#767680]/[0.2] flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-[#8e8e93]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
              No Conversation Selected
            </h3>
            <p className="text-[13px] text-[#8e8e93] max-w-xs mt-1 leading-relaxed">
              Choose a conversation from the sidebar or search for a username to begin messaging.
            </p>
          </div>
        ) : (
          <>
            {/* Conversation Header */}
            <div className="h-14 px-4 sm:px-5 border-b border-black/[0.07] dark:border-white/[0.09] ios-material flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 rounded-[8px] text-[#007aff] dark:text-[#0a84ff]"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <UserAvatar
                  username={activeConversation.peer.username}
                  avatarUrl={activeConversation.peer.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate leading-tight">
                    @{activeConversation.peer.username}
                  </h3>
                  <p className="text-[11px] text-[#8e8e93] leading-tight mt-0.5">
                    {activeConversation.isBlockedByMe
                      ? 'Blocked'
                      : activeConversation.hasBlockedMe
                      ? 'Unavailable'
                      : 'Direct Message'}
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
                    Send &ldquo;{pendingShareItem.title.slice(0, 16)}&rdquo;
                  </Button>
                )}

                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className={cn(
                    'px-2.5 py-1 rounded-[8px] text-[12px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer',
                    activeConversation.isBlockedByMe
                      ? 'bg-[#ff9500]/15 text-[#ff9500]'
                      : 'text-[#6c6c70] dark:text-[#98989d] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                  )}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{activeConversation.isBlockedByMe ? 'Unblock' : 'Block'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteConversation}
                  className="p-1.5 rounded-[8px] text-[#8e8e93] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors cursor-pointer"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area (iMessage Canvas) */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-2.5 bg-white dark:bg-[#000000]">
              {isLoadingMessages ? (
                <p className="text-[13px] text-center text-[#8e8e93] py-8">
                  Loading messages…
                </p>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 space-y-1">
                  <p className="text-[13px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                    Message @{activeConversation.peer.username}
                  </p>
                  <p className="text-[12px] text-[#8e8e93]">
                    Send a text message or tap the attachment icon to share an item from your vault.
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
                        'flex flex-col max-w-[82%] sm:max-w-[68%]',
                        isMine ? 'ml-auto items-end' : 'mr-auto items-start'
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-[18px] px-3.5 py-2 text-[14px] leading-snug',
                          isMine
                            ? 'bg-[#007aff] dark:bg-[#0a84ff] text-white rounded-br-[4px]'
                            : 'bg-[#e9e9eb] dark:bg-[#262629] text-[#1c1c1e] dark:text-[#f5f5f7] rounded-bl-[4px]'
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
                              <div
                                className={cn(
                                  'flex items-center gap-2.5 p-2.5 rounded-[12px]',
                                  isMine
                                    ? 'bg-white/15 text-white/90'
                                    : 'bg-black/[0.05] dark:bg-white/[0.06] text-[#8e8e93]'
                                )}
                              >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <div>
                                  <p className="text-[12px] font-semibold">
                                    {att.isExpired ? 'Attachment Expired' : 'Unavailable'}
                                  </p>
                                  <p className="text-[11px] opacity-80">
                                    This item has expired and been removed.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  'p-2.5 rounded-[12px] space-y-2',
                                  isMine
                                    ? 'bg-white/15 text-white'
                                    : 'bg-white dark:bg-[#1c1c1e] text-[#1c1c1e] dark:text-[#f5f5f7]'
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
                                    <span className="text-[13px] font-semibold truncate">
                                      {att.filename || att.title}
                                    </span>
                                  </div>

                                  {att.fileSize ? (
                                    <span className="text-[11px] font-mono tabular-nums opacity-80 shrink-0">
                                      {formatBytes(att.fileSize)}
                                    </span>
                                  ) : null}
                                </div>

                                {att.type === 'text' && att.textContent && (
                                  <p className="text-[12px] opacity-90 line-clamp-4 whitespace-pre-wrap font-mono bg-black/10 p-2 rounded-[8px]">
                                    {att.textContent}
                                  </p>
                                )}

                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  {expStatus && (
                                    <span className="inline-flex items-center gap-1 text-[11px] tabular-nums opacity-80">
                                      <Clock className="w-3 h-3" />
                                      <span>{expStatus.label}</span>
                                    </span>
                                  )}

                                  {att.downloadUrl && (
                                    <a
                                      href={`${att.downloadUrl}?download=true`}
                                      download={att.filename || att.title}
                                      className={cn(
                                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-semibold transition-colors',
                                        isMine
                                          ? 'bg-white text-[#007aff]'
                                          : 'bg-[#007aff] text-white'
                                      )}
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Save</span>
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
                                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-semibold cursor-pointer',
                                        isMine
                                          ? 'bg-white text-[#007aff]'
                                          : 'bg-[#007aff] text-white'
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
                                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-semibold',
                                        isMine
                                          ? 'bg-white text-[#007aff]'
                                          : 'bg-[#007aff] text-white'
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
                              <p className="text-[13px] whitespace-pre-wrap">{msg.textContent}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-[#8e8e93] mt-1 px-1 tabular-nums">
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

            {/* iMessage Input Bar */}
            {activeConversation.isBlockedByMe || activeConversation.hasBlockedMe ? (
              <div className="p-3.5 border-t border-black/[0.07] dark:border-white/[0.09] text-center text-[12px] text-[#8e8e93]">
                Messaging is disabled for this conversation.
              </div>
            ) : (
              <form
                onSubmit={handleSendText}
                className="p-3 border-t border-black/[0.07] dark:border-white/[0.09] bg-white dark:bg-[#1c1c1e] flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setShowAttachmentModal(true)}
                  className="w-8.5 h-8.5 rounded-full bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-[#6c6c70] dark:text-[#ebebf5]/80 hover:text-[#007aff] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Share from Vault"
                  aria-label="Attach vault item"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center bg-[#767680]/[0.08] dark:bg-[#767680]/[0.22] border border-black/[0.08] dark:border-white/[0.1] rounded-full pl-4 pr-1.5 py-1">
                  <input
                    type="text"
                    placeholder={`iMessage @${activeConversation.peer.username}…`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#8e8e93] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || isSending}
                    className="w-7 h-7 rounded-full bg-[#007aff] dark:bg-[#0a84ff] text-white flex items-center justify-center disabled:opacity-35 transition-opacity cursor-pointer shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* SHEET: Select Existing Vault Item to Share */}
      {showAttachmentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[4px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden ios-sheet-shadow animate-ios-sheet">
            <div className="px-5 py-3.5 border-b border-black/[0.07] dark:border-white/[0.09] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                  Share from Vault
                </h3>
                <p className="text-[12px] text-[#8e8e93]">
                  Shares a direct reference without duplicating storage quota.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="w-7 h-7 rounded-full bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] flex items-center justify-center text-[#6c6c70] hover:text-[#1c1c1e] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {activeShareableItems.length === 0 ? (
                <p className="text-[13px] text-[#8e8e93] text-center py-8">
                  Your vault has no active items. Add a file or note in Vault first.
                </p>
              ) : (
                activeShareableItems.map((item) => {
                  const exp = formatExpirationStatus(item.expiresAt);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-[12px] border border-black/[0.07] dark:border-white/[0.1] hover:border-[#007aff] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[#8e8e93] mt-0.5 tabular-nums">
                          <span className="capitalize">{item.type}</span>
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
                        Send
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
