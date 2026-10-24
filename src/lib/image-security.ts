/**
 * Global Send: Profile Picture Validation & Metadata Stripping
 * Enforces strict 100 KiB (102,400 bytes) maximum size, magic-byte signature verification
 * (JPEG, PNG, WebP only; rejects SVG/HTML/executable content), and strips EXIF/ancillary metadata.
 */

import { SITE_CONFIG } from '@/config/site';

export type AllowedAvatarMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ValidatedAvatarResult {
  valid: boolean;
  mimeType?: AllowedAvatarMime;
  extension?: 'jpg' | 'png' | 'webp';
  sanitizedBuffer?: Buffer;
  sizeBytes?: number;
  error?: string;
}

/**
 * Inspects actual binary magic bytes to determine image format.
 * Never trusts client-provided MIME type or filename extension.
 */
export function detectImageMagicBytes(buf: Buffer): AllowedAvatarMime | null {
  if (!buf || buf.length < 12) return null;

  // Reject any text/XML/SVG/script payloads immediately
  const headStr = buf.subarray(0, Math.min(256, buf.length)).toString('utf8').trimStart().toLowerCase();
  if (
    headStr.startsWith('<svg') ||
    headStr.startsWith('<?xml') ||
    headStr.startsWith('<!doctype') ||
    headStr.startsWith('<html') ||
    headStr.startsWith('<script') ||
    headStr.includes('<svg')
  ) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // 3. WebP: "RIFF" (52 49 46 46) at 0..3 and "WEBP" (57 45 42 50) at 8..11
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Strips EXIF (APP1..APP15) and Comment (COM) segments from a JPEG buffer.
 */
export function stripJpegMetadata(buf: Buffer): Buffer {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf;

  const chunks: Buffer[] = [Buffer.from([0xff, 0xd8])];
  let offset = 2;

  while (offset < buf.length) {
    if (buf[offset] !== 0xff) {
      // Malformed marker, return original if safe or remaining entropy
      chunks.push(buf.subarray(offset));
      break;
    }

    // Skip padding 0xFF bytes
    while (offset < buf.length && buf[offset] === 0xff) {
      offset++;
    }
    if (offset >= buf.length) break;

    const marker = buf[offset];
    offset++;

    // Standalone markers without length
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(Buffer.from([0xff, marker]));
      continue;
    }

    // EOI (End of Image)
    if (marker === 0xd9) {
      chunks.push(Buffer.from([0xff, 0xd9]));
      break;
    }

    if (offset + 2 > buf.length) {
      break;
    }

    const segLength = buf.readUInt16BE(offset);
    if (segLength < 2 || offset + segLength > buf.length) {
      break;
    }

    // SOS (Start of Scan): copy SOS header and all remaining compressed scan data up to EOI
    if (marker === 0xda) {
      chunks.push(Buffer.from([0xff, marker]));
      chunks.push(buf.subarray(offset));
      break;
    }

    // Strip APP1..APP15 (0xE1..0xEF, includes EXIF/XMP/ICC) and COM (0xFE)
    const isMetadataSegment = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadataSegment) {
      chunks.push(Buffer.from([0xff, marker]));
      chunks.push(buf.subarray(offset, offset + segLength));
    }

    offset += segLength;
  }

  return Buffer.concat(chunks);
}

/**
 * Strips EXIF and textual metadata chunks (eXIf, tEXt, zTXt, iTXt, tIME) from a PNG buffer.
 */
export function stripPngMetadata(buf: Buffer): Buffer {
  if (buf.length < 8) return buf;
  const signature = buf.subarray(0, 8);
  const chunks: Buffer[] = [signature];
  let offset = 8;

  const strippedTypes = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const totalChunkLen = 12 + length;

    if (offset + totalChunkLen > buf.length) {
      break;
    }

    if (!strippedTypes.has(type)) {
      chunks.push(buf.subarray(offset, offset + totalChunkLen));
    }

    offset += totalChunkLen;
    if (type === 'IEND') break;
  }

  return Buffer.concat(chunks);
}

/**
 * Validates and sanitizes a profile picture upload buffer.
 * Enforces the strict 100 KiB (102,400 bytes) maximum limit and JPEG/PNG/WebP magic bytes.
 */
export function validateAndSanitizeAvatar(
  rawBuffer: Buffer,
  declaredMimeType?: string,
  originalFilename?: string
): ValidatedAvatarResult {
  if (!rawBuffer || rawBuffer.length === 0) {
    return { valid: false, error: 'Profile picture file is empty' };
  }

  if (rawBuffer.length > SITE_CONFIG.maxAvatarSizeBytes) {
    return {
      valid: false,
      error: `Profile picture exceeds the strict 100 KiB (102,400 bytes) limit (received ${rawBuffer.length.toLocaleString()} bytes).`,
    };
  }

  // Reject SVG filenames or MIME types explicitly
  if (
    declaredMimeType?.toLowerCase().includes('svg') ||
    originalFilename?.toLowerCase().endsWith('.svg')
  ) {
    return {
      valid: false,
      error: 'SVG files are not permitted for profile pictures. Please upload a JPEG, PNG, or WebP image.',
    };
  }

  const detectedMime = detectImageMagicBytes(rawBuffer);
  if (!detectedMime) {
    return {
      valid: false,
      error: 'Invalid or unsupported image content. Only authentic JPEG, PNG, and WebP images are allowed.',
    };
  }

  let sanitizedBuffer = rawBuffer;
  let extension: 'jpg' | 'png' | 'webp' = 'jpg';

  if (detectedMime === 'image/jpeg') {
    sanitizedBuffer = stripJpegMetadata(rawBuffer);
    extension = 'jpg';
  } else if (detectedMime === 'image/png') {
    sanitizedBuffer = stripPngMetadata(rawBuffer);
    extension = 'png';
  } else if (detectedMime === 'image/webp') {
    extension = 'webp';
  }

  if (sanitizedBuffer.length > SITE_CONFIG.maxAvatarSizeBytes) {
    return {
      valid: false,
      error: 'Profile picture exceeds the maximum allowed size of 100 KiB (102,400 bytes).',
    };
  }

  return {
    valid: true,
    mimeType: detectedMime,
    extension,
    sanitizedBuffer,
    sizeBytes: sanitizedBuffer.length,
  };
}
