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
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]/60 dark:border-[#38383a]/60">
          <div>
            <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white truncate max-w-sm sm:max-w-md">
              {item.title}
            </h3>
            <p className="text-xs text-[#86868b] dark:text-[#98989d]">
              {item.file.originalFilename} · {formatBytes(item.file.fileSize)} · Saved {formatDate(item.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {isImage && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="h-8 w-8 p-0"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
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
              variant={item.isFavourite ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onToggleFavourite(item)}
              className="h-8 px-2.5 text-xs"
              title="Favourite"
            >
              <Star
                className={`w-3.5 h-3.5 ${item.isFavourite ? 'fill-[#ff9500] text-[#ff9500]' : ''}`}
              />
            </Button>

            <a
              href={downloadUrl}
              download={item.file.originalFilename}
              className="inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 h-8 px-3 text-xs gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm"
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
              className="h-8 w-8 p-0 text-[#ff3b30] hover:bg-red-50 dark:hover:bg-red-950/40"
              title="Move to Trash"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Media Preview Area */}
        <div className="min-h-[300px] max-h-[65vh] flex items-center justify-center bg-[#f8f8fa] dark:bg-[#121214] rounded-2xl overflow-hidden p-2 relative">
          {isImage ? (
            <div className="relative overflow-auto max-h-[60vh] max-w-full flex items-center justify-center">
              <img
                src={downloadUrl}
                alt={item.title}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[58vh] max-w-full object-contain transition-transform duration-150 rounded-lg select-none"
              />
            </div>
          ) : isVideo ? (
            <video
              src={downloadUrl}
              controls
              playsInline
              preload="metadata"
              className="max-h-[58vh] max-w-full rounded-xl shadow-lg"
            >
              Your browser does not support HTML5 video playback.
            </video>
          ) : (
            /* Document / File Preview */
            <div className="text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center mx-auto">
                <FileCode className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                  {item.file.originalFilename}
                </h4>
                <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
                  {formatBytes(item.file.fileSize)} · {item.file.mimeType}
                </p>
              </div>
              <a
                href={downloadUrl}
                download={item.file.originalFilename}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071e3] text-white text-sm font-medium hover:bg-[#0077ed] transition-colors shadow-sm"
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
