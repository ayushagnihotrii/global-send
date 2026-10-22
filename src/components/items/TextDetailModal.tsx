'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Star,
  Trash2,
  Edit3,
  Save,
  X,
  Code,
  Calendar,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Item } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

interface TextDetailModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Item) => void;
  onDelete: (item: Item) => void;
  onToggleFavourite: (item: Item) => void;
}

export function TextDetailModal({
  item,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onToggleFavourite,
}: TextDetailModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMonospace, setIsMonospace] = useState(false);

  // Edit fields
  const [title, setTitle] = useState(item?.title || '');
  const [textContent, setTextContent] = useState(item?.textContent || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(item?.tags || []);

  React.useEffect(() => {
    if (item) {
      setTitle(item.title);
      setTextContent(item.textContent || '');
      setTags(item.tags || []);
      setIsEditing(false);
    }
  }, [item]);

  if (!item) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(item.textContent || item.title);
      setCopied(true);
      toast.success('Question copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info('Could not copy automatically');
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || item.title,
          textContent,
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update note');
        return;
      }

      toast.success('Updated successfully');
      onUpdate(data.item);
      setIsEditing(false);
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = (val: string) => {
    const cleaned = val.trim().replace(/^#/, '');
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const removeTag = (idx: number) => {
    setTags(tags.filter((_, i) => i !== idx));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="3xl">
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]/60 dark:border-[#38383a]/60">
          <div className="flex items-center gap-2 text-xs text-[#86868b] dark:text-[#98989d]">
            <Calendar className="w-3.5 h-3.5" />
            <span>Saved {formatDate(item.createdAt)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsMonospace(!isMonospace)}
              className={cn(
                'h-8 px-2.5 text-xs gap-1',
                isMonospace && 'bg-[#0071e3]/10 text-[#0071e3]'
              )}
              title="Toggle monospace font for code"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Mono</span>
            </Button>

            <Button
              type="button"
              variant={item.isFavourite ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onToggleFavourite(item)}
              className="h-8 px-2.5 text-xs"
              title="Favourite"
            >
              <Star
                className={cn(
                  'w-3.5 h-3.5',
                  item.isFavourite && 'fill-[#ff9500] text-[#ff9500]'
                )}
              />
            </Button>

            {!isEditing ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                isLoading={isSaving}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCopyText}
              className="h-8 px-3 text-xs gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete(item);
                onClose();
              }}
              className="h-8 w-8 p-0 text-[#ff3b30] hover:bg-red-50 dark:hover:bg-red-950/40"
              title="Move to trash"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content View / Edit */}
        {isEditing ? (
          <div className="space-y-3.5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg font-bold bg-transparent border-b border-zinc-200 dark:border-zinc-700 pb-2 focus:outline-none focus:border-[#0071e3]"
              placeholder="Note title..."
            />

            <textarea
              rows={12}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className={cn(
                'w-full bg-[#f8f8fa] dark:bg-[#252528] rounded-2xl p-4 text-sm text-[#1d1d1f] dark:text-white focus:outline-none border border-transparent focus:border-[#0071e3] transition-all resize-y leading-relaxed',
                isMonospace && 'font-mono text-xs leading-5 whitespace-pre'
              )}
            />

            {/* Tag editing */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#e5e5ea] dark:bg-[#2c2c2e]"
                >
                  #{t}
                  <button type="button" onClick={() => removeTag(idx)}>
                    <X className="w-3 h-3 text-zinc-400 hover:text-red-500" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag + Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                className="text-xs bg-transparent focus:outline-none w-32 text-[#1d1d1f] dark:text-white"
              />
            </div>
          </div>
        ) : (
          /* Apple Notes Comfortable Reading Layout */
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-white">
              {item.title}
            </h2>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#98989d]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Complete Full Text preserving line breaks & indent */}
            <div
              className={cn(
                'p-5 rounded-2xl bg-[#f8f8fa] dark:bg-[#252528] border border-[#e5e5ea]/50 dark:border-[#38383a]/50 text-sm sm:text-base leading-relaxed text-[#1d1d1f] dark:text-white select-text whitespace-pre-wrap overflow-x-auto',
                isMonospace && 'font-mono text-xs sm:text-sm whitespace-pre'
              )}
            >
              {item.textContent || 'No text content.'}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
