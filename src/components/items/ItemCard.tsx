'use client';

import React, { useState } from 'react';
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
  inTrash?: boolean;
}

export function ItemCard({
  item,
  onOpenDetail,
  onToggleFavourite,
  onDelete,
  onRestore,
  inTrash = false,
}: ItemCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Fast clipboard copy action
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
        return <FileText className="w-4 h-4 text-[#0071e3]" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-[#34c759]" />;
      case 'video':
        return <Film className="w-4 h-4 text-[#ff9500]" />;
      case 'link':
        return <Link2 className="w-4 h-4 text-[#5856d6]" />;
      default:
        return <FileCode className="w-4 h-4 text-[#af52de]" />;
    }
  };

  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="group relative bg-white dark:bg-[#1c1c1e] rounded-2xl border border-[#e5e5ea] dark:border-[#38383a] hover:border-[#d1d1d6] dark:hover:border-[#48484a] shadow-xs hover:shadow-md transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between cursor-pointer select-none"
    >
      {/* Top Header: Type icon, title, favourite */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-center shrink-0">
              {getTypeIcon()}
            </div>
            <h4 className="text-sm font-semibold text-[#1d1d1f] dark:text-white truncate">
              {item.title}
            </h4>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!inTrash && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavourite(item);
                }}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                  item.isFavourite
                    ? 'text-[#ff9500] hover:text-[#ff9500]/80'
                    : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100'
                )}
                aria-label={item.isFavourite ? 'Remove favourite' : 'Add favourite'}
              >
                <Star className={cn('w-4 h-4', item.isFavourite && 'fill-current')} />
              </button>
            )}

            {/* Quick Copy Button */}
            {!inTrash && (item.type === 'text' || item.type === 'link') && (
              <button
                type="button"
                onClick={handleCopy}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-[#f2f2f7] hover:bg-[#e5e5ea] dark:bg-[#2c2c2e] dark:hover:bg-[#38383a] text-zinc-600 dark:text-zinc-200 transition-colors"
                title="Copy text to clipboard"
                aria-label="Copy to clipboard"
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

        {/* Content Preview */}
        {item.type === 'text' && item.textContent && (
          <p className="text-xs text-[#86868b] dark:text-[#98989d] line-clamp-3 leading-relaxed mb-3 font-normal whitespace-pre-wrap">
            {item.textContent}
          </p>
        )}

        {/* Image thumbnail */}
        {item.type === 'image' && item.file?.downloadUrl && (
          <div className="relative w-full h-36 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-3">
            <Image
              src={item.file.downloadUrl}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 100vw, 300px"
              unoptimized
            />
          </div>
        )}

        {/* Video preview representation */}
        {item.type === 'video' && item.file && (
          <div className="relative w-full h-28 rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center text-white mb-3">
            <Film className="w-8 h-8 text-white/70" />
            <span className="absolute bottom-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60">
              {formatBytes(item.file.fileSize)}
            </span>
          </div>
        )}

        {/* Link preview */}
        {item.type === 'link' && item.url && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#f8f8fa] dark:bg-[#252528] text-xs">
            <div className="flex items-center gap-1.5 text-[#0071e3] font-medium truncate">
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.url}</span>
            </div>
            {item.note && (
              <p className="text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                {item.note}
              </p>
            )}
          </div>
        )}

        {/* Generic File display */}
        {item.type === 'file' && item.file && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#f8f8fa] dark:bg-[#252528] flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-300 truncate">
              {item.file.originalFilename}
            </span>
            <span className="text-zinc-400 font-mono text-[11px] shrink-0">
              {formatBytes(item.file.fileSize)}
            </span>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#98989d]"
              >
                #{tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-zinc-400 self-center">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer metadata & actions */}
      <div className="pt-2 border-t border-[#e5e5ea]/50 dark:border-[#38383a]/50 flex items-center justify-between text-[11px] text-[#86868b] dark:text-[#98989d]">
        <span>{formatDate(item.createdAt)}</span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {inTrash ? (
            <>
              <button
                type="button"
                onClick={() => onRestore && onRestore(item)}
                className="p-1 hover:text-[#0071e3] transition-colors"
                title="Restore item"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item, true)}
                className="p-1 hover:text-[#ff3b30] transition-colors"
                title="Delete permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {item.file?.downloadUrl && (
                <a
                  href={item.file.downloadUrl}
                  download={item.file.originalFilename}
                  className="p-1 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => onDelete(item, false)}
                className="p-1 hover:text-[#ff3b30] transition-colors opacity-0 group-hover:opacity-100"
                title="Move to Trash"
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
