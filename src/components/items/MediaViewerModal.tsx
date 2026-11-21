'use client';

import React, { useState, useRef } from 'react';
import {
  Download,
  Star,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileCode,
  Music,
  Share2,
  Volume2,
  Play,
  Pause,
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
  onShare?: (item: Item) => void;
}

export function MediaViewerModal({
  item,
  isOpen,
  onClose,
  onDelete,
  onToggleFavourite,
  onShare,
}: MediaViewerModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!item || !item.file) return null;

  const downloadUrl = item.file.downloadUrl || '#';
  const isImage = item.type === 'image';
  const isVideo = item.type === 'video';
  const isAudio =
    (item.file.mimeType && item.file.mimeType.startsWith('audio/')) ||
    /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(item.file.originalFilename);

  const handleResetZoom = () => setZoomLevel(1);

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
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="text-[12px] font-mono text-[#6c6c70] dark:text-[#98989d] px-1 tabular-nums hover:text-black dark:hover:text-white"
                  title="Reset Zoom"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
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

            {onShare && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onShare(item);
                  onClose();
                }}
                title="Create Share Link"
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            )}

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
                alt=""
                style={{ transform: `scale(${zoomLevel})` }}
                onLoad={(e) => {
                  if (!item.file?.thumbnailData && item.id) {
                    try {
                      const img = e.currentTarget;
                      const maxDim = 320;
                      let w = img.naturalWidth || 320;
                      let h = img.naturalHeight || 200;
                      if (w > maxDim || h > maxDim) {
                        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                        else { w = Math.round((w * maxDim) / h); h = maxDim; }
                      }
                      const canvas = document.createElement('canvas');
                      canvas.width = w; canvas.height = h;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(img, 0, 0, w, h);
                        const thumb = canvas.toDataURL('image/webp', 0.8);
                        fetch('/api/items/thumbnail', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ itemId: item.id, thumbnailData: thumb }),
                        }).catch(() => {});
                      }
                    } catch {}
                  }
                }}
                className="max-h-[58vh] max-w-full object-contain transition-transform duration-150 rounded-[10px] select-none"
              />
            </div>
          ) : isVideo ? (
            <video
              src={downloadUrl}
              controls
              playsInline
              preload="metadata"
              onLoadedData={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                if (!item.file?.thumbnailData && item.id) {
                  try {
                    const video = e.currentTarget;
                    if (video.videoWidth > 0) {
                      const maxDim = 320;
                      let w = video.videoWidth;
                      let h = video.videoHeight;
                      if (w > maxDim || h > maxDim) {
                        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                        else { w = Math.round((w * maxDim) / h); h = maxDim; }
                      }
                      const canvas = document.createElement('canvas');
                      canvas.width = w; canvas.height = h;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(video, 0, 0, w, h);
                        const thumb = canvas.toDataURL('image/webp', 0.8);
                        fetch('/api/items/thumbnail', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ itemId: item.id, thumbnailData: thumb }),
                        }).catch(() => {});
                      }
                    }
                  } catch {}
                }
              }}
              className="max-h-[58vh] max-w-full rounded-[10px] bg-black shadow-lg"
            >
              Your browser does not support HTML5 video playback.
            </video>
          ) : isAudio ? (
            <div className="w-full max-w-md p-8 flex flex-col items-center justify-center space-y-5 text-center">
              <div className="w-20 h-20 rounded-full bg-[#CDFF5D]/10 border border-[#CDFF5D]/20 text-[#CDFF5D] flex items-center justify-center shadow-lg animate-pulse">
                <Music className="w-10 h-10 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-neutral-900 dark:text-white truncate max-w-xs">
                  {item.file.originalFilename}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  {formatBytes(item.file.fileSize)} • Audio Stream
                </p>
              </div>
              <audio
                ref={audioRef}
                src={downloadUrl}
                controls
                preload="metadata"
                className="w-full h-12 rounded-xl focus:outline-none"
              >
                Your browser does not support HTML5 audio playback.
              </audio>
            </div>
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
