/**
 * Global Send: Resumable Chunked File Uploader
 * Slices massive files (up to 10 GB+) into 16 MB chunks, encrypts each chunk
 * with AES-256-GCM, and uploads them with per-chunk retry and network drop recovery.
 */

import {
  generateFileKey,
  generateIvBase,
  exportKeyToBase64Url,
  encryptChunk,
} from '@/lib/crypto/client-encryption';

export interface ChunkUploadOptions {
  file: File;
  chunkSize?: number; // 4 MB default (fully compatible with Vercel's 4.5 MB payload limit)
  sessionId?: string;
  itemId?: string;
  expirationSeconds?: number;
  onProgress?: (progress: {
    bytesUploaded: number;
    totalBytes: number;
    percentage: number;
    currentChunk: number;
    totalChunks: number;
  }) => void;
  onError?: (err: Error) => void;
}

export interface ChunkUploadResult {
  fileId: string;
  itemId: string;
  sessionId: string;
  totalSize: number;
  keyFragment: string; // The base64url key to put in URL #fragment
  baseIvBase64: string;
}

export class ResumableChunkUploader {
  private file: File;
  private chunkSize: number;
  private isPaused = false;
  private isAborted = false;
  private activeUploadSessionUrl?: string;

  constructor(file: File, chunkSize = 4 * 1024 * 1024) {
    this.file = file;
    // Default to 4 MB to stay well below Vercel's 4.5 MB Serverless Function payload limit
    this.chunkSize = chunkSize;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public abort(): void {
    this.isAborted = true;
  }

  public async start(options: ChunkUploadOptions): Promise<ChunkUploadResult> {
    if (options.chunkSize) {
      this.chunkSize = options.chunkSize;
    }

    const totalBytes = this.file.size;

    // 1. Generate per-file AES-GCM key and base IV
    const fileKey = await generateFileKey();
    const baseIv = generateIvBase();
    const keyFragment = await exportKeyToBase64Url(fileKey);

    // Convert baseIv to binary string base64 for metadata
    let binaryIv = '';
    for (let i = 0; i < baseIv.length; i++) {
      binaryIv += String.fromCharCode(baseIv[i]);
    }
    const baseIvBase64 = btoa(binaryIv);

    // 2. Initialize Upload Session with backend
    const initRes = await fetch('/api/storage/upload-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: this.file.name,
        mimeType: this.file.type || 'application/octet-stream',
        fileSize: totalBytes,
        title: this.file.name,
        expirationSeconds: options.expirationSeconds || 86400,
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to initialize upload session');
    }

    const sessionData = await initRes.json();
    const sessionId = sessionData.sessionId;
    const itemId = sessionData.itemId;

    if (sessionData.chunkSize && !options.chunkSize) {
      // Adopt backend recommended chunk size if bounded
      this.chunkSize = Math.min(this.chunkSize, sessionData.chunkSize);
    }

    const totalChunks = Math.max(1, Math.ceil(totalBytes / this.chunkSize));

    // 3. Upload chunks sequentially or with retry
    let bytesUploaded = 0;

    for (let i = 0; i < totalChunks; i++) {
      if (this.isAborted) {
        throw new Error('Upload aborted');
      }

      // Handle pause loop
      while (this.isPaused) {
        await new Promise((r) => setTimeout(r, 200));
        if (this.isAborted) throw new Error('Upload aborted');
      }

      const start = i * this.chunkSize;
      const end = Math.min((i + 1) * this.chunkSize, totalBytes);
      const rawChunkSlice = await this.file.slice(start, end).arrayBuffer();

      // Encrypt chunk locally on device
      const encryptedChunk = await encryptChunk(rawChunkSlice, fileKey, i, baseIv);

      // Upload chunk with exponential backoff retry (up to 5 retries on spotty Wi-Fi)
      let attempt = 0;
      let success = false;
      let lastError: any = null;

      while (attempt < 5 && !success) {
        if (this.isAborted) throw new Error('Upload aborted');
        try {
          const putRes = await fetch(
            `/api/storage/upload-session?sessionId=${encodeURIComponent(sessionId)}&offset=${start}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/octet-stream',
              },
              body: encryptedChunk,
            }
          );

          if (!putRes.ok) {
            throw new Error(`Chunk upload failed with HTTP ${putRes.status}`);
          }

          success = true;
          bytesUploaded += (end - start);

          if (options.onProgress) {
            options.onProgress({
              bytesUploaded,
              totalBytes,
              percentage: Math.min(100, Math.round((bytesUploaded / totalBytes) * 100)),
              currentChunk: i + 1,
              totalChunks,
            });
          }
        } catch (err: any) {
          attempt++;
          lastError = err;
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      if (!success) {
        throw new Error(
          `Failed to upload chunk ${i + 1}/${totalChunks} after 5 attempts: ${lastError?.message}`
        );
      }
    }

    return {
      fileId: itemId,
      itemId,
      sessionId,
      totalSize: totalBytes,
      keyFragment,
      baseIvBase64,
    };
  }
}
