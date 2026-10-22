export type ItemType = 'text' | 'link' | 'image' | 'video' | 'file';

export interface User {
  id: string;
  username: string;
  createdAt: string;
  storageLimitBytes: number;
}

export interface FileMetadata {
  id: string;
  itemId: string;
  userId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadStatus: 'pending' | 'completed' | 'failed';
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

export interface AuthSession {
  userId: string;
  username: string;
}
