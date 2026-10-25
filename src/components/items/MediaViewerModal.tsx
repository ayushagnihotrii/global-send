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
    <Modal isOpen={isOpen} onClose={onClose} title={item.title} maxWidth="4xl">
      <div className="space-y-4">
        {/* Top Quick Look Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/[0.07] dark:border-white/[0.09]">
          <p className="text-[12px] text-[#8e8e93] tabular-nums truncate">
            {item.file.originalFilename} · {formatBytes(item.file.fileSize)} · {formatDate(item.createdAt)}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap">
            {isImage && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="h-8 w-8"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[12px] font-mono text-[#6c6c70] dark:text-[#98989d] px-1 tabular-nums">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="h-8 w-8"
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
              title="Favourite"
            >
              <Star
                className={`w-3.5 h-3.5 ${item.isFavourite ? 'fill-[#ffcc00] text-[#ffcc00]' : ''}`}
              />
            </Button>

            <a
              href={downloadUrl}
              download={item.file.originalFilename}
              className="inline-flex items-center justify-center font-medium rounded-[8px] transition-colors h-8 px-3 text-[13px] gap-1.5 bg-[#007aff] hover:bg-[#0062cc] dark:bg-[#0a84ff] text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                onDelete(item);
                onClose();
              }}
              className="h-8 w-8 text-[#ff3b30] hover:bg-[#ff3b30]/10"
              title="Move to Recently Deleted"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Quick Look Stage */}
        <div className="min-h-[320px] max-h-[65vh] flex items-center justify-center bg-[#f2f2f7] dark:bg-[#000000] border border-black/[0.06] dark:border-white/[0.08] rounded-[14px] overflow-hidden p-3 relative">
          {isImage ? (
            <div className="relative overflow-auto max-h-[60vh] max-w-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={downloadUrl}
                alt={item.title}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[58vh] max-w-full object-contain transition-transform duration-150 rounded-[10px] select-none"
              />
            </div>
          ) : isVideo ? (
            <video
              src={downloadUrl}
              controls
              playsInline
              preload="metadata"
              className="max-h-[58vh] max-w-full rounded-[10px] bg-black"
            >
              Your browser does not support HTML5 video playback.
            </video>
          ) : (
            <div className="text-center p-8 space-y-3.5">
              <div className="w-16 h-16 rounded-[16px] bg-[#007aff]/10 dark:bg-[#0a84ff]/18 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center mx-auto">
                <FileCode className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {item.file.originalFilename}
                </h4>
                <p className="text-[12px] text-[#8e8e93] mt-0.5 tabular-nums">
                  {formatBytes(item.file.fileSize)} · {item.file.mimeType}
                </p>
              </div>
              <a
                href={downloadUrl}
                download={item.file.originalFilename}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#007aff] hover:bg-[#0062cc] dark:bg-[#0a84ff] text-white text-[14px] font-medium transition-colors"
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
