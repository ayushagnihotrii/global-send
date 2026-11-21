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
  parentFolderId?: string | null;
}

type ComposerMode = 'text' | 'upload' | 'link';

interface QueuedFileEntry {
  id: string;
  file: File;
  localPath?: string;
  isDesktopDirect?: boolean;
  previewUrl: string | null;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  uploadedBytes?: number;
  speed?: string;
  eta?: string;
  error?: string;
}

function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '';
  if (seconds < 60) return `${Math.round(seconds)}s remaining`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s remaining`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m remaining`;
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
  parentFolderId,
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
    if (selectedPresetSec === 0) return 0;
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
    if (effectiveExpirationSec === 0) {
      return 'Keep Forever in Vault';
    }
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

        let resolvedPath = '';
        if (typeof window !== 'undefined' && window.desktopVault?.isDesktop) {
          try {
            resolvedPath =
              window.desktopVault.getPathForFile?.(file) ||
              (file as any).path ||
              '';
          } catch {}
        }

        newEntries.push({
          id: `${fp}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          localPath: resolvedPath,
          isDesktopDirect: Boolean(resolvedPath),
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

  const handleOpenPicker = async () => {
    if (isUploading) return;
    if (typeof window !== 'undefined' && window.desktopVault?.isDesktop && window.desktopVault.pickFiles) {
      try {
        const picked = await window.desktopVault.pickFiles();
        if (picked && Array.isArray(picked) && picked.length > 0) {
          setQueuedFiles((prev) => {
            const newEntries: QueuedFileEntry[] = [];
            for (const rawItem of picked) {
              const item = rawItem as any;
              const itemPath = typeof item === 'string' ? item : (item.path as string) || '';
              const itemName = typeof item === 'string' ? item.split(/[\\/]/).pop() || 'file' : (item.name as string) || 'file';
              const itemSize = typeof item === 'string' ? 0 : Number(item.size || 0);

              const mockBlob = new Blob([], { type: 'application/octet-stream' });
              const mockFile = new File([mockBlob], itemName, { type: 'application/octet-stream' });
              try {
                Object.defineProperty(mockFile, 'size', { value: itemSize });
                Object.defineProperty(mockFile, 'path', { value: itemPath });
              } catch {}

              newEntries.push({
                id: `${itemPath}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                file: mockFile,
                localPath: itemPath,
                isDesktopDirect: true,
                previewUrl: null,
                status: 'pending',
                progress: 0,
              });
            }
            return [...prev, ...newEntries];
          });
          return;
        }
      } catch (err) {
        console.warn('Native desktop picker failed, using standard input', err);
      }
    }
    fileInputRef.current?.click();
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
          parentFolderId: parentFolderId || null,
          isPermanent: effectiveExpirationSec === 0,
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
          parentFolderId: parentFolderId || null,
          isPermanent: effectiveExpirationSec === 0,
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
    const updateEntryProgress = (
      progress: number,
      metrics?: { uploadedBytes?: number; speed?: string; eta?: string }
    ) => {
      setQueuedFiles((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                progress,
                uploadedBytes: metrics?.uploadedBytes ?? item.uploadedBytes,
                speed: metrics?.speed ?? item.speed,
                eta: metrics?.eta ?? item.eta,
              }
            : item
        )
      );
    };

    // 1. High-Speed Direct Desktop MTProto Upload
    // If running inside the Electron Desktop app, stream directly to Telegram MTProto from local disk.
    // Bypasses Vercel serverless body limits, timeouts, and RAM limitations completely.
    if (typeof window !== 'undefined' && window.desktopVault?.isDesktop) {
      let localPath = entry.localPath || '';
      if (!localPath) {
        try {
          localPath =
            window.desktopVault.getPathForFile?.(file) ||
            (file as any).path ||
            '';
        } catch {}
      }

      if (localPath) {
        try {
          const configRes = await fetch('/api/storage/direct-config');
          if (configRes.ok) {
            const configData = await configRes.json();
            if (configData.provider === 'telegram' && configData.telegram) {
              const itemId = crypto.randomUUID();

              // Subscribe to real-time hardware upload progress with speed & ETA
              const unsubscribe = window.desktopVault.onUploadProgress?.((data) => {
                if (data.itemId === itemId) {
                  const speedStr = data.speedBps ? `${formatBytes(data.speedBps)}/s` : '';
                  const etaStr = data.etaSec ? formatEta(data.etaSec) : '';
                  updateEntryProgress(Math.max(1, Math.min(99, data.progress)), {
                    uploadedBytes: data.uploadedBytes,
                    speed: speedStr,
                    eta: etaStr,
                  });
                }
              });

              updateEntryProgress(2);

              const uploadRes = await window.desktopVault.directUpload({
                filePath: localPath,
                apiId: configData.telegram.apiId,
                apiHash: configData.telegram.apiHash,
                botToken: configData.telegram.botToken,
                channelId: configData.telegram.channelId,
                title: customItemTitle || file.name,
                itemId,
                mimeType: file.type || 'application/octet-stream',
              });

              if (unsubscribe) unsubscribe();

              if (!uploadRes.success) {
                throw new Error(uploadRes.error || 'Desktop direct upload failed');
              }

              // Confirm item registration in vault
              const confirmRes = await fetch('/api/storage/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  itemId,
                  storageKey: uploadRes.storageKey,
                  originalFilename: file.name,
                  mimeType: file.type || 'application/octet-stream',
                  fileSize: uploadRes.fileSize,
                  title: customItemTitle || file.name,
                  tags,
                  parentFolderId: parentFolderId || null,
                  isPermanent: effectiveExpirationSec === 0,
                  expirationSeconds: effectiveExpirationSec,
                }),
              });

              if (!confirmRes.ok) {
                const confirmErr = await confirmRes.json().catch(() => ({}));
                throw new Error(confirmErr.error || 'Failed to finalize vault record');
              }

              const confirmData = await confirmRes.json();
              updateEntryProgress(100);
              return confirmData.item;
            }
          }
        } catch (desktopErr: any) {
          console.warn('[Desktop Direct Upload failed, checking fallback]:', desktopErr?.message);
          throw desktopErr;
        }
      } else if (file.size > 50 * 1024 * 1024) {
        throw new Error(
          `Could not read local file path for "${file.name}". Please pick files using the Desktop Vault file picker or drag and drop directly from File Explorer so direct MTProto transfer can run.`
        );
      }
    }

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
          parentFolderId: parentFolderId || null,
          isPermanent: effectiveExpirationSec === 0,
          expirationSeconds: effectiveExpirationSec,
        }),
        signal: abortCtrl.signal,
      });

      if (!initRes.ok) {
        const initErr = await initRes.json().catch(() => ({}));
        throw new Error(initErr.error || `Failed to initiate resumable upload (HTTP ${initRes.status})`);
      }

      const initData = await initRes.json();

      const sessionId = initData.sessionId;
      activeUploadSessionIdRef.current = sessionId;
      const chunkSize = initData.chunkSize || 2 * 1024 * 1024;
      let offset = 0;
      let finalItem: Item | null = null;
      const chunkStartTime = Date.now();

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

        if (!putRes.ok) {
          const contentType = putRes.headers.get('content-type') || '';
          if (contentType.includes('text/html') || putRes.status === 504 || putRes.status === 502) {
            throw new Error(
              `Server timed out assembling ${Math.round(file.size / (1024 * 1024))} MB file (HTTP ${putRes.status}). For large files, use the desktop app direct uploader.`
            );
          }
          const putErr = await putRes.json().catch(() => ({}));
          throw new Error(putErr.error || `Chunk upload failed (HTTP ${putRes.status})`);
        }

        const putData = await putRes.json();

        offset += slice.size;
        const elapsedSec = Math.max(0.1, (Date.now() - chunkStartTime) / 1000);
        const speedBps = offset / elapsedSec;
        const remBytes = Math.max(0, file.size - offset);
        const etaSec = speedBps > 0 ? Math.round(remBytes / speedBps) : 0;

        updateEntryProgress(Math.min(99, Math.round((offset / file.size) * 100)), {
          uploadedBytes: offset,
          speed: `${formatBytes(speedBps)}/s`,
          eta: formatEta(etaSec),
        });

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
      if (effectiveExpirationSec === 0) formData.append('isPermanent', 'true');
      if (parentFolderId) formData.append('parentFolderId', parentFolderId);
      if (customItemTitle) formData.append('title', customItemTitle);
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

      return await new Promise<Item>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', '/api/storage/upload', true);

        const xhrStartTime = Date.now();
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 95);
            const elapsedSec = Math.max(0.1, (Date.now() - xhrStartTime) / 1000);
            const speedBps = event.loaded / elapsedSec;
            const remBytes = Math.max(0, event.total - event.loaded);
            const etaSec = speedBps > 0 ? Math.round(remBytes / speedBps) : 0;
            updateEntryProgress(Math.max(5, pct), {
              uploadedBytes: event.loaded,
              speed: `${formatBytes(speedBps)}/s`,
              eta: formatEta(etaSec),
            });
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
      const firstFailed = queuedFilesRef.current.find((f) => f.error);
      const specificError = firstFailed?.error || 'Could not upload selected files. Please check your connection or storage quota.';
      setUploadError(specificError);
      toast.error(specificError);
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
            'rounded-[24px] bg-white dark:bg-[#18181B] border-2 border-neutral-900/10 dark:border-white/10 p-2 sm:p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs hover:border-neutral-900/30 dark:hover:border-white/30 transition-all',
            isDragging && 'border-[#111111] dark:border-white bg-[#CDFF5D]/10 ring-4 ring-[#CDFF5D]/30'
          )}
        >
          <button
            type="button"
            onClick={() => {
              setMode('text');
              setIsOpen(true);
            }}
            className="flex-1 flex items-center gap-3 text-left px-3 py-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="w-8 h-8 rounded-full bg-[#111111] dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
              <Plus className="w-4 h-4 stroke-[3]" />
            </span>
            <span className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {isDragging
                ? 'Drop files here to queue for upload…'
                : 'New note, code snippet, multiple files, or web link…'}
            </span>
          </button>

          <div className="flex items-center gap-2 px-1 sm:px-0">
            <button
              type="button"
              onClick={() => {
                setMode('text');
                setIsOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider bg-neutral-100 dark:bg-white/10 text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-neutral-950 transition-all cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Note</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('upload');
                setIsOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider bg-neutral-100 dark:bg-white/10 text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-neutral-950 transition-all cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Files</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('link');
                setIsOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider bg-neutral-100 dark:bg-white/10 text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-neutral-950 transition-all cursor-pointer shadow-2xs"
            >
              <Link2 className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Link</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onKeyDown={handleKeyDown}
          className="rounded-[28px] bg-white dark:bg-[#18181B] border-2 border-neutral-900/15 dark:border-white/15 p-5 sm:p-6 space-y-5 shadow-lg animate-in fade-in-50 duration-200"
        >
          {/* Mode Switcher & Close */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-neutral-900/10 dark:border-white/10">
            <div className="flex items-center gap-1 p-1 rounded-full bg-neutral-100 dark:bg-white/10 border border-neutral-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                  mode === 'text'
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Note</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                  mode === 'upload'
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                )}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {queuedFiles.length > 0 ? `Files (${queuedFiles.length})` : 'Files'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode('link')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                  mode === 'link'
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                )}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Link</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isUploading) handleCancelUpload();
                setIsOpen(false);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-white/10 text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200 transition-colors cursor-pointer"
              aria-label="Close composer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
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
                  onClick={handleOpenPicker}
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
                        onClick={handleOpenPicker}
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
                                {entry.localPath ? (
                                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#34c759]/15 text-[#34c759] uppercase tracking-wide">
                                    ⚡ Direct MTProto
                                  </span>
                                ) : entry.file.size > 50 * 1024 * 1024 ? (
                                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff9500]/15 text-[#ff9500] uppercase tracking-wide">
                                    Web Chunks
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] text-[#8e8e93] tabular-nums flex-wrap">
                                <span>{formatBytes(entry.file.size)}</span>
                                {entry.status === 'pending' && <span>· Ready</span>}
                                {entry.status === 'uploading' && (
                                  <>
                                    <span className="text-[#007aff] dark:text-[#409cff] font-semibold">
                                      · Uploading {entry.progress}%
                                    </span>
                                    <span>
                                      ({formatBytes(entry.uploadedBytes || Math.round((entry.progress / 100) * entry.file.size))} / {formatBytes(entry.file.size)})
                                    </span>
                                    {entry.speed && (
                                      <span className="text-[#34c759] font-medium">
                                        · {entry.speed}
                                      </span>
                                    )}
                                    {entry.eta && (
                                      <span className="text-[#ff9500] dark:text-[#ff9f0a] font-medium">
                                        · {entry.eta}
                                      </span>
                                    )}
                                  </>
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
                  <div className="flex items-center justify-between text-[11px] text-[#8e8e93] tabular-nums pt-0.5">
                    <span>
                      {formatBytes(
                        queuedFiles.reduce(
                          (acc, e) =>
                            acc + (e.uploadedBytes || Math.round((e.progress / 100) * e.file.size)),
                          0
                        )
                      )}{' '}
                      / {formatBytes(totalQueuedBytes)}
                    </span>
                    <div className="flex items-center gap-2">
                      {queuedFiles.find((f) => f.status === 'uploading')?.speed && (
                        <span className="text-[#34c759] font-medium">
                          {queuedFiles.find((f) => f.status === 'uploading')?.speed}
                        </span>
                      )}
                      {queuedFiles.find((f) => f.status === 'uploading')?.eta && (
                        <span className="text-[#ff9500] dark:text-[#ff9f0a] font-medium">
                          {queuedFiles.find((f) => f.status === 'uploading')?.eta}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {typeof window !== 'undefined' && !window.desktopVault?.isDesktop && queuedFiles.some((f) => f.file.size > 50 * 1024 * 1024) && (
                <div className="flex items-center gap-2 p-2.5 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-700 dark:text-amber-300">
                  <span className="font-bold shrink-0">⚡ Max Speed:</span>
                  <span className="flex-1">
                    For multi-gigabit MTProto speeds (12+ MB/s) on large files without web browser limits, open the <strong>Global Send Desktop App</strong>.
                  </span>
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

          {/* EXPIRATION SELECTOR (Neo-Editorial Grouped Row) */}
          <div className="p-3.5 rounded-[20px] bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-neutral-900 dark:text-[#CDFF5D] shrink-0" />
              <span className="font-bold text-[#111111] dark:text-white uppercase tracking-wider font-mono text-[11px]">
                Auto-Delete:
              </span>
              <span className="text-neutral-500 font-mono text-xs tabular-nums">
                {previewExpirationLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedPresetSec(0)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer',
                  selectedPresetSec === 0
                    ? 'bg-[#CDFF5D] text-black shadow-xs'
                    : 'bg-white dark:bg-white/10 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-300/60 dark:border-white/10'
                )}
              >
                Permanent
              </button>
              {EXPIRATION_PRESETS.map((preset) => {
                const isSelected = selectedPresetSec === preset.seconds;
                return (
                  <button
                    key={preset.seconds}
                    type="button"
                    onClick={() => setSelectedPresetSec(preset.seconds)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer',
                      isSelected
                        ? 'bg-[#CDFF5D] text-black shadow-xs'
                        : 'bg-white dark:bg-white/10 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-300/60 dark:border-white/10'
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
                  'px-3 py-1.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer',
                  selectedPresetSec === 'custom'
                    ? 'bg-[#CDFF5D] text-black shadow-xs'
                    : 'bg-white dark:bg-white/10 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-300/60 dark:border-white/10'
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
                    className="w-16 px-2.5 py-1 rounded-full text-xs font-mono font-bold border border-neutral-300 dark:border-white/20 bg-white dark:bg-[#18181B] text-[#111111] dark:text-white tabular-nums"
                  />
                  <span className="text-[11px] font-mono font-bold text-neutral-400">hrs</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags & Submit Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-neutral-100 dark:bg-white/10 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-white/10">
                <Tag className="w-3.5 h-3.5 text-neutral-400" />
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
                  className="bg-transparent text-xs font-medium focus:outline-none w-28 text-[#111111] dark:text-white placeholder:text-neutral-400"
                />
              </div>
              {tags.map((t, i) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#CDFF5D] text-black shadow-2xs"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(i)}
                    className="hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-3 h-3 stroke-[3]" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (isUploading) handleCancelUpload();
                  setIsOpen(false);
                }}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {mode === 'text' && (
                <button
                  type="button"
                  onClick={handleSaveText}
                  disabled={!textContent.trim() || isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-neutral-950 font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Note</span>
                </button>
              )}

              {mode === 'upload' && (
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={pendingOrErrorFiles.length === 0 || isUploading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-neutral-950 font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {queuedFiles.some((e) => e.status === 'error')
                      ? `Retry Failed (${queuedFiles.filter((e) => e.status === 'error').length})`
                      : pendingOrErrorFiles.length > 1
                      ? `Upload ${pendingOrErrorFiles.length} Files`
                      : 'Upload File'}
                  </span>
                </button>
              )}

              {mode === 'link' && (
                <button
                  type="button"
                  onClick={handleSaveLink}
                  disabled={!linkUrl.trim() || isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-neutral-950 font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Link</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
