'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  FileCode,
  Link2,
  Star,
  Trash2,
  RotateCcw,
  Download,
  FolderInput,
  Share2,
  ExternalLink,
  Music,
  Check,
} from 'lucide-react';
import { Item } from '@/lib/types';
import { cn, formatBytes, formatDate } from '@/lib/utils';
import { formatExpirationStatus } from './ItemCard';

interface ItemRowProps {
  item: Item;
  isSelected?: boolean;
  onToggleSelect?: (item: Item, e: React.MouseEvent) => void;
  onOpenDetail: (item: Item) => void;
  onToggleFavourite: (item: Item) => void;
  onDelete: (item: Item, permanent?: boolean) => void;
  onRestore?: (item: Item) => void;
  onShareLink?: (item: Item) => void;
  onShareInChat?: (item: Item) => void;
  onMove?: (item: Item) => void;
  inTrash?: boolean;
  onDragStart?: (e: React.DragEvent, item: Item) => void;
  onDragEnd?: (e: React.DragEvent, item: Item) => void;
}

export function ItemRow({
  item,
  isSelected = false,
  onToggleSelect,
  onOpenDetail,
  onToggleFavourite,
  onDelete,
  onRestore,
  onShareLink,
  onShareInChat,
  onMove,
  inTrash = false,
  onDragStart,
  onDragEnd,
}: ItemRowProps) {
  const [imgError, setImgError] = useState(false);

  const expInfo = useMemo(
    () => formatExpirationStatus(item.expiresAt, item.purgeAt, inTrash),
    [item.expiresAt, item.purgeAt, inTrash]
  );

  const isPdf =
    item.file?.mimeType === 'application/pdf' ||
    /\.(pdf)$/i.test(item.file?.originalFilename || item.title || '');

  const isAudio =
    (item.file?.mimeType && item.file.mimeType.startsWith('audio/')) ||
    /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(item.file?.originalFilename || '');

  const thumbnailSrc = item.file?.thumbnailData || item.file?.thumbnailUrl;

  const getKindLabel = () => {
    if (item.type === 'text') return 'Note / PlainText';
    if (item.type === 'link') return 'Web Link';
    if (item.type === 'image') return 'Photo';
    if (item.type === 'video') return 'Video';
    if (isPdf) return 'PDF Document';
    if (isAudio) return 'Audio File';
    return item.file?.mimeType || 'Document';
  };

  const getTinyIcon = () => {
    if (item.type === 'image') {
      if (thumbnailSrc && !imgError) {
        return (
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10 relative bg-neutral-100 dark:bg-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailSrc}
              alt=""
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          </div>
        );
      }
      return (
        <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center shrink-0">
          <ImageIcon className="w-4 h-4" />
        </div>
      );
    }
    if (item.type === 'video') {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#C17BF3]/15 text-[#9333ea] dark:text-[#c084fc] flex items-center justify-center shrink-0">
          <Film className="w-4 h-4" />
        </div>
      );
    }
    if (isPdf) {
      return (
        <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    if (isAudio) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#CDFF5D]/20 text-emerald-600 dark:text-[#CDFF5D] flex items-center justify-center shrink-0">
          <Music className="w-4 h-4" />
        </div>
      );
    }
    if (item.type === 'link') {
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Link2 className="w-4 h-4" />
        </div>
      );
    }
    if (item.type === 'text') {
      return (
        <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0">
        <FileCode className="w-4 h-4" />
      </div>
    );
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
      onClick={() => onOpenDetail(item)}
      className={cn(
        'group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-transparent transition-all cursor-pointer select-none text-xs',
        isSelected
          ? 'bg-[#007aff]/10 border-[#007aff]/30 dark:bg-[#007aff]/20 dark:border-[#007aff]/40'
          : 'hover:bg-neutral-100/80 dark:hover:bg-white/5',
        expInfo.isExpired && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Selection checkbox + Icon + Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onToggleSelect && !inTrash && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item, e);
            }}
            className={cn(
              'w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0',
              isSelected
                ? 'bg-[#007aff] border-[#007aff] text-white shadow-xs'
                : 'border-neutral-300 dark:border-white/20 hover:border-[#007aff] opacity-0 group-hover:opacity-100'
            )}
            aria-label="Select item"
          >
            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
        )}

        {getTinyIcon()}

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900 dark:text-white truncate text-[13px] leading-tight">
            {item.title}
          </p>
          <p className="text-[11px] text-neutral-400 font-mono truncate mt-0.5 sm:hidden">
            {getKindLabel()} · {item.file?.fileSize ? formatBytes(item.file.fileSize) : 'Text/Link'}
          </p>
        </div>
      </div>

      {/* Kind (Finder column) */}
      <div className="hidden sm:block w-28 text-neutral-500 dark:text-neutral-400 truncate text-[12px] shrink-0 font-medium">
        {getKindLabel()}
      </div>

      {/* File Size */}
      <div className="hidden md:block w-20 text-neutral-500 dark:text-neutral-400 font-mono text-[11px] text-right shrink-0">
        {item.file?.fileSize ? formatBytes(item.file.fileSize) : '—'}
      </div>

      {/* Date */}
      <div className="hidden lg:block w-28 text-neutral-400 font-mono text-[11px] text-right shrink-0">
        {formatDate(item.createdAt)}
      </div>

      {/* Expiration badge */}
      <div className="w-24 text-right shrink-0">
        <span
          className={cn(
            'inline-block font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full tabular-nums',
            expInfo.isPermanent
              ? 'bg-[#CDFF5D] text-black font-black'
              : expInfo.isUrgent
              ? 'bg-[#FC6742] text-white'
              : 'bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400'
          )}
        >
          {expInfo.label}
        </span>
      </div>

      {/* Row quick actions */}
      <div
        className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {!inTrash && (
          <button
            type="button"
            onClick={() => onToggleFavourite(item)}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer',
              item.isFavourite
                ? 'text-amber-500 bg-amber-500/10'
                : 'text-neutral-400 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-white/10'
            )}
            title={item.isFavourite ? 'Unstar' : 'Star'}
          >
            <Star className={cn('w-3.5 h-3.5', item.isFavourite && 'fill-current')} />
          </button>
        )}

        {!inTrash && item.file?.downloadUrl && (
          <a
            href={item.file.downloadUrl}
            download={item.file.originalFilename}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}

        {!inTrash && onMove && (
          <button
            type="button"
            onClick={() => onMove(item)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Move to Folder"
          >
            <FolderInput className="w-3.5 h-3.5" />
          </button>
        )}

        {inTrash ? (
          <>
            <button
              type="button"
              onClick={() => onRestore?.(item)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Restore"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item, true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Permanently Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
