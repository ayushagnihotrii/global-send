'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Image as ImageIcon,
  Film,
  File as FileIcon,
  CheckCircle2,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { Item } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';
import { SITE_CONFIG, EXPIRATION_PRESETS } from '@/config/site';

interface QuickComposerProps {
  onItemCreated: (item: Item) => void;
  isOpenDefault?: boolean;
  externalFiles?: File[] | null;
  onExternalFilesConsumed?: () => void;
}

type ComposerMode = 'text' | 'upload' | 'link';

interface QueuedFileEntry {
  id: string;
  file: File;
  previewUrl: string | null;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return Film;
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('json') ||
    mimeType.includes('javascript') ||
    mimeType.includes('xml')
  ) {
    return Code;
  }
  if (mimeType.includes('pdf') || mimeType.includes('document')) {
    return FileText;
  }
  return FileIcon;
}

export function QuickComposer({
  onItemCreated,
  isOpenDefault = false,
  externalFiles,
  onExternalFilesConsumed,
}: QuickComposerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(isOpenDefault);
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

  // Multi-file upload composer states
  const [queuedFiles, setQueuedFiles] = useState<QueuedFileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeUploadSessionIdRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef<boolean>(false);

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

  // Add files helper with deduplication, size validation, and instant image preview generation
  const addFilesToQueue = useCallback((incoming: FileList | File[]) => {
    const fileArray = Array.from(incoming);
    if (fileArray.length === 0) return;

    const maxBytes = SITE_CONFIG.maxUploadSizeBytes;
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    const oversized = fileArray.filter((f) => f.size > maxBytes);
    const valid = fileArray.filter((f) => f.size <= maxBytes);

    if (oversized.length > 0) {
      setUploadError(
        oversized.length === 1
          ? `"${oversized[0].name}" exceeds the ${maxMb} MB maximum size limit.`
          : `${oversized.length} files exceed the ${maxMb} MB maximum size limit and were skipped.`
      );
    } else {
      setUploadError(null);
    }

    if (valid.length === 0) return;

    setQueuedFiles((prev) => {
      const existingFingerprints = new Set(
        prev.map((entry) => `${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`)
      );

      const newEntries: QueuedFileEntry[] = [];
      for (const file of valid) {
        const fp = `${file.name}-${file.size}-${file.lastModified}`;
        if (existingFingerprints.has(fp)) continue;
        existingFingerprints.add(fp);

        let previewUrl: string | null = null;
        if (
          typeof window !== 'undefined' &&
          file.type.startsWith('image/') &&
          file.size <= 25 * 1024 * 1024
        ) {
          try {
            previewUrl = URL.createObjectURL(file);
          } catch {
            previewUrl = null;
          }
        }

        newEntries.push({
          id: `${fp}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl,
          status: 'pending',
          progress: 0,
        });
      }

      return [...prev, ...newEntries];
    });
  }, []);

  // Consume external files dropped anywhere on the Dashboard
  useEffect(() => {
    if (externalFiles && externalFiles.length > 0) {
      setMode('upload');
      setIsOpen(true);
      addFilesToQueue(externalFiles);
      onExternalFilesConsumed?.();
    }
  }, [externalFiles, addFilesToQueue, onExternalFilesConsumed]);

  // Cleanup object URLs on unmount
  const queuedFilesRef = useRef<QueuedFileEntry[]>([]);
  useEffect(() => {
    queuedFilesRef.current = queuedFiles;
  }, [queuedFiles]);

  useEffect(() => {
    return () => {
      queuedFilesRef.current.forEach((entry) => {
        if (entry.previewUrl) {
          URL.revokeObjectURL(entry.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (isOpen && mode === 'text') {
      setTimeout(() => textAreaRef.current?.focus(), 50);
    }
  }, [isOpen, mode]);

  const removeQueuedFile = (id: string) => {
    setQueuedFiles((prev) => {
      const target = prev.find((e) => e.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((e) => e.id !== id);
    });
  };

  const clearQueuedFiles = () => {
    queuedFiles.forEach((entry) => {
      if (entry.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl);
      }
    });
    setQueuedFiles([]);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalQueuedBytes = useMemo(
    () => queuedFiles.reduce((sum, entry) => sum + entry.file.size, 0),
    [queuedFiles]
  );

  const pendingOrErrorFiles = useMemo(
    () => queuedFiles.filter((e) => e.status === 'pending' || e.status === 'error'),
    [queuedFiles]
  );

  const overallBatchProgress = useMemo(() => {
    if (queuedFiles.length === 0) return 0;
    const totalBytes = queuedFiles.reduce((acc, e) => acc + Math.max(1, e.file.size), 0);
    const uploadedBytes = queuedFiles.reduce((acc, e) => {
      const pct = e.status === 'completed' ? 100 : e.progress;
      return acc + Math.max(1, e.file.size) * (pct / 100);
    }, 0);
    return Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
  }, [queuedFiles]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'text' && textContent.trim()) {
        handleSaveText();
      } else if (mode === 'link' && linkUrl.trim()) {
        handleSaveLink();
      } else if (mode === 'upload' && pendingOrErrorFiles.length > 0 && !isUploading) {
        handleFileUpload();
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
        toast.info('Use Cmd+V or Ctrl+V to paste');
      }
    } catch {
      toast.info('Use Cmd+V or Ctrl+V to paste');
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
    clearQueuedFiles();
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

      toast.success('Saved to Vault');
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

      toast.success('Link saved to Vault');
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
    cancelRequestedRef.current = true;
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
    setQueuedFiles((prev) =>
      prev.map((e) =>
        e.status === 'uploading' ? { ...e, status: 'pending', progress: 0 } : e
      )
    );
    setIsUploading(false);
    setUploadError('Upload cancelled. Any already-completed files remain in your vault.');
  };

  const uploadSingleEntry = async (
    entry: QueuedFileEntry,
    customItemTitle: string
  ): Promise<Item> => {
    const file = entry.file;
    const updateEntryProgress = (progress: number) => {
      setQueuedFiles((prev) =>
        prev.map((item) => (item.id === entry.id ? { ...item, progress } : item))
      );
    };

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
          title: customItemTitle || file.name,
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
        updateEntryProgress(Math.min(99, Math.round((offset / file.size) * 100)));

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
      return finalItem;
    } else {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('expirationSeconds', String(effectiveExpirationSec));
      if (customItemTitle) formData.append('title', customItemTitle);
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

      return await new Promise<Item>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', '/api/storage/upload', true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 95);
            updateEntryProgress(Math.max(5, pct));
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
    }
  };

  const handleFileUpload = async () => {
    const targets = queuedFiles.filter(
      (e) => e.status === 'pending' || e.status === 'error'
    );
    if (targets.length === 0) return;

    cancelRequestedRef.current = false;
    setIsUploading(true);
    setUploadError(null);

    let successCount = 0;
    let failCount = 0;
    const isMulti = queuedFiles.length > 1;
    const trimmedTitle = title.trim();

    for (let i = 0; i < targets.length; i++) {
      if (cancelRequestedRef.current) break;

      const entry = targets[i];
      setActiveFileIndex(i + 1);

      setQueuedFiles((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? { ...item, status: 'uploading', progress: 5, error: undefined }
            : item
        )
      );

      const itemTitle = trimmedTitle
        ? isMulti
          ? `${trimmedTitle} (${entry.file.name})`
          : trimmedTitle
        : '';

      try {
        const uploadedItem = await uploadSingleEntry(entry, itemTitle);
        successCount++;

        setQueuedFiles((prev) =>
          prev.map((item) =>
            item.id === entry.id
              ? { ...item, status: 'completed', progress: 100, error: undefined }
              : item
          )
        );

        onItemCreated(uploadedItem);
      } catch (err: any) {
        if (
          cancelRequestedRef.current ||
          err?.name === 'AbortError' ||
          err?.message === 'Upload cancelled'
        ) {
          break;
        }
        failCount++;
        const errMsg = err?.message || 'Upload failed';
        setQueuedFiles((prev) =>
          prev.map((item) =>
            item.id === entry.id
              ? { ...item, status: 'error', progress: 0, error: errMsg }
              : item
          )
        );
      } finally {
        xhrRef.current = null;
      }
    }

    setIsUploading(false);

    if (cancelRequestedRef.current) {
      return;
    }

    if (failCount === 0 && successCount > 0) {
      toast.success(
        successCount === 1
          ? `${targets[0].file.name} uploaded`
          : `Uploaded ${successCount} files to your vault`
      );
      setTimeout(() => {
        resetForm();
        setIsOpen(false);
      }, 220);
    } else if (successCount > 0 && failCount > 0) {
      setUploadError(
        `Uploaded ${successCount} ${successCount === 1 ? 'file' : 'files'}, but ${failCount} failed. Click Retry to re-upload failed files.`
      );
      toast.error(`${failCount} ${failCount === 1 ? 'file' : 'files'} failed to upload`);
    } else if (failCount > 0) {
      setUploadError('Could not upload selected files. Please check your connection or storage quota.');
      toast.error('Upload failed');
    }
  };

  return (
    <div className="mb-6">
      {/* Shared hidden multi-file input so users can pick files from anywhere */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setMode('upload');
            setIsOpen(true);
            addFilesToQueue(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {!isOpen ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              setMode('upload');
              setIsOpen(true);
              addFilesToQueue(e.dataTransfer.files);
            }
          }}
          className={cn(
            'ios-card rounded-[16px] p-2.5 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 transition-all',
            isDragging && 'ring-2 ring-[#007aff] bg-[#007aff]/[0.06]'
          )}
        >
          <button
            type="button"
            onClick={() => {
              setMode('text');
              setIsOpen(true);
            }}
            className="flex-1 flex items-center gap-2.5 text-left px-3 py-2 rounded-[10px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-[#007aff] dark:bg-[#0a84ff] text-white flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <span className="text-[14px] text-[#6c6c70] dark:text-[#98989d]">
              {isDragging
                ? 'Drop files here to queue for upload…'
                : 'New note, code snippet, multiple files, or web link…'}
            </span>
          </button>

          <div className="flex items-center gap-1.5 px-1 sm:px-0">
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
              <span>Note</span>
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
              <span>Files</span>
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
      ) : (
        <div
          onKeyDown={handleKeyDown}
          className="ios-card rounded-[18px] p-4 sm:p-5 space-y-4 animate-ios-sheet"
        >
          {/* Mode Switcher & Close */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-black/[0.07] dark:border-white/[0.09]">
            <SegmentedControl
              size="sm"
              value={mode}
              onChange={(v) => setMode(v)}
              options={[
                { value: 'text', label: 'Note', icon: <FileText className="w-3.5 h-3.5" /> },
                {
                  value: 'upload',
                  label:
                    queuedFiles.length > 0
                      ? `Upload Files (${queuedFiles.length})`
                      : 'Upload Files',
                  icon: <Upload className="w-3.5 h-3.5" />,
                },
                { value: 'link', label: 'Web Link', icon: <Link2 className="w-3.5 h-3.5" /> },
              ]}
            />

            <button
              type="button"
              onClick={() => {
                if (isUploading) handleCancelUpload();
                setIsOpen(false);
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-[#6c6c70] dark:text-[#ebebf5]/70 hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
              aria-label="Close composer"
            >
              <X className="w-3.5 h-3.5 stroke-[2.25]" />
            </button>
          </div>

          {/* 1. TEXT COMPOSER */}
          {mode === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 text-[16px] font-semibold tracking-[-0.015em] bg-transparent pb-1 focus:outline-none text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#8e8e93]"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCodeFont(!isCodeFont)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer',
                      isCodeFont
                        ? 'bg-[#007aff]/12 text-[#007aff] dark:bg-[#0a84ff]/20 dark:text-[#409cff]'
                        : 'bg-[#767680]/[0.08] dark:bg-[#767680]/[0.2] text-[#6c6c70] dark:text-[#98989d]'
                    )}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Monospace</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-medium bg-[#767680]/[0.08] dark:bg-[#767680]/[0.2] text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </button>
                </div>
              </div>

              <textarea
                ref={textAreaRef}
                rows={6}
                placeholder="Write a note, paste a question, or drop a code snippet…"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className={cn(
                  'w-full rounded-[12px] border border-transparent bg-[#767680]/[0.07] dark:bg-[#767680]/[0.18] p-3.5 text-[14.5px] leading-relaxed text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#8e8e93] focus:bg-white dark:focus:bg-[#1c1c1e] focus:outline-none focus:border-[#007aff] dark:focus:border-[#0a84ff] focus:ring-3 focus:ring-[#007aff]/12 resize-y transition-all',
                  isCodeFont && 'font-mono text-[13px] leading-relaxed'
                )}
              />
            </div>
          )}

          {/* 2. MULTI-FILE UPLOAD COMPOSER */}
          {mode === 'upload' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder={
                  queuedFiles.length > 1
                    ? 'Batch title prefix (optional — leave blank to use each file name)'
                    : 'Custom display title (optional)'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-[15px] font-semibold bg-transparent border-b border-black/[0.07] dark:border-white/[0.09] focus:border-[#007aff] pb-1.5 focus:outline-none text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#8e8e93]"
              />

              {queuedFiles.length === 0 ? (
                /* Empty Dropzone */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      addFilesToQueue(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-[16px] p-7 text-center transition-all cursor-pointer',
                    isDragging
                      ? 'border-[#007aff] bg-[#007aff]/[0.08] scale-[1.01]'
                      : 'border-black/[0.14] dark:border-white/[0.16] bg-[#767680]/[0.04] dark:bg-[#767680]/[0.12] hover:border-[#007aff] hover:bg-[#007aff]/[0.02]'
                  )}
                >
                  <div className="w-11 h-11 rounded-[14px] bg-[#007aff]/10 dark:bg-[#0a84ff]/18 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center mx-auto mb-2.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[15px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                      Select multiple files or drag and drop here
                    </p>
                    <p className="text-[12.5px] text-[#8e8e93]">
                      Pick photos, videos, PDFs, code, and archives at once · up to{' '}
                      {Math.round(SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024))} MB per file
                    </p>
                  </div>
                </div>
              ) : (
                /* Populated Multi-File Queue with Drag-and-Drop Support */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (!isUploading && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      addFilesToQueue(e.dataTransfer.files);
                    }
                  }}
                  className={cn(
                    'rounded-[16px] border overflow-hidden transition-all',
                    isDragging
                      ? 'border-[#007aff] bg-[#007aff]/[0.05] ring-2 ring-[#007aff]/20'
                      : 'border-black/[0.09] dark:border-white/[0.12] bg-[#767680]/[0.04] dark:bg-[#767680]/[0.1]'
                  )}
                >
                  {/* Queue Header Toolbar */}
                  <div className="px-3.5 py-2.5 bg-black/[0.03] dark:bg-white/[0.04] border-b border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#007aff]/12 dark:bg-[#0a84ff]/20 text-[#007aff] dark:text-[#409cff] tabular-nums text-[11.5px]">
                        {queuedFiles.length} {queuedFiles.length === 1 ? 'file' : 'files'}
                      </span>
                      <span className="text-[#8e8e93] font-normal tabular-nums">
                        {formatBytes(totalQueuedBytes)} total
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-medium bg-white dark:bg-[#2c2c2e] text-[#007aff] dark:text-[#409cff] border border-black/[0.08] dark:border-white/[0.12] hover:bg-[#007aff]/5 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add More Files</span>
                      </button>

                      {!isUploading && (
                        <button
                          type="button"
                          onClick={clearQueuedFiles}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-[8px] text-[12px] font-medium text-[#8e8e93] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors cursor-pointer"
                          title="Clear all selected files"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable File Cards */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                    {queuedFiles.map((entry) => {
                      const TypeIcon = getFileIcon(entry.file.type || '');
                      return (
                        <div
                          key={entry.id}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Thumbnail or Icon */}
                            {entry.previewUrl ? (
                              <img
                                src={entry.previewUrl}
                                alt={entry.file.name}
                                className="w-10 h-10 rounded-[10px] object-cover border border-black/[0.08] dark:border-white/[0.12] shrink-0 bg-black/5"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-[10px] bg-[#007aff]/10 dark:bg-[#0a84ff]/18 text-[#007aff] dark:text-[#409cff] flex items-center justify-center shrink-0">
                                <TypeIcon className="w-5 h-5" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[13.5px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                                  {entry.file.name}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 mt-0.5 text-[11.5px] text-[#8e8e93] tabular-nums">
                                <span>{formatBytes(entry.file.size)}</span>
                                {entry.status === 'pending' && <span>· Ready</span>}
                                {entry.status === 'uploading' && (
                                  <span className="text-[#007aff] dark:text-[#409cff] font-medium">
                                    · Uploading {entry.progress}%
                                  </span>
                                )}
                                {entry.status === 'completed' && (
                                  <span className="text-[#34c759] font-medium">
                                    · Uploaded
                                  </span>
                                )}
                                {entry.status === 'error' && (
                                  <span className="text-[#ff3b30] dark:text-[#ff453a] font-medium truncate">
                                    · {entry.error || 'Failed'}
                                  </span>
                                )}
                              </div>

                              {/* Per-file progress bar while uploading */}
                              {entry.status === 'uploading' && (
                                <div className="h-1 w-full bg-black/[0.08] dark:bg-white/[0.12] rounded-full overflow-hidden mt-1.5">
                                  <div
                                    className="h-full bg-[#007aff] dark:bg-[#0a84ff] transition-all duration-150"
                                    style={{ width: `${entry.progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Action / Status Icon */}
                          <div className="shrink-0 flex items-center">
                            {entry.status === 'completed' ? (
                              <span className="w-7 h-7 rounded-full bg-[#34c759]/15 text-[#34c759] flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4" />
                              </span>
                            ) : entry.status === 'uploading' ? (
                              <span className="w-7 h-7 flex items-center justify-center text-[#007aff] dark:text-[#409cff]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => removeQueuedFile(entry.id)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-[#ff3b30] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                                aria-label={`Remove ${entry.file.name}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Overall Batch Progress Bar during upload */}
              {isUploading && (
                <div className="p-3.5 rounded-[12px] bg-[#007aff]/[0.07] dark:bg-[#0a84ff]/[0.14] border border-[#007aff]/20 space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                      {queuedFiles.length === 1
                        ? `Uploading ${queuedFiles[0]?.file.name}…`
                        : `Uploading file ${activeFileIndex} of ${queuedFiles.length}…`}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      <span className="font-bold text-[#007aff] dark:text-[#409cff]">
                        {overallBatchProgress}%
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelUpload}
                        className="text-[#ff3b30] dark:text-[#ff453a] hover:underline font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-black/[0.08] dark:bg-white/[0.12] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#007aff] dark:bg-[#0a84ff] transition-all duration-200"
                      style={{ width: `${overallBatchProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 p-3 rounded-[12px] bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[12px] text-[#ff3b30] dark:text-[#ff453a]">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>
          )}

          {/* EXPIRATION SELECTOR (iOS Grouped Row) */}
          <div className="p-3 rounded-[12px] bg-[#767680]/[0.06] dark:bg-[#767680]/[0.16] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-[12px]">
              <Clock className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff] shrink-0" />
              <span className="font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                Auto-Delete:
              </span>
              <span className="text-[#8e8e93] tabular-nums">
                {previewExpirationLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {EXPIRATION_PRESETS.map((preset) => {
                const isSelected = selectedPresetSec === preset.seconds;
                return (
                  <button
                    key={preset.seconds}
                    type="button"
                    onClick={() => setSelectedPresetSec(preset.seconds)}
                    className={cn(
                      'px-2.5 py-1 rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-[#007aff] dark:bg-[#0a84ff] text-white'
                        : 'bg-white dark:bg-[#2c2c2e] text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white'
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
                  'px-2.5 py-1 rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer',
                  selectedPresetSec === 'custom'
                    ? 'bg-[#007aff] dark:bg-[#0a84ff] text-white'
                    : 'bg-white dark:bg-[#2c2c2e] text-[#6c6c70] dark:text-[#98989d] hover:text-[#1c1c1e] dark:hover:text-white'
                )}
              >
                Custom
              </button>

              {selectedPresetSec === 'custom' && (
                <div className="flex items-center gap-1 ml-1">
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    className="w-16 px-2 py-1 rounded-[7px] text-[12px] border border-black/[0.12] dark:border-white/[0.16] bg-white dark:bg-[#1c1c1e] text-[#1c1c1e] dark:text-[#f5f5f7] tabular-nums"
                  />
                  <span className="text-[11px] text-[#8e8e93]">hrs</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags & Submit Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-[#767680]/[0.08] dark:bg-[#767680]/[0.2] px-2.5 py-1 rounded-[8px]">
                <Tag className="w-3 h-3 text-[#8e8e93]" />
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
                  className="bg-transparent text-[12px] focus:outline-none w-28 text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#8e8e93]"
                />
              </div>
              {tags.map((t, i) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[7px] text-[12px] font-medium bg-[#007aff]/10 dark:bg-[#0a84ff]/18 text-[#007aff] dark:text-[#409cff]"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(i)}
                    className="hover:text-[#ff3b30] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
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
                  Save Note
                </Button>
              )}

              {mode === 'upload' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFileUpload}
                  isLoading={isUploading}
                  disabled={pendingOrErrorFiles.length === 0 || isUploading}
                >
                  {queuedFiles.some((e) => e.status === 'error')
                    ? `Retry Failed (${queuedFiles.filter((e) => e.status === 'error').length})`
                    : pendingOrErrorFiles.length > 1
                    ? `Upload ${pendingOrErrorFiles.length} Files`
                    : 'Upload File'}
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
