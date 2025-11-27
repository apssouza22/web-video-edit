const DB_NAME = 'video-demux-files';
const DB_VERSION = 1;
const STORE_NAME = 'media-files';

export interface StoredFileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  thumbnailDataUrl?: string;
  createdAt: number;
}

export interface StoredFile extends StoredFileMetadata {
  blob: Blob;
}

export class FileStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async saveFile(file: File): Promise<StoredFileMetadata> {
    await this.init();

    const id = this.generateId();
    const thumbnailDataUrl = await this.generateThumbnail(file);

    const storedFile: StoredFile = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
      thumbnailDataUrl,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(storedFile);

      request.onsuccess = () => {
        const { blob, ...metadata } = storedFile;
        resolve(metadata);
      };

      request.onerror = () => {
        reject(new Error('Failed to save file'));
      };
    });
  }

  async getFile(id: string): Promise<StoredFile | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get file'));
      };
    });
  }

  async deleteFile(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete file'));
      };
    });
  }

  async getAllFiles(): Promise<StoredFileMetadata[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const files = request.result as StoredFile[];
        const metadata = files.map(({ blob, ...meta }) => meta);
        resolve(metadata);
      };

      request.onerror = () => {
        reject(new Error('Failed to get all files'));
      };
    });
  }

  private generateId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async generateThumbnail(file: File): Promise<string | undefined> {
    if (file.type.startsWith('image/')) {
      return this.generateImageThumbnail(file);
    }
    if (file.type.startsWith('video/')) {
      return this.generateVideoThumbnail(file);
    }
    if (file.type.startsWith('audio/')) {
      return this.getAudioPlaceholder();
    }
    return undefined;
  }

  private generateImageThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 80;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(this.getPlaceholderDataUrl('image'));
      };

      img.src = url;
    });
  }

  private generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.onloadeddata = () => {
        video.currentTime = 0.1;
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const size = 80;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(size / video.videoWidth, size / video.videoHeight);
        const x = (size - video.videoWidth * scale) / 2;
        const y = (size - video.videoHeight * scale) / 2;

        ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(this.getPlaceholderDataUrl('video'));
      };

      video.src = url;
    });
  }

  private getAudioPlaceholder(): string {
    return this.getPlaceholderDataUrl('audio');
  }

  private getPlaceholderDataUrl(type: 'image' | 'video' | 'audio'): string {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2a2d32';
    ctx.fillRect(0, 0, 80, 80);

    ctx.fillStyle = '#a9e1fa';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const icons: Record<string, string> = {
      image: '🖼️',
      video: '🎬',
      audio: '🎵',
    };

    ctx.font = '24px sans-serif';
    ctx.fillText(icons[type] || '📁', 40, 40);

    return canvas.toDataURL('image/png');
  }
}

let fileStorageInstance: FileStorage | null = null;

export function getFileStorage(): FileStorage {
  if (!fileStorageInstance) {
    fileStorageInstance = new FileStorage();
  }
  return fileStorageInstance;
}

