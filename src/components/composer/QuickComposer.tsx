'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  Upload,
  Link2,
  Clipboard,
  X,
  Tag,
  AlertCircle,
  Code,
  Clock,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Item } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';
import { SITE_CONFIG, EXPIRATION_PRESETS } from '@/config/site';

interface QuickComposerProps {
  onItemCreated: (item: Item) => void;
  isOpenDefault?: boolean;
}

type ComposerMode = 'text' | 'upload' | 'link';

export function QuickComposer({ onItemCreated }: QuickComposerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ComposerMode>('text');

  // Expiration states (Default: 24 hours = 86,400 seconds)
  const [selectedPresetSec, setSelectedPresetSec] = useState<number | 'custom'>(
    SITE_CONFIG.defaultExpirationSeconds
  );
  const [customHours, setCustomHours] = useState<string>('48');

  // Text composer states
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isCodeFont, setIsCodeFont] = useState(false);

  // Link composer states
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkNote, setLinkNote] = useState('');

  // Upload composer states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeUploadSessionIdRef = useRef<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const effectiveExpirationSec = useMemo(() => {
    if (selectedPresetSec === 'custom') {
      const hrs = parseFloat(customHours);
      if (!Number.isFinite(hrs) || hrs <= 0) return SITE_CONFIG.defaultExpirationSeconds;
      const sec = Math.round(hrs * 3600);
      return Math.min(
        SITE_CONFIG.maxExpirationSeconds,
        Math.max(SITE_CONFIG.minExpirationSeconds, sec)
      );
    }
    return selectedPresetSec;
  }, [selectedPresetSec, customHours]);

  const previewExpirationLabel = useMemo(() => {
    const targetDate = new Date(Date.now() + effectiveExpirationSec * 1000);
    return targetDate.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [effectiveExpirationSec]);

  useEffect(() => {
    if (isOpen && mode === 'text') {
      setTimeout(() => textAreaRef.current?.focus(), 50);
    }
  }, [isOpen, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'text' && textContent.trim()) {
        handleSaveText();
      } else if (mode === 'link' && linkUrl.trim()) {
        handleSaveLink();
      }
    }
  };

  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#/, '');
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setTextContent((prev) => (prev ? prev + '\n' + text : text));
          toast.success('Pasted from clipboard');
        } else {
          toast.info('Clipboard is empty');
        }
      } else {
        toast.info('Please use Ctrl+V or Cmd+V to paste');
      }
    } catch {
      toast.info('Please paste using Ctrl+V or Cmd+V');
    }
  };

  const resetForm = () => {
    setTitle('');
    setTextContent('');
    setTags([]);
    setTagInput('');
    setLinkUrl('');
    setLinkTitle('');
    setLinkNote('');
    setSelectedFile(null);
    setUploadProgress(null);
    setUploadError(null);
    setSelectedPresetSec(SITE_CONFIG.defaultExpirationSeconds);
  };

  const handleSaveText = async () => {
    if (!textContent.trim()) {
      toast.error('Please enter some text or code');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          title: title.trim(),
          textContent,
          tags,
          expirationSeconds: effectiveExpirationSec,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save item');
        return;
      }

      toast.success('Saved to your vault');
      onItemCreated(data.item);
      resetForm();
      setIsOpen(false);
    } catch {
      toast.error('Network error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLink = async () => {
    let rawUrl = linkUrl.trim();
    if (!rawUrl) {
      toast.error('Please enter a URL');
      return;
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = 'https://' + rawUrl;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          title: linkTitle.trim(),
          url: rawUrl,
          note: linkNote.trim() || null,
          tags,
          expirationSeconds: effectiveExpirationSec,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save link');
        return;
      }

      toast.success('Link saved to your vault');
      onItemCreated(data.item);
      resetForm();
      setIsOpen(false);
    } catch {
      toast.error('Network error while saving link');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelUpload = async () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const sessId = activeUploadSessionIdRef.current;
    activeUploadSessionIdRef.current = null;
    if (sessId) {
      await fetch(`/api/storage/upload-session?sessionId=${encodeURIComponent(sessId)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    setIsUploading(false);
    setUploadProgress(null);
    setUploadError('Upload cancelled. Reserved storage quota has been released.');
  };

  const handleFileUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    if (file.size > SITE_CONFIG.maxUploadSizeBytes) {
      setUploadError(
        `File exceeds maximum size of ${Math.round(
          SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024)
        )} MiB.`
      );
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(1);

    try {
      // Use resumable chunked session for files larger than 3.5 MiB so serverless request body limits are never exceeded
      const CHUNK_THRESHOLD = 3.5 * 1024 * 1024;
      if (file.size > CHUNK_THRESHOLD) {
        const abortCtrl = new AbortController();
        abortControllerRef.current = abortCtrl;

        const initRes = await fetch('/api/storage/upload-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            fileSize: file.size,
            title: title.trim() || file.name,
            expirationSeconds: effectiveExpirationSec,
          }),
          signal: abortCtrl.signal,
        });

        const initData = await initRes.json();
        if (!initRes.ok) {
          throw new Error(initData.error || 'Failed to initiate resumable upload');
        }

        const sessionId = initData.sessionId;
        activeUploadSessionIdRef.current = sessionId;
        const chunkSize = initData.chunkSize || 2 * 1024 * 1024;
        let offset = 0;
        let finalItem: Item | null = null;

        while (offset < file.size) {
          const slice = file.slice(offset, Math.min(offset + chunkSize, file.size));
          const buf = await slice.arrayBuffer();

          const putRes = await fetch(
            `/api/storage/upload-session?sessionId=${encodeURIComponent(sessionId)}&offset=${offset}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: buf,
              signal: abortCtrl.signal,
            }
          );

          const putData = await putRes.json();
          if (!putRes.ok) {
            throw new Error(putData.error || 'Chunk upload failed');
          }

          offset += slice.size;
          setUploadProgress(Math.min(99, Math.round((offset / file.size) * 100)));

          if (putData.completed && putData.item) {
            finalItem = putData.item;
            break;
          }
        }

        activeUploadSessionIdRef.current = null;
        abortControllerRef.current = null;

        if (!finalItem) {
          throw new Error('Upload finished without returning the finalized item');
        }

        setUploadProgress(100);
        toast.success(`${file.name} uploaded to vault`);
        onItemCreated(finalItem);
        resetForm();
        setIsOpen(false);
      } else {
        // Direct multipart upload with XHR progress tracking
        const formData = new FormData();
        formData.append('file', file);
        formData.append('expirationSeconds', String(effectiveExpirationSec));
        if (title.trim()) formData.append('title', title.trim());
        if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

        const uploadedItem = await new Promise<Item>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;
          xhr.open('POST', '/api/storage/upload', true);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 95);
              setUploadProgress(Math.max(5, pct));
            }
          };

          xhr.onload = () => {
            try {
              const response = JSON.parse(xhr.responseText || '{}');
              if (xhr.status >= 200 && xhr.status < 300 && response.item) {
                resolve(response.item);
              } else {
                reject(new Error(response.error || `Upload failed (status ${xhr.status})`));
              }
            } catch {
              reject(new Error(`Upload failed (status ${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during file transfer'));
          xhr.onabort = () => reject(new Error('Upload cancelled'));
          xhr.send(formData);
        });

        setUploadProgress(100);
        toast.success(`${file.name} uploaded to vault`);
        onItemCreated(uploadedItem);
        resetForm();
        setIsOpen(false);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message === 'Upload cancelled') {
        return;
      }
      setUploadError(err.message || 'Upload failed');
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      xhrRef.current = null;
    }
  };

  return (
    <div className="mb-6">
      {!isOpen ? (
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-[#e5e5ea] dark:border-[#27272a] p-3.5 sm:p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('text');
                setIsOpen(true);
              }}
              className="flex-1 flex items-center gap-3 text-left px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1c21] hover:bg-[#ebebf0] dark:hover:bg-[#24242b] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#0071e3]" />
              <span className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#a1a1aa]">
                Save text, paste a question, upload a file, or add a link...
              </span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMode('text');
                  setIsOpen(true);
                }}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Text</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMode('upload');
                  setIsOpen(true);
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMode('link');
                  setIsOpen(true);
                }}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Link</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onKeyDown={handleKeyDown}
          className="bg-white dark:bg-[#141417] rounded-3xl border border-[#e5e5ea] dark:border-[#27272a] p-4 sm:p-6 shadow-sm space-y-4"
        >
          {/* Mode Tabs & Close */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f0f0f2] dark:border-[#27272a]">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'text', label: 'Text / Note', icon: FileText },
                  { id: 'upload', label: 'Upload File', icon: Upload },
                  { id: 'link', label: 'Save Link', icon: Link2 },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMode(tab.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer',
                      active
                        ? 'bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f]'
                        : 'text-[#6e6e73] dark:text-[#a1a1aa] hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c21]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                if (isUploading) handleCancelUpload();
                setIsOpen(false);
              }}
              className="p-1.5 rounded-lg text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
              aria-label="Close composer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. TEXT COMPOSER */}
          {mode === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Optional title (auto-generated if left blank)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 text-sm font-medium bg-transparent border-b border-transparent focus:border-[#0071e3] pb-1 focus:outline-none text-[#1d1d1f] dark:text-white placeholder:text-[#86868b]"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCodeFont(!isCodeFont)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
                      isCodeFont
                        ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/30'
                        : 'text-[#6e6e73] border-[#e5e5ea] dark:border-[#27272a]'
                    )}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Monospace</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-[#e5e5ea] dark:border-[#27272a] text-[#6e6e73] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </button>
                </div>
              </div>

              <textarea
                ref={textAreaRef}
                rows={6}
                placeholder="Paste your question, code snippet, or note here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className={cn(
                  'w-full rounded-2xl border border-[#e5e5ea] dark:border-[#27272a] bg-[#f9f9fb] dark:bg-[#1c1c21] p-3.5 text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] resize-y',
                  isCodeFont && 'font-mono text-xs leading-relaxed'
                )}
              />
            </div>
          )}

          {/* 2. FILE UPLOAD COMPOSER */}
          {mode === 'upload' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Custom display title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm font-medium bg-transparent border-b border-[#e5e5ea] dark:border-[#27272a] focus:border-[#0071e3] pb-1.5 focus:outline-none text-[#1d1d1f] dark:text-white placeholder:text-[#86868b]"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) {
                    setSelectedFile(dropped);
                    setUploadError(null);
                  }
                }}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer',
                  isDragging
                    ? 'border-[#0071e3] bg-[#0071e3]/5'
                    : 'border-[#d2d2d7] dark:border-[#38383a] hover:border-[#0071e3]'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      setUploadError(null);
                    }
                  }}
                />
                <Upload className="w-7 h-7 mx-auto text-[#0071e3] mb-2" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-white truncate max-w-md mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-[#6e6e73]">
                      {formatBytes(selectedFile.size)} · Ready to upload
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                      Click to choose a file or drag and drop
                    </p>
                    <p className="text-xs text-[#86868b]">
                      Photos, videos, PDFs, documents, and archives up to{' '}
                      {Math.round(SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024))} MiB
                    </p>
                  </div>
                )}
              </div>

              {isUploading && uploadProgress !== null && (
                <div className="p-3.5 rounded-2xl bg-[#f5f5f7] dark:bg-[#1c1c21] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1d1d1f] dark:text-white">
                      Uploading {selectedFile?.name}...
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#0071e3]">{uploadProgress}%</span>
                      <button
                        type="button"
                        onClick={handleCancelUpload}
                        className="text-red-600 dark:text-red-400 hover:underline font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-[#e5e5ea] dark:bg-[#27272a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0071e3] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* 3. LINK COMPOSER */}
          {mode === 'link' && (
            <div className="space-y-3">
              <Input
                label="URL"
                type="url"
                placeholder="https://example.com/article"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <Input
                label="Title (optional)"
                type="text"
                placeholder="Clean title for this link"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
              />
              <Input
                label="Note (optional)"
                type="text"
                placeholder="Context or description"
                value={linkNote}
                onChange={(e) => setLinkNote(e.target.value)}
              />
            </div>
          )}

          {/* MANDATORY EXPIRATION SELECTOR (24h selected by default) */}
          <div className="p-3.5 rounded-2xl bg-[#f5f5f7] dark:bg-[#1c1c21] border border-[#e5e5ea] dark:border-[#27272a] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#1d1d1f] dark:text-white">
                <Clock className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Auto-Expires After:</span>
              </div>
              <span className="text-[11px] text-[#6e6e73] dark:text-[#a1a1aa]">
                Expires {previewExpirationLabel} (permanent deletion)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {EXPIRATION_PRESETS.map((preset) => {
                const isSelected = selectedPresetSec === preset.seconds;
                return (
                  <button
                    key={preset.seconds}
                    type="button"
                    onClick={() => setSelectedPresetSec(preset.seconds)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-[#0071e3] text-white'
                        : 'bg-white dark:bg-[#141417] text-[#6e6e73] dark:text-[#a1a1aa] border border-[#e5e5ea] dark:border-[#27272a] hover:text-[#1d1d1f] dark:hover:text-white'
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedPresetSec('custom')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                  selectedPresetSec === 'custom'
                    ? 'bg-[#0071e3] text-white'
                    : 'bg-white dark:bg-[#141417] text-[#6e6e73] dark:text-[#a1a1aa] border border-[#e5e5ea] dark:border-[#27272a] hover:text-[#1d1d1f] dark:hover:text-white'
                )}
              >
                Custom
              </button>

              {selectedPresetSec === 'custom' && (
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg text-xs border border-[#d2d2d7] dark:border-[#38383a] bg-white dark:bg-[#141417] text-[#1d1d1f] dark:text-white"
                  />
                  <span className="text-xs text-[#6e6e73]">hours (max 720h)</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags & Submit Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-[#1c1c21] px-2.5 py-1 rounded-xl border border-[#e5e5ea] dark:border-[#27272a]">
                <Tag className="w-3 h-3 text-[#86868b]" />
                <input
                  type="text"
                  placeholder="Add tag + Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  className="bg-transparent text-xs focus:outline-none w-28 text-[#1d1d1f] dark:text-white placeholder:text-[#86868b]"
                />
              </div>
              {tags.map((t, i) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-[#0071e3]/10 text-[#0071e3]"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(i)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (isUploading) handleCancelUpload();
                  setIsOpen(false);
                }}
              >
                Cancel
              </Button>

              {mode === 'text' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveText}
                  isLoading={isSaving}
                  disabled={!textContent.trim()}
                >
                  Save to Vault
                </Button>
              )}

              {mode === 'upload' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleFileUpload()}
                  isLoading={isUploading}
                  disabled={!selectedFile || isUploading}
                >
                  Upload to Vault
                </Button>
              )}

              {mode === 'link' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveLink}
                  isLoading={isSaving}
                  disabled={!linkUrl.trim()}
                >
                  Save Link
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
