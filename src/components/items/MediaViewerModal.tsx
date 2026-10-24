'use client';

import React, { useState } from 'react';
import {
  Download,
  Star,
  Trash2,
  ZoomIn,
  ZoomOut,
  FileCode,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Item } from '@/lib/types';
import { formatBytes, formatDate } from '@/lib/utils';

interface MediaViewerModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (item: Item) => void;
  onToggleFavourite: (item: Item) => void;
}

export function MediaViewerModal({
  item,
  isOpen,
  onClose,
  onDelete,
  onToggleFavourite,
}: MediaViewerModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!item || !item.file) return null;

  const downloadUrl = item.file.downloadUrl || '#';
  const isImage = item.type === 'image';
  const isVideo = item.type === 'video';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="4xl">
      <div className="space-y-4">
        {/* Top Control Bar (Quick Share Stage Toolbar style) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#e5edf6] dark:border-[#344257]">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#0f172b] dark:text-white truncate max-w-sm sm:max-w-md tracking-tight">
              {item.title}
            </h3>
            <p className="text-xs text-[#65758b] dark:text-[#a4b5ce] tabular-nums mt-0.5">
              {item.file.originalFilename} · {formatBytes(item.file.fileSize)} · Saved {formatDate(item.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {isImage && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="h-8 w-8 p-0"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs font-mono font-semibold text-[#53667a] dark:text-[#a4b5ce] px-1 tabular-nums">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="h-8 w-8 p-0"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            <Button
              type="button"
              variant={item.isFavourite ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onToggleFavourite(item)}
              className="h-8 px-2.5 text-xs"
              title="Favourite"
            >
              <Star
                className={`w-3.5 h-3.5 ${item.isFavourite ? 'fill-[#f59e0b] text-[#f59e0b]' : ''}`}
              />
            </Button>

            <a
              href={downloadUrl}
              download={item.file.originalFilename}
              className="qs-primary-btn inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 h-8.5 px-3.5 text-xs gap-1.5 text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete(item);
                onClose();
              }}
              className="h-8 w-8 p-0 text-[#e11d48] hover:bg-[#fff1f2] dark:hover:bg-[#3e2124]"
              title="Move to Trash"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Media Preview Area */}
        <div className="min-h-[320px] max-h-[65vh] flex items-center justify-center bg-[#f5f8fb] dark:bg-[#172235] border border-[#dce8f5] dark:border-[#34465e] rounded-2xl overflow-hidden p-3 relative">
          {isImage ? (
            <div className="relative overflow-auto max-h-[60vh] max-w-full flex items-center justify-center">
              <img
                src={downloadUrl}
                alt={item.title}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[58vh] max-w-full object-contain transition-transform duration-150 rounded-xl select-none"
              />
            </div>
          ) : isVideo ? (
            <video
              src={downloadUrl}
              controls
              playsInline
              preload="metadata"
              className="max-h-[58vh] max-w-full rounded-xl shadow-lg bg-[#081220]"
            >
              Your browser does not support HTML5 video playback.
            </video>
          ) : (
            /* Document / File Preview (Quick Share File Stage style) */
            <div className="text-center p-8 space-y-4">
              <div className="w-18 h-18 rounded-2xl bg-[#eaf4ff] dark:bg-[#203954] border border-[#dbe9fa] dark:border-[#344b65] text-[#1677df] dark:text-[#60a5fa] flex items-center justify-center mx-auto shadow-2xs">
                <FileCode className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#0f172b] dark:text-white">
                  {item.file.originalFilename}
                </h4>
                <p className="text-xs text-[#65758b] dark:text-[#a4b5ce] mt-1 tabular-nums">
                  {formatBytes(item.file.fileSize)} · {item.file.mimeType}
                </p>
              </div>
              <a
                href={downloadUrl}
                download={item.file.originalFilename}
                className="qs-primary-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
              >
                <Download className="w-4 h-4" />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
