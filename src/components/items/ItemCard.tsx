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
      toast.info('Could not copy automatically');
    }
  };

  const getTypeIcon = () => {
    switch (item.type) {
      case 'text':
        return (
          <div className="w-8 h-8 rounded-[9px] bg-[#ff9500]/12 dark:bg-[#ff9f0a]/18 text-[#ff9500] dark:text-[#ff9f0a] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'image':
        return (
          <div className="w-8 h-8 rounded-[9px] bg-[#34c759]/12 dark:bg-[#30d158]/18 text-[#34c759] dark:text-[#30d158] flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
        );
      case 'video':
        return (
          <div className="w-8 h-8 rounded-[9px] bg-[#af52de]/12 dark:bg-[#bf5af2]/18 text-[#af52de] dark:text-[#bf5af2] flex items-center justify-center shrink-0">
            <Film className="w-4 h-4" />
          </div>
        );
      case 'link':
        return (
          <div className="w-8 h-8 rounded-[9px] bg-[#5856d6]/12 dark:bg-[#5e5ce6]/18 text-[#5856d6] dark:text-[#5e5ce6] flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-[9px] bg-[#007aff]/12 dark:bg-[#0a84ff]/18 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div
      onClick={() => !expInfo.isExpired && onOpenDetail(item)}
      className={cn(
        'group relative ios-card rounded-[16px] hover:border-black/[0.2] dark:hover:border-white/[0.24] transition-all duration-150 p-4 flex flex-col justify-between cursor-pointer active:scale-[0.995]',
        expInfo.isExpired && 'opacity-55 pointer-events-none'
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {getTypeIcon()}
            <div className="min-w-0">
              <h4 className="text-[14.5px] font-semibold tracking-[-0.012em] text-[#1c1c1e] dark:text-[#f5f5f7] truncate leading-snug">
                {item.title}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] tabular-nums',
                    expInfo.isUrgent
                      ? 'text-[#ff9500] dark:text-[#ff9f0a] font-medium'
                      : 'text-[#8e8e93]'
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
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {!inTrash && (
              <button
                type="button"
                onClick={() => onToggleFavourite(item)}
                className={cn(
                  'w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors cursor-pointer',
                  item.isFavourite
                    ? 'text-[#ffcc00] dark:text-[#ffd60a] bg-[#ffcc00]/12'
                    : 'text-[#8e8e93] hover:text-[#ffcc00] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
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
                className="w-7 h-7 rounded-[8px] flex items-center justify-center bg-[#767680]/[0.08] dark:bg-[#767680]/[0.2] text-[#6c6c70] dark:text-[#ebebf5]/80 hover:text-[#007aff] dark:hover:text-[#0a84ff] transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[#34c759]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Previews */}
        {item.type === 'text' && item.textContent && (
          <p className="text-[13px] text-[#6c6c70] dark:text-[#98989d] line-clamp-3 leading-relaxed mb-3 whitespace-pre-wrap">
            {item.textContent}
          </p>
        )}

        {item.type === 'image' && item.file?.downloadUrl && !expInfo.isExpired && (
          <div className="relative w-full h-36 rounded-[12px] overflow-hidden bg-[#f2f2f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] mb-3">
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
          <div className="relative w-full h-28 rounded-[12px] overflow-hidden bg-[#1c1c1e] flex items-center justify-center text-white mb-3">
            <Film className="w-6 h-6 text-white/75" />
            <span className="absolute bottom-2 right-2 text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-[6px] bg-black/65">
              {formatBytes(item.file.fileSize)}
            </span>
          </div>
        )}

        {item.type === 'link' && item.url && (
          <div className="mb-3 p-2.5 rounded-[10px] bg-[#767680]/[0.06] dark:bg-[#767680]/[0.16] text-[12.5px]">
            <div className="flex items-center gap-1.5 text-[#007aff] dark:text-[#0a84ff] font-medium truncate">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.url}</span>
            </div>
            {item.note && (
              <p className="text-[#6c6c70] dark:text-[#98989d] mt-1 line-clamp-2 text-[12px]">
                {item.note}
              </p>
            )}
          </div>
        )}

        {item.type === 'file' && item.file && (
          <div className="mb-3 p-2.5 rounded-[10px] bg-[#767680]/[0.06] dark:bg-[#767680]/[0.16] flex items-center justify-between gap-2 text-[12.5px]">
            <span className="text-[#1c1c1e] dark:text-[#f5f5f7] font-medium truncate">
              {item.file.sanitizedFilename || item.file.originalFilename}
            </span>
            <span className="text-[#8e8e93] font-mono tabular-nums text-[11px] shrink-0">
              {formatBytes(item.file.fileSize)}
            </span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11.5px] text-[#8e8e93] tabular-nums">
        <span>{formatDate(item.createdAt)}</span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {inTrash ? (
            <>
              <button
                type="button"
                onClick={() => onRestore && onRestore(item)}
                className="p-1.5 rounded-[7px] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#007aff] dark:hover:text-[#0a84ff] cursor-pointer"
                title="Restore item"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item, true)}
                className="p-1.5 rounded-[7px] hover:bg-[#ff3b30]/10 hover:text-[#ff3b30] cursor-pointer"
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
                  className="p-1.5 rounded-[7px] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#007aff] dark:hover:text-[#0a84ff] cursor-pointer"
                  title="Share in Chat"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}

              {item.file?.downloadUrl && !expInfo.isExpired && (
                <a
                  href={`${item.file.downloadUrl}?download=true`}
                  download={item.file.sanitizedFilename || item.file.originalFilename}
                  className="p-1.5 rounded-[7px] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#007aff] dark:hover:text-[#0a84ff]"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}

              <button
                type="button"
                onClick={() => onDelete(item, true)}
                className="p-1.5 rounded-[7px] hover:bg-[#ff3b30]/10 hover:text-[#ff3b30] cursor-pointer"
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
