'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
  Link2,
  Clipboard,
  X,
  Tag,
  AlertCircle,
  Code,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { Item } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';
import { SITE_CONFIG } from '@/config/site';

interface QuickComposerProps {
  onItemCreated: (item: Item) => void;
  isOpenDefault?: boolean;
}

type ComposerMode = 'text' | 'upload' | 'link';

export function QuickComposer({ onItemCreated }: QuickComposerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ComposerMode>('text');

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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when text mode opens
  useEffect(() => {
    if (isOpen && mode === 'text') {
      setTimeout(() => textAreaRef.current?.focus(), 50);
    }
  }, [isOpen, mode]);

  // Keyboard shortcut Ctrl/Cmd + Enter to save
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
      toast.info('Clipboard permission denied. Please paste using keyboard shortcut');
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
    setIsOpen(false);
  };

  // 1. SAVE TEXT WORKFLOW
  const handleSaveText = async () => {
    if (!textContent.trim()) {
      toast.error('Please enter or paste some text');
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save text');
        return;
      }

      toast.success('Saved to QuickVault');
      onItemCreated(data.item);
      resetForm();
    } catch {
      toast.error('Could not save this text. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. SAVE LINK WORKFLOW
  const handleSaveLink = async () => {
    let url = linkUrl.trim();
    if (!url) {
      toast.error('Please enter a website URL');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          title: linkTitle.trim(),
          url,
          note: linkNote.trim(),
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save link');
        return;
      }

      toast.success('Link saved to QuickVault');
      onItemCreated(data.item);
      resetForm();
    } catch {
      toast.error('Could not save link. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. FILE UPLOAD WORKFLOW (R2 OR LOCAL FALLBACK)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > SITE_CONFIG.maxUploadSizeBytes) {
        toast.error(`File is too large. Limit is ${SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024)} MB`);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      // Step 1: Request upload URL & session check
      const initRes = await fetch('/api/storage/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          fileSize: selectedFile.size,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        setUploadError(initData.error || 'Failed to prepare upload');
        setIsUploading(false);
        return;
      }

      const { mode: uploadMode, uploadUrl, storageKey, itemId } = initData;

      // Step 2: Upload directly with progress tracking
      let createdItem: any = null;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 90);
            setUploadProgress(Math.max(10, pct));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              if (uploadMode !== 'r2') {
                const data = JSON.parse(xhr.responseText);
                createdItem = data.item;
              }
            } catch {
              // fallback
            }
            resolve();
          } else {
            let errMsg = `Upload failed with status ${xhr.status}`;
            try {
              const errData = JSON.parse(xhr.responseText);
              if (errData.error) errMsg = errData.error;
            } catch {
              // ignore
            }
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));

        if (uploadMode === 'r2') {
          // Direct to Cloudflare R2
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');
          xhr.send(selectedFile);
        } else {
          // Universal server upload (Google Drive or Local)
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('itemId', itemId);
          formData.append('title', title.trim() || selectedFile.name);
          if (tags.length > 0) {
            formData.append('tags', JSON.stringify(tags));
          }
          xhr.open('POST', uploadUrl);
          xhr.send(formData);
        }
      });

      setUploadProgress(95);

      // Step 3: Finalize upload with server if R2
      if (uploadMode === 'r2') {
        const confirmRes = await fetch('/api/storage/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            storageKey,
            originalFilename: selectedFile.name,
            mimeType: selectedFile.type || 'application/octet-stream',
            fileSize: selectedFile.size,
            title: title.trim() || selectedFile.name,
            tags,
          }),
        });

        const confirmData = await confirmRes.json();
        if (!confirmRes.ok) {
          setUploadError(confirmData.error || 'Failed to verify uploaded file');
          setIsUploading(false);
          return;
        }
        createdItem = confirmData.item;
      }

      setUploadProgress(100);
      toast.success('File saved to Global Send');
      if (createdItem) {
        onItemCreated(createdItem);
      }
      resetForm();
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Upload interrupted. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress(null);
  };

  return (
    <div className="w-full bg-white dark:bg-[#1c1c1e] rounded-3xl border border-[#e5e5ea] dark:border-[#38383a] shadow-sm transition-all duration-200 overflow-hidden mb-8">
      {/* COMPACT TRIGGER STATE */}
      {!isOpen ? (
        <div
          onClick={() => setIsOpen(true)}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
        >
          <div className="flex items-center gap-3 text-[#86868b] dark:text-[#98989d]">
            <div className="w-9 h-9 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
              Save a question, note, code, or file...
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#98989d]">
              Quick Save
            </span>
            <Button size="sm" variant="primary" className="h-8">
              New
            </Button>
          </div>
        </div>
      ) : (
        /* EXPANDED COMPOSER */
        <div className="p-4 sm:p-6" onKeyDown={handleKeyDown}>
          {/* Header with SegmentedControl & Close */}
          <div className="flex items-center justify-between pb-4 border-b border-[#e5e5ea]/60 dark:border-[#38383a]/60">
            <SegmentedControl<ComposerMode>
              value={mode}
              onChange={(m) => setMode(m)}
              options={[
                { value: 'text', label: 'Text / Question', icon: <FileText className="w-3.5 h-3.5" /> },
                { value: 'upload', label: 'Upload File', icon: <Upload className="w-3.5 h-3.5" /> },
                { value: 'link', label: 'Link', icon: <Link2 className="w-3.5 h-3.5" /> },
              ]}
            />

            <button
              type="button"
              onClick={resetForm}
              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close composer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. TEXT / QUESTION COMPOSER */}
          {mode === 'text' && (
            <div className="mt-4 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Title (optional — auto-generated from text if empty)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold placeholder:text-zinc-400 placeholder:font-normal focus:outline-none"
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCodeFont(!isCodeFont)}
                    className={cn(
                      'h-7 px-2 text-xs gap-1',
                      isCodeFont && 'bg-[#0071e3]/10 text-[#0071e3]'
                    )}
                    title="Toggle monospace font for code"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mono</span>
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handlePasteClipboard}
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </Button>
                </div>
              </div>

              {/* Multiline textarea preserving formatting & whitespace */}
              <textarea
                ref={textAreaRef}
                rows={6}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your exam question, programming assignment, code snippet, notes, or paragraphs here..."
                className={cn(
                  'w-full bg-[#f8f8fa] dark:bg-[#252528] rounded-2xl p-4 text-sm text-[#1d1d1f] dark:text-white placeholder:text-zinc-400 focus:outline-none border border-transparent focus:border-[#0071e3] transition-all resize-y leading-relaxed',
                  isCodeFont && 'font-mono text-xs leading-5 whitespace-pre'
                )}
              />

              {/* Tag selector */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#e5e5ea] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-zinc-200"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => removeTag(idx)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-zinc-400 ml-1" />
                  <input
                    type="text"
                    placeholder="Add tag (press Enter)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    className="bg-transparent text-xs text-[#1d1d1f] dark:text-white placeholder:text-zinc-400 focus:outline-none w-36"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#e5e5ea]/60 dark:border-[#38383a]/60">
                <span className="text-[11px] text-[#86868b] dark:text-[#98989d]">
                  Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">Ctrl+Enter</kbd> to save
                </span>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveText}
                    isLoading={isSaving}
                  >
                    Save to Locker
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 2. UPLOAD FILE COMPOSER */}
          {mode === 'upload' && (
            <div className="mt-4 space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setSelectedFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-[#d1d1d6] dark:border-[#38383a] hover:border-[#0071e3] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#fbfbfd] dark:bg-[#252528]/50"
                >
                  <div className="w-12 h-12 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                    Click to choose photo, video, PDF, or file
                  </p>
                  <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
                    or drag and drop here (up to {SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024)} MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1c1c1e] flex items-center justify-center text-[#0071e3] shrink-0">
                        <FileCode className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-[#1d1d1f] dark:text-white truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-[#86868b] dark:text-[#98989d]">
                          {formatBytes(selectedFile.size)} · {selectedFile.type || 'Binary file'}
                        </p>
                      </div>
                    </div>

                    {!isUploading && (
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <Input
                    placeholder="Optional title / description..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />

                  {uploadProgress !== null && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs text-[#86868b] dark:text-[#98989d]">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0071e3] transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    {isUploading ? (
                      <Button type="button" variant="ghost" size="sm" onClick={cancelUpload}>
                        Cancel Upload
                      </Button>
                    ) : (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleUploadFile}
                          isLoading={isUploading}
                        >
                          Upload & Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. LINK COMPOSER */}
          {mode === 'link' && (
            <div className="mt-4 space-y-3.5">
              <Input
                placeholder="https://example.com/question-or-resource"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                icon={<Link2 className="w-4 h-4" />}
                required
              />

              <Input
                placeholder="Title (optional — defaults to website domain)"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
              />

              <Input
                placeholder="Optional note / summary..."
                value={linkNote}
                onChange={(e) => setLinkNote(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e5ea]/60 dark:border-[#38383a]/60">
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveLink}
                  isLoading={isSaving}
                >
                  Save Link
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
