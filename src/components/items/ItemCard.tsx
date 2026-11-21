'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  FileCode,
  Link2,
  Copy,
  Check,
  Star,
  Trash2,
  RotateCcw,
  ExternalLink,
  Download,
  Clock,
  Share2,
  FolderInput,
  Music,
  Play,
} from 'lucide-react';
import { Item } from '@/lib/types';
import { cn, formatBytes, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import Image from 'next/image';

interface ItemCardProps {
  item: Item;
  onOpenDetail: (item: Item) => void;
  onToggleFavourite: (item: Item) => void;
  onDelete: (item: Item, permanent?: boolean) => void;
  onRestore?: (item: Item) => void;
  onShareInChat?: (item: Item) => void;
  onShareLink?: (item: Item) => void;
  onMove?: (item: Item) => void;
  inTrash?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (item: Item, e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, item: Item) => void;
  onDragEnd?: (e: React.DragEvent, item: Item) => void;
}

export function formatExpirationStatus(
  expiresAt?: string | null,
  purgeAt?: string | null,
  inTrash = false
): {
  label: string;
  isUrgent: boolean;
  isExpired: boolean;
  isPermanent?: boolean;
} {
  if (inTrash) {
    const purgeMs = purgeAt ? new Date(purgeAt).getTime() : Date.now() + 30 * 86400000;
    const daysLeft = Math.max(1, Math.ceil((purgeMs - Date.now()) / 86400000));
    return {
      label: `Purges in ${daysLeft}d`,
      isUrgent: daysLeft <= 3,
      isExpired: false,
      isPermanent: false,
    };
  }

  if (!expiresAt) {
    return { label: 'Permanent', isUrgent: false, isExpired: false, isPermanent: true };
  }
  const expMs = new Date(expiresAt).getTime();
  const diffMs = expMs - Date.now();
  if (diffMs <= 0) {
    return { label: 'Expired', isUrgent: true, isExpired: true };
  }

  const mins = Math.ceil(diffMs / 60000);
  if (mins < 60) {
    return { label: `${mins}m left`, isUrgent: true, isExpired: false };
  }
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) {
    return {
      label: `${hours}h ${Math.floor((diffMs % 3600000) / 60000)}m left`,
      isUrgent: hours < 2,
      isExpired: false,
    };
  }
  const days = Math.floor(hours / 24);
  return {
    label: `${days}d ${hours % 24}h left`,
    isUrgent: false,
    isExpired: false,
  };
}

export function ItemCard({
  item,
  onOpenDetail,
  onToggleFavourite,
  onDelete,
  onRestore,
  onShareInChat,
  onShareLink,
  onMove,
  inTrash = false,
  isSelected = false,
  onToggleSelect,
  onDragStart,
  onDragEnd,
}: ItemCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const thumbnailSrc = item.file?.thumbnailData || item.file?.thumbnailUrl;
  const isPdf =
    item.file?.mimeType === 'application/pdf' ||
    /\.(pdf)$/i.test(item.file?.originalFilename || item.title || '');

  const expInfo = useMemo(
    () => formatExpirationStatus(item.expiresAt, item.purgeAt, inTrash),
    [item.expiresAt, item.purgeAt, inTrash]
  );

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let textToCopy = '';

    if (item.type === 'text') {
      textToCopy = item.textContent || item.title;
    } else if (item.type === 'link') {
      textToCopy = item.url || '';
    } else if (item.file?.downloadUrl) {
      textToCopy = window.location.origin + item.file.downloadUrl;
    } else {
      textToCopy = item.title;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info('Could not copy automatically');
    }
  };

  const getTypeIcon = () => {
    switch (item.type) {
      case 'text':
        return (
          <div className="w-9 h-9 rounded-2xl bg-[#FF8559] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
      case 'image':
        return (
          <div className="w-9 h-9 rounded-2xl bg-[#38BDF8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ImageIcon className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
      case 'video':
        return (
          <div className="w-9 h-9 rounded-2xl bg-[#C17BF3] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Film className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
      case 'link':
        return (
          <div className="w-9 h-9 rounded-2xl bg-[#FBBF24] text-black flex items-center justify-center shrink-0 shadow-xs">
            <Link2 className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-2xl bg-[#CDFF5D] text-black flex items-center justify-center shrink-0 shadow-xs">
            <FileCode className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
    }
  };

  return (
    <div
      draggable={!inTrash}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ itemId: item.id }));
        e.dataTransfer.setData('application/x-quickvault-item', item.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(e, item);
      }}
      onDragEnd={(e) => {
        onDragEnd?.(e, item);
      }}
      onClick={() => !expInfo.isExpired && onOpenDetail(item)}
      className={cn(
        'group relative rounded-[24px] border-2 bg-white dark:bg-[#18181B] transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between cursor-pointer active:scale-[0.99] shadow-xs hover:shadow-md select-none',
        isSelected
          ? 'border-[#007aff] ring-2 ring-[#007aff]/30 bg-[#007aff]/5 dark:bg-[#007aff]/10'
          : 'border-neutral-900/10 dark:border-white/10 hover:border-neutral-900/30 dark:hover:border-white/30',
        expInfo.isExpired && 'opacity-50 pointer-events-none'
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {onToggleSelect && !inTrash ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(item, e);
                }}
                className={cn(
                  'w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 mr-0.5',
                  isSelected
                    ? 'bg-[#007aff] border-[#007aff] text-white shadow-xs'
                    : 'border-neutral-300 dark:border-white/20 hover:border-[#007aff] opacity-0 group-hover:opacity-100'
                )}
                aria-label="Select item"
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            ) : null}
            {getTypeIcon()}
            <div className="min-w-0">
              <h4 className="text-[15px] font-bold tracking-tight text-[#111111] dark:text-white truncate leading-snug">
                {item.title}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full tabular-nums',
                    expInfo.isPermanent
                      ? 'bg-[#CDFF5D] text-black font-black'
                      : expInfo.isUrgent
                      ? 'bg-[#FC6742] text-white'
                      : 'bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400'
                  )}
                  title={
                    inTrash
                      ? `Items in trash are automatically purged after 30 days`
                      : item.expiresAt
                      ? `Expires ${new Date(item.expiresAt).toLocaleString()}`
                      : 'Stored permanently in Vault'
                  }
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>{expInfo.label}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {!inTrash && (
              <button
                type="button"
                onClick={() => onToggleFavourite(item)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer',
                  item.isFavourite
                    ? 'text-amber-500 bg-amber-500/15'
                    : 'text-neutral-400 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-white/10'
                )}
                aria-label={item.isFavourite ? 'Remove favourite' : 'Add favourite'}
              >
                <Star className={cn('w-3.5 h-3.5', item.isFavourite && 'fill-current')} />
              </button>
            )}

            {!inTrash && (item.type === 'text' || item.type === 'link') && (
              <button
                type="button"
                onClick={handleCopy}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Previews */}
        {item.type === 'text' && item.textContent && (
          <p className="text-xs sm:text-[13px] text-neutral-600 dark:text-neutral-400 line-clamp-3 leading-relaxed mb-3.5 whitespace-pre-wrap font-medium">
            {item.textContent}
          </p>
        )}

        {item.type === 'image' && !expInfo.isExpired && (
          <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 mb-3.5 flex items-center justify-center">
            {(thumbnailSrc || item.file?.downloadUrl) && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailSrc || item.file?.downloadUrl}
                alt={item.title}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 text-neutral-400 p-4 text-center">
                <ImageIcon className="w-8 h-8 text-[#38BDF8]" />
                <span className="text-[11px] font-mono font-bold text-neutral-600 dark:text-neutral-300 truncate max-w-full">
                  {item.file?.sanitizedFilename || item.file?.originalFilename || item.title}
                </span>
                <span className="text-[9px] font-mono uppercase text-neutral-400">
                  {item.file?.fileSize ? formatBytes(item.file.fileSize) : 'Photo'}
                </span>
              </div>
            )}
          </div>
        )}

        {item.type === 'video' && item.file && (
          <div
            onClick={() => onOpenDetail(item)}
            className="group/video relative w-full h-32 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 dark:border-white/10 mb-3.5 flex items-center justify-center cursor-pointer shadow-xs"
          >
            {thumbnailSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailSrc}
                alt=""
                className="w-full h-full object-cover opacity-80 group-hover/video:opacity-95 transition-opacity"
              />
            ) : item.file.downloadUrl && !expInfo.isExpired ? (
              <video
                src={`${item.file.downloadUrl}#t=0.5`}
                preload="metadata"
                muted
                playsInline
                className="w-full h-full object-cover opacity-80 group-hover/video:opacity-95 transition-opacity"
              />
            ) : (
              <Film className="w-8 h-8 text-neutral-500" />
            )}
            <div className="absolute inset-0 bg-black/25 group-hover/video:bg-black/10 transition-colors flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md group-hover/video:scale-110 transition-transform">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
            </div>
            <span className="absolute bottom-2 right-2 text-[10px] font-mono font-bold uppercase tracking-wider tabular-nums px-2 py-0.5 rounded-full bg-black/75 text-white">
              {formatBytes(item.file.fileSize)}
            </span>
          </div>
        )}

        {/* macOS PDF Preview Stage */}
        {item.type === 'file' && isPdf && item.file && (
          <div
            onClick={() => onOpenDetail(item)}
            className="group/pdf relative w-full h-32 rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent dark:from-red-950/30 dark:via-red-900/15 border border-red-500/20 hover:border-red-500/40 mb-3.5 flex flex-col items-center justify-center cursor-pointer transition-all p-3 shadow-xs"
          >
            <div className="w-11 h-11 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-sm mb-1.5 group-hover/pdf:scale-105 transition-transform">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black font-mono tracking-wider text-red-600 dark:text-red-400 uppercase">
              PDF Document
            </span>
            <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
              {formatBytes(item.file.fileSize)}
            </span>
          </div>
        )}

        {item.type === 'file' && !isPdf && item.file && (item.file.mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(item.file.originalFilename)) && (
          <div
            onClick={() => onOpenDetail(item)}
            className="group/audio relative w-full p-3.5 rounded-2xl bg-neutral-900/60 dark:bg-white/5 border border-neutral-200 dark:border-white/10 mb-3.5 flex items-center gap-3 cursor-pointer hover:border-[#CDFF5D]/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#CDFF5D]/10 border border-[#CDFF5D]/20 text-[#CDFF5D] flex items-center justify-center shrink-0 group-hover/audio:scale-105 transition-transform">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {item.file.sanitizedFilename || item.file.originalFilename}
              </p>
              <p className="text-[10px] font-mono text-neutral-400">
                {formatBytes(item.file.fileSize)} • Audio Track
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {item.type === 'link' && item.url && (
          <div className="mb-3.5 p-3 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-900 dark:text-white font-bold truncate">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.url}</span>
            </div>
            {item.note && (
              <p className="text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 text-xs font-medium">
                {item.note}
              </p>
            )}
          </div>
        )}

        {item.type === 'file' && !isPdf && !(item.file && (item.file.mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(item.file.originalFilename))) && item.file && (
          <div className="mb-3.5 p-3 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
            <span className="text-[#111111] dark:text-white font-bold truncate">
              {item.file.sanitizedFilename || item.file.originalFilename}
            </span>
            <span className="text-neutral-400 font-mono text-[10px] font-bold uppercase shrink-0">
              {formatBytes(item.file.fileSize)}
            </span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t-2 border-neutral-900/5 dark:border-white/5 flex items-center justify-between text-[11px] font-mono font-semibold text-neutral-400 tabular-nums">
        <span>{formatDate(item.createdAt)}</span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {inTrash ? (
            <>
              <button
                type="button"
                onClick={() => onRestore && onRestore(item)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white cursor-pointer"
                title="Restore item"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item, true)}
                className="p-1.5 rounded-full hover:bg-red-500/10 hover:text-red-600 cursor-pointer"
                title="Delete permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {onShareLink && !expInfo.isExpired && (
                <button
                  type="button"
                  onClick={() => onShareLink(item)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-[#0071e3] cursor-pointer"
                  title="Create Share Link"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
              )}

              {onShareInChat && !expInfo.isExpired && (
                <button
                  type="button"
                  onClick={() => onShareInChat(item)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white cursor-pointer"
                  title="Share in Chat"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}

              {item.file?.downloadUrl && !expInfo.isExpired && (
                <a
                  href={`${item.file.downloadUrl}?download=true`}
                  download={item.file.sanitizedFilename || item.file.originalFilename}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}

              {onMove && (
                <button
                  type="button"
                  onClick={() => onMove(item)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white cursor-pointer"
                  title="Move to folder"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onDelete(item, true)}
                className="p-1.5 rounded-full hover:bg-red-500/10 hover:text-red-600 cursor-pointer"
                title="Delete permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
