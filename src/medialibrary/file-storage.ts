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

export interface MediaFile {
  file: File,
  thumbnailDataUrl?: string
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

  async saveFile(media: MediaFile): Promise<StoredFileMetadata> {
    await this.init();
    const id = this.generateId();
    const storedFile: StoredFile = {
      id,
      name: media.file.name,
      type: media.file.type,
      size: media.file.size,
      blob: media.file,
      thumbnailDataUrl: media.thumbnailDataUrl,
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

}

let fileStorageInstance: FileStorage | null = null;

export function getFileStorage(): FileStorage {
  if (!fileStorageInstance) {
    fileStorageInstance = new FileStorage();
  }
  return fileStorageInstance;
}

