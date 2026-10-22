export type ItemType = 'text' | 'link' | 'image' | 'video' | 'file';

export interface FileMetadata {
  id: string;
  itemId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadStatus: 'pending' | 'completed' | 'failed';
  downloadUrl?: string;
}

export interface LockerItem {
  id: string;
  userId: string;
  type: ItemType;
  title?: string;
  content?: string;
  isFavourite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  file?: FileMetadata;
}

export interface UserProfile {
  id: string;
  username: string;
  storageLimitBytes: number;
  createdAt: string;
}

export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
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

export interface GoogleDriveStatus {
  connected: boolean;
  configured: boolean;
  email?: string;
  storageQuota?: {
    limitBytes: number;
    usageBytes: number;
    usageInDriveBytes: number;
  };
}
