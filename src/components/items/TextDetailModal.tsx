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
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e5edf6] dark:border-[#344257]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#65758b] dark:text-[#a4b5ce]">
            <Calendar className="w-3.5 h-3.5 text-[#1677df] dark:text-[#60a5fa]" />
            <span>Saved {formatDate(item.createdAt)}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant={isMonospace ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsMonospace(!isMonospace)}
              className="h-8 px-2.5 text-xs gap-1"
              title="Toggle monospace font for code"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Mono</span>
            </Button>

            <Button
              type="button"
              variant={item.isFavourite ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onToggleFavourite(item)}
              className="h-8 px-2.5 text-xs"
              title="Favourite"
            >
              <Star
                className={cn(
                  'w-3.5 h-3.5',
                  item.isFavourite && 'fill-[#f59e0b] text-[#f59e0b]'
                )}
              />
            </Button>

            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
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
              className="h-8 w-8 p-0 text-[#e11d48] hover:bg-[#fff1f2] dark:hover:bg-[#3e2124]"
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
              className="w-full text-lg font-bold bg-[#fbfdff] dark:bg-[#17263b] border border-[#dfe8f3] dark:border-[#344b65] rounded-xl px-3.5 py-2 text-[#0f172b] dark:text-white focus:outline-none focus:border-[#1677df]"
              placeholder="Note title..."
            />

            <textarea
              rows={12}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className={cn(
                'w-full bg-[#fbfdff] dark:bg-[#17263b] rounded-2xl p-4 text-sm text-[#0f172b] dark:text-[#e9f1fc] focus:outline-none border border-[#dfe8f3] dark:border-[#344b65] focus:border-[#1677df] transition-all resize-y leading-relaxed',
                isMonospace && 'font-mono text-xs leading-6 whitespace-pre'
              )}
            />

            {/* Tag editing */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#eaf4ff] dark:bg-[#203954] text-[#1677df] dark:text-[#78bbff] border border-[#d8e9fb] dark:border-[#344b65]"
                >
                  #{t}
                  <button type="button" onClick={() => removeTag(idx)} className="cursor-pointer">
                    <X className="w-3 h-3 hover:text-[#e11d48]" />
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
                className="text-xs bg-transparent focus:outline-none w-32 text-[#0f172b] dark:text-white"
              />
            </div>
          </div>
        ) : (
          /* Quick Share Reading Layout */
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172b] dark:text-white">
              {item.title}
            </h2>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eaf4ff] dark:bg-[#203954] text-[#1677df] dark:text-[#78bbff] border border-[#d8e9fb] dark:border-[#344b65]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Complete Full Text preserving line breaks & indent */}
            <div
              className={cn(
                'p-5 rounded-2xl bg-[#f8fbff] dark:bg-[#17263b] border border-[#dce8f5] dark:border-[#344b65] text-sm sm:text-base leading-relaxed text-[#0f172b] dark:text-[#e9f1fc] select-text whitespace-pre-wrap overflow-x-auto',
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
