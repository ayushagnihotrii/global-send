/**
 * Client-Side Media Thumbnail Engine (Zero-Knowledge E2EE Safe)
 * Generates compact visual preview thumbnails directly in the browser.
 * No unencrypted frames or pixels are ever sent to remote servers.
 */

export interface ThumbnailResult {
  dataUrl: string;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Generates a scaled WebP/JPEG thumbnail data URL from an image File/Blob.
 */
export async function generateImageThumbnail(
  file: Blob,
  maxDimension = 320,
  quality = 0.8
): Promise<ThumbnailResult> {
  if (typeof window === 'undefined') {
    throw new Error('Client-side thumbnail generation requires a browser window environment.');
  }

  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP for high compression, fallback to JPEG
      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/webp', quality);
      } catch {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      resolve({
        dataUrl,
        width,
        height,
        mimeType: 'image/webp',
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for thumbnail generation'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates a video frame thumbnail at a given time offset using an offscreen <video> element.
 */
export async function generateVideoThumbnail(
  file: Blob,
  seekTimeSec = 1.0,
  maxDimension = 320,
  quality = 0.8
): Promise<ThumbnailResult> {
  if (typeof window === 'undefined') {
    throw new Error('Client-side thumbnail generation requires a browser window environment.');
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      const targetTime = Math.min(seekTimeSec, Math.max(0.1, video.duration / 2));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      let width = video.videoWidth || 320;
      let height = video.videoHeight || 180;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanUp();
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);

      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/webp', quality);
      } catch {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      cleanUp();
      resolve({
        dataUrl,
        width,
        height,
        mimeType: 'image/webp',
      });
    };

    video.onerror = () => {
      cleanUp();
      reject(new Error('Failed to load video for thumbnail extraction'));
    };

    video.src = objectUrl;
  });
}

/**
 * High-level helper: Extracts a preview thumbnail from any supported media File.
 */
export async function extractMediaThumbnail(file: File): Promise<string | null> {
  try {
    if (file.type.startsWith('image/')) {
      const result = await generateImageThumbnail(file);
      return result.dataUrl;
    }
    if (file.type.startsWith('video/')) {
      const result = await generateVideoThumbnail(file);
      return result.dataUrl;
    }
  } catch (err) {
    console.warn('[Thumbnail Generator] Notice: Thumbnail could not be extracted:', err);
  }
  return null;
}
