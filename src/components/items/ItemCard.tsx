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
  inTrash?: boolean;
}

export function formatExpirationStatus(expiresAt?: string | null): {
  label: string;
  isUrgent: boolean;
  isExpired: boolean;
} {
  if (!expiresAt) {
    return { label: '24h lifetime', isUrgent: false, isExpired: false };
  }
  const expMs = new Date(expiresAt).getTime();
  const diffMs = expMs - Date.now();
  if (diffMs <= 0) {
    return { label: 'Expired', isUrgent: true, isExpired: true };
  }

  const mins = Math.ceil(diffMs / 60000);
  if (mins < 60) {
    return { label: `Expires in ${mins}m`, isUrgent: true, isExpired: false };
  }
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) {
    return {
      label: `Expires in ${hours}h ${Math.floor((diffMs % 3600000) / 60000)}m`,
      isUrgent: hours < 2,
      isExpired: false,
    };
  }
  const days = Math.floor(hours / 24);
  return {
    label: `Expires in ${days}d ${hours % 24}h`,
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
  inTrash = false,
}: ItemCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const expInfo = useMemo(() => formatExpirationStatus(item.expiresAt), [item.expiresAt]);

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
      toast.info('Could not copy automatically. Please copy manually.');
    }
  };

  const getTypeIcon = () => {
    switch (item.type) {
      case 'text':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'image':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
        );
      case 'video':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Film className="w-4 h-4" />
          </div>
        );
      case 'link':
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div
      onClick={() => !expInfo.isExpired && onOpenDetail(item)}
      className={cn(
        'group relative bg-white dark:bg-[#141417] rounded-2xl border border-[#e5e5ea] dark:border-[#27272a] hover:border-[#0071e3]/50 transition-all p-4 flex flex-col justify-between cursor-pointer',
        expInfo.isExpired && 'opacity-60 pointer-events-none'
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {getTypeIcon()}
            <h4 className="text-sm font-semibold text-[#1d1d1f] dark:text-white truncate">
              {item.title}
            </h4>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {!inTrash && (
              <button
                type="button"
                onClick={() => onToggleFavourite(item)}
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer',
                  item.isFavourite
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                    : 'text-[#86868b] hover:text-amber-500'
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
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#f5f5f7] dark:bg-[#1c1c21] text-[#1d1d1f] dark:text-white hover:text-[#0071e3] transition-colors cursor-pointer"
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

        {/* Expiration Badge */}
        <div className="mb-2.5 flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium',
              expInfo.isUrgent
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                : 'bg-[#f5f5f7] dark:bg-[#1c1c21] text-[#6e6e73] dark:text-[#a1a1aa]'
            )}
            title={
              item.expiresAt
                ? `Expires ${new Date(item.expiresAt).toLocaleString()}`
                : undefined
            }
          >
            <Clock className="w-3 h-3" />
            <span>{expInfo.label}</span>
          </span>
        </div>

        {/* Content Previews */}
        {item.type === 'text' && item.textContent && (
          <p className="text-xs text-[#6e6e73] dark:text-[#a1a1aa] line-clamp-3 leading-relaxed mb-3 whitespace-pre-wrap">
            {item.textContent}
          </p>
        )}

        {item.type === 'image' && item.file?.downloadUrl && !expInfo.isExpired && (
          <div className="relative w-full h-36 rounded-xl overflow-hidden bg-[#f5f5f7] dark:bg-[#1c1c21] border border-[#e5e5ea] dark:border-[#27272a] mb-3">
            <Image
              src={item.file.downloadUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 300px"
              unoptimized
            />
          </div>
        )}

        {item.type === 'video' && item.file && (
          <div className="relative w-full h-28 rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center text-white mb-3">
            <Film className="w-6 h-6 text-white/80" />
            <span className="absolute bottom-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded bg-black/60">
              {formatBytes(item.file.fileSize)}
            </span>
          </div>
        )}

        {item.type === 'link' && item.url && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1c21] text-xs">
            <div className="flex items-center gap-1.5 text-[#0071e3] font-medium truncate">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.url}</span>
            </div>
            {item.note && (
              <p className="text-[#6e6e73] dark:text-[#a1a1aa] mt-1 line-clamp-2">
                {item.note}
              </p>
            )}
          </div>
        )}

        {item.type === 'file' && item.file && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1c21] flex items-center justify-between gap-2 text-xs">
            <span className="text-[#1d1d1f] dark:text-white font-medium truncate">
              {item.file.sanitizedFilename || item.file.originalFilename}
            </span>
            <span className="text-[#86868b] font-mono text-[11px] shrink-0">
              {formatBytes(item.file.fileSize)}
            </span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-2.5 border-t border-[#f0f0f2] dark:border-[#27272a] flex items-center justify-between text-[11px] text-[#86868b]">
        <span>{formatDate(item.createdAt)}</span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {inTrash ? (
            <>
              <button
                type="button"
                onClick={() => onRestore && onRestore(item)}
                className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c21] hover:text-[#0071e3] cursor-pointer"
                title="Restore item"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item, true)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 cursor-pointer"
                title="Delete permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {onShareInChat && !expInfo.isExpired && (
                <button
                  type="button"
                  onClick={() => onShareInChat(item)}
                  className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c21] hover:text-[#0071e3] cursor-pointer"
                  title="Share in Chat"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}

              {item.file?.downloadUrl && !expInfo.isExpired && (
                <a
                  href={`${item.file.downloadUrl}?download=true`}
                  download={item.file.sanitizedFilename || item.file.originalFilename}
                  className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c21] hover:text-[#0071e3]"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}

              <button
                type="button"
                onClick={() => onDelete(item, true)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 cursor-pointer"
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
