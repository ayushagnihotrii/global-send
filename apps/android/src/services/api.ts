import { mobileStorage } from './storage';
import { LockerItem, UserProfile, StorageUsage, GoogleDriveStatus } from '../types';
import * as FileSystem from 'expo-file-system';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class ApiService {
  private async getHeaders(contentType: string | null = 'application/json'): Promise<Record<string, string>> {
    const token = await mobileStorage.getAuthToken();
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const serverUrl = await mobileStorage.getServerUrl();
    const cleanBase = serverUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${cleanBase}${cleanEndpoint}`;

    const headers = await this.getHeaders(
      options.body instanceof FormData ? null : 'application/json'
    );

    const mergedOptions: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    };

    const res = await fetch(url, mergedOptions);

    if (res.status === 401) {
      await mobileStorage.clearAuth();
      throw new ApiError('Session expired. Please sign in again.', 401);
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError(data.error || `Request failed with status ${res.status}`, res.status);
    }

    return data as T;
  }

  // --- AUTHENTICATION ---
  async login(username: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await this.request<{ success: boolean; token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) {
      await mobileStorage.setAuthToken(res.token);
    }
    return res;
  }

  async register(username: string, password: string): Promise<{ token: string; user: UserProfile; recoveryCode: string }> {
    const res = await this.request<{ success: boolean; token: string; user: UserProfile; recoveryCode: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) {
      await mobileStorage.setAuthToken(res.token);
    }
    return res;
  }

  async getMe(): Promise<{ authenticated: boolean; user: UserProfile }> {
    return this.request<{ authenticated: boolean; user: UserProfile }>('/api/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      await mobileStorage.clearAuth();
    }
  }

  // --- ITEMS & CONTENT ---
  async getItems(params?: {
    type?: string;
    search?: string;
    tag?: string;
    favourite?: boolean;
    trash?: boolean;
  }): Promise<{ items: LockerItem[] }> {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.search) query.set('search', params.search);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.favourite) query.set('favourite', 'true');
    if (params?.trash) query.set('trash', 'true');

    const qs = query.toString();
    return this.request<{ items: LockerItem[] }>(`/api/items${qs ? `?${qs}` : ''}`);
  }

  async getItem(id: string): Promise<{ item: LockerItem }> {
    return this.request<{ item: LockerItem }>(`/api/items/${id}`);
  }

  async createTextItem(title: string, content: string, tags: string[] = []): Promise<{ item: LockerItem }> {
    return this.request<{ item: LockerItem }>('/api/items', {
      method: 'POST',
      body: JSON.stringify({
        type: 'text',
        title: title.trim() || undefined,
        content,
        tags,
      }),
    });
  }

  async createLinkItem(url: string, title?: string, tags: string[] = []): Promise<{ item: LockerItem }> {
    return this.request<{ item: LockerItem }>('/api/items', {
      method: 'POST',
      body: JSON.stringify({
        type: 'link',
        title: title?.trim() || url,
        content: url,
        tags,
      }),
    });
  }

  async updateItem(id: string, updates: { title?: string; content?: string; tags?: string[] }): Promise<{ item: LockerItem }> {
    return this.request<{ item: LockerItem }>(`/api/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async toggleFavourite(id: string): Promise<{ isFavourite: boolean }> {
    return this.request<{ isFavourite: boolean }>(`/api/items/${id}/favourite`, {
      method: 'POST',
    });
  }

  async deleteItem(id: string, permanent: boolean = false): Promise<{ success: boolean }> {
    const endpoint = permanent ? `/api/items/${id}?permanent=true` : `/api/items/${id}`;
    return this.request<{ success: boolean }>(endpoint, { method: 'DELETE' });
  }

  // --- FILE UPLOADS & DOWNLOADS ---
  async uploadFile(
    fileUri: string,
    filename: string,
    mimeType: string,
    options?: {
      title?: string;
      tags?: string[];
      onProgress?: (progress: number) => void;
    }
  ): Promise<{ item: LockerItem }> {
    const serverUrl = await mobileStorage.getServerUrl();
    const cleanBase = serverUrl.replace(/\/$/, '');
    const uploadUrl = `${cleanBase}/api/storage/upload`;
    const token = await mobileStorage.getAuthToken();

    // Use Expo FileSystem UploadTask for native background and progress reporting
    const uploadTask = FileSystem.createUploadTask(
      uploadUrl,
      fileUri,
      {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        parameters: {
          title: options?.title || filename,
          tags: JSON.stringify(options?.tags || []),
        },
      },
      (data) => {
        if (options?.onProgress && data.totalBytesExpectedToSend > 0) {
          const progress = data.totalBytesSent / data.totalBytesExpectedToSend;
          options.onProgress(Math.min(1, Math.max(0, progress)));
        }
      }
    );

    const result = await uploadTask.uploadAsync();

    if (!result || result.status < 200 || result.status >= 300) {
      let errorMsg = 'Upload failed';
      try {
        const parsed = JSON.parse(result?.body || '{}');
        errorMsg = parsed.error || errorMsg;
      } catch {
        // Fallback
      }
      throw new ApiError(errorMsg, result?.status || 500);
    }

    const json = JSON.parse(result.body);
    return json;
  }

  async downloadFile(itemId: string, filename: string): Promise<string> {
    const serverUrl = await mobileStorage.getServerUrl();
    const cleanBase = serverUrl.replace(/\/$/, '');
    const downloadUrl = `${cleanBase}/api/storage/file/${itemId}`;
    const token = await mobileStorage.getAuthToken();

    const targetDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const targetPath = `${targetDirectory}${filename}`;

    const downloadRes = await FileSystem.downloadAsync(downloadUrl, targetPath, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (downloadRes.status !== 200) {
      throw new ApiError('Failed to download file from server', downloadRes.status);
    }

    return downloadRes.uri;
  }

  // --- STATS & GOOGLE DRIVE STATUS ---
  async getStorageUsage(): Promise<StorageUsage> {
    const res = await this.request<{ usage: StorageUsage }>('/api/storage/usage');
    return res.usage;
  }

  async getGoogleDriveStatus(): Promise<GoogleDriveStatus> {
    return this.request<GoogleDriveStatus>('/api/admin/gdrive/status');
  }
}

export const api = new ApiService();
