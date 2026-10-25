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
      toast.success('Copied to clipboard');
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

      toast.success('Note updated');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Note" maxWidth="3xl">
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/[0.07] dark:border-white/[0.09]">
          <div className="flex items-center gap-1.5 text-[12px] text-[#8e8e93] tabular-nums">
            <Calendar className="w-3.5 h-3.5 text-[#ff9500]" />
            <span>{formatDate(item.createdAt)}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant={isMonospace ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsMonospace(!isMonospace)}
              title="Toggle monospace font"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Monospace</span>
            </Button>

            <Button
              type="button"
              variant={item.isFavourite ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onToggleFavourite(item)}
              title="Favourite"
            >
              <Star
                className={cn(
                  'w-3.5 h-3.5',
                  item.isFavourite && 'fill-[#ffcc00] text-[#ffcc00]'
                )}
              />
            </Button>

            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
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
              >
                <Save className="w-3.5 h-3.5" />
                <span>Done</span>
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCopyText}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                onDelete(item);
                onClose();
              }}
              className="w-8 h-8 text-[#ff3b30] hover:bg-[#ff3b30]/10"
              title="Move to Recently Deleted"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content View / Edit */}
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[18px] font-bold tracking-[-0.02em] bg-[#767680]/[0.08] dark:bg-[#767680]/[0.24] rounded-[10px] px-3.5 py-2 text-[#1c1c1e] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
              placeholder="Note title…"
            />

            <textarea
              rows={12}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className={cn(
                'w-full bg-[#767680]/[0.07] dark:bg-[#767680]/[0.18] rounded-[12px] p-4 text-[14.5px] text-[#1c1c1e] dark:text-[#f5f5f7] focus:outline-none focus:bg-white dark:focus:bg-[#1c1c1e] border border-transparent focus:border-[#007aff] transition-all resize-y leading-relaxed',
                isMonospace && 'font-mono text-[13px] leading-6 whitespace-pre'
              )}
            />

            {/* Tag editing */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[7px] text-[12px] font-medium bg-[#007aff]/10 dark:bg-[#0a84ff]/18 text-[#007aff] dark:text-[#409cff]"
                >
                  #{t}
                  <button type="button" onClick={() => removeTag(idx)} className="cursor-pointer">
                    <X className="w-3 h-3 hover:text-[#ff3b30]" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag + Enter…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                className="text-[12px] bg-transparent focus:outline-none w-32 text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#8e8e93]"
              />
            </div>
          </div>
        ) : (
          /* Apple Notes Reading Layout */
          <div className="space-y-3.5">
            <h2 className="text-[20px] sm:text-[22px] font-bold tracking-[-0.022em] text-[#1c1c1e] dark:text-[#f5f5f7]">
              {item.title}
            </h2>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[12px] font-medium px-2.5 py-0.5 rounded-[7px] bg-[#007aff]/10 dark:bg-[#0a84ff]/18 text-[#007aff] dark:text-[#409cff]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div
              className={cn(
                'p-4 sm:p-5 rounded-[14px] bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[14.5px] leading-relaxed text-[#1c1c1e] dark:text-[#f5f5f7] select-text whitespace-pre-wrap overflow-x-auto',
                isMonospace && 'font-mono text-[13px] whitespace-pre'
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
