/**
 * Global Send: Android Share Sheet Integration Plan & Receiver Service
 *
 * This service handles incoming Android Intent ACTION_SEND and ACTION_SEND_MULTIPLE
 * broadcasts when a user taps "Share" from other Android apps (Browser, Gallery, Files, WhatsApp, etc.).
 */

import { api } from './api';
import { mobileStorage } from './storage';

export interface SharedDataPayload {
  mimeType: string;
  data: string; // Text content, URL, or local file URI (content:// or file://)
  extraText?: string;
  extraSubject?: string;
}

export class AndroidShareHandler {
  /**
   * Processes shared data received via Android Intent and saves directly to Global Send.
   */
  static async handleIncomingShare(payload: SharedDataPayload): Promise<{ success: boolean; itemId?: string; error?: string }> {
    const token = await mobileStorage.getAuthToken();
    if (!token) {
      return { success: false, error: 'Not signed in. Please open Global Send and sign in first.' };
    }

    try {
      const mime = payload.mimeType.toLowerCase();

      // Case 1: Plain text or shared Web Link
      if (mime.startsWith('text/')) {
        const text = payload.data.trim();
        const urlMatch = text.match(/https?:\/\/[^\s]+/i);

        if (urlMatch && (text === urlMatch[0] || !text.includes('\n'))) {
          // Shared link
          const res = await api.createLinkItem(urlMatch[0], payload.extraSubject || 'Shared Link', ['shared', 'link']);
          return { success: true, itemId: res.item.id };
        } else {
          // Shared text note or question
          const title = payload.extraSubject || text.split('\n')[0].slice(0, 50);
          const res = await api.createTextItem(title, text, ['shared', 'android']);
          return { success: true, itemId: res.item.id };
        }
      }

      // Case 2: Shared Image, Video, or Document
      const fileUri = payload.data;
      const filename = payload.extraSubject || `shared_${Date.now()}.${mime.split('/')[1] || 'bin'}`;
      const res = await api.uploadFile(fileUri, filename, mime, {
        title: payload.extraSubject || filename,
        tags: ['shared', 'mobile'],
      });

      return { success: true, itemId: res.item.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save shared content' };
    }
  }
}
