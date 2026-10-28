export type ItemType = 'text' | 'link' | 'image' | 'video' | 'file';

export interface User {
  id: string;
  username: string;
  displayUsername: string;
  createdAt: string;
  lastLoginAt?: string | null;
  storageLimitBytes: number;
  avatarUrl?: string | null;
  avatarSizeBytes?: number;
  isAdmin?: boolean;
  hasSecurityQuestion?: boolean;
  securityQuestionUpdatedAt?: string | null;
  keyResetAt?: string | null;
}

export interface PublicUserProfile {
  username: string;
  avatarUrl?: string | null;
}

export interface FileMetadata {
  id: string;
  itemId: string;
  userId: string;
  storageKey: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  fileSize: number;
  storageProvider: string;
  uploadStatus: 'pending' | 'completed' | 'failed';
  deletionStatus?: 'active' | 'pending_deletion' | 'deleted' | 'deletion_failed';
  downloadUrl?: string;
  createdAt: string;
}

export interface Item {
  id: string;
  userId: string;
  type: ItemType;
  title: string;
  textContent?: string | null;
  url?: string | null;
  note?: string | null;
  isFavourite: boolean;
  expiresAt: string;
  expirationDurationSec: number;
  isExpired?: boolean;
  deletionStatus?: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  file?: FileMetadata | null;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface DateGroupedItems {
  title: string;
  key: string;
  items: Item[];
}

export interface StorageUsage {
  usedBytes: number;
  reservedBytes: number;
  avatarBytes: number;
  limitBytes: number;
  globalUsedBytes: number;
  globalReservedBytes: number;
  globalLimitBytes: number;
  globalAvailableBytes: number;
  safetyReserveBytes: number;
  itemCount: number;
  fileCount: number;
  breakdown: {
    texts: number;
    photos: number;
    videos: number;
    files: number;
    links: number;
  };
}

export interface AuthSession {
  userId: string;
  username: string;
  sessionVersion?: number;
}

export interface SharedAttachmentInfo {
  itemId: string | null;
  title: string;
  type: ItemType | string;
  textContent?: string | null;
  url?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  expiresAt: string | null;
  isExpired: boolean;
  isDeleted: boolean;
  isAvailable: boolean;
  downloadUrl?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUsername: string;
  isOwnMessage: boolean;
  messageType: 'text' | 'attachment';
  textContent?: string | null;
  attachment?: SharedAttachmentInfo | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  peer: PublicUserProfile;
  isBlockedByMe: boolean;
  hasBlockedMe: boolean;
  lastMessageAt: string;
  lastMessagePreview?: string | null;
  createdAt: string;
}
