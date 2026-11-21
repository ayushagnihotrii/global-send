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
    let isSettled = false;
    let timeoutId: any = null;

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const cleanUp = () => {
      if (timeoutId) clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    const captureFrame = () => {
      if (isSettled) return;
      isSettled = true;

      try {
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
      } catch (err) {
        cleanUp();
        reject(err);
      }
    };

    // 3.5s safety timeout to prevent hanging uploads if codec cannot be decoded
    timeoutId = setTimeout(() => {
      if (!isSettled) {
        if (video.videoWidth > 0) {
          captureFrame();
        } else {
          cleanUp();
          reject(new Error('Video thumbnail extraction timed out'));
        }
      }
    }, 3500);

    video.onloadedmetadata = () => {
      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 2;
      const targetTime = Math.min(seekTimeSec, Math.max(0.1, dur / 2));
      try {
        video.currentTime = targetTime;
      } catch {
        captureFrame();
      }
    };

    video.onseeked = () => {
      captureFrame();
    };

    video.oncanplay = () => {
      if (!isSettled && video.videoWidth > 0 && video.currentTime > 0) {
        captureFrame();
      }
    };

    video.onerror = () => {
      if (!isSettled) {
        cleanUp();
        reject(new Error('Failed to load video for thumbnail extraction'));
      }
    };

    video.src = objectUrl;
  });
}

/**
 * High-level helper: Extracts a preview thumbnail from any supported media File.
 * Resilient against missing Windows MIME associations by inspecting extension.
 */
export async function extractMediaThumbnail(file: File): Promise<string | null> {
  try {
    const filename = file.name || '';
    const isImage =
      (file.type && file.type.startsWith('image/')) ||
      /\.(jpe?g|png|webp|gif|svg|bmp|ico|heic|avif)$/i.test(filename);
    const isVideo =
      (file.type && file.type.startsWith('video/')) ||
      /\.(mp4|webm|mov|mkv|avi|m4v|3gp|wmv|flv)$/i.test(filename);

    if (isImage) {
      const result = await generateImageThumbnail(file);
      return result.dataUrl;
    }
    if (isVideo) {
      const result = await generateVideoThumbnail(file);
      return result.dataUrl;
    }
  } catch (err) {
    console.warn('[Thumbnail Generator] Notice: Thumbnail could not be extracted:', err);
  }
  return null;
}
