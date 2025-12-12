import type {AnalyzedFrameData} from './types.js';

const DB_NAME = 'video-demux-frame-cache';
const DB_VERSION = 1;
const STORE_NAME = 'analyzed-frames';

interface CachedFrameEntry {
  videoId: string;
  frames: SerializedFrameData[];
  createdAt: number;
}

interface SerializedFrameData {
  timestamp: number;
  caption: string;
  embedding: number[];
  imageDataUrl: string;
}

export class AnalyzedFrameCache {
  #db: IDBDatabase | null = null;
  #initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.#db) return;
    if (this.#initPromise) return this.#initPromise;

    this.#initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open frame cache database'));
      };

      request.onsuccess = () => {
        this.#db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {keyPath: 'videoId'});
          store.createIndex('createdAt', 'createdAt', {unique: false});
        }
      };
    });

    return this.#initPromise;
  }

  async get(videoId: string): Promise<AnalyzedFrameData[] | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.#db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(videoId);

      request.onsuccess = () => {
        const entry = request.result as CachedFrameEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }
        const frames = this.#deserializeFrames(entry.frames);
        resolve(frames);
      };

      request.onerror = () => {
        reject(new Error('Failed to get cached frames'));
      };
    });
  }

  async set(videoId: string, frames: AnalyzedFrameData[]): Promise<void> {
    await this.init();

    const entry: CachedFrameEntry = {
      videoId,
      frames: this.#serializeFrames(frames),
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.#db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to cache frames'));
      };
    });
  }

  async delete(videoId: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.#db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(videoId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete cached frames'));
      };
    });
  }

  async has(videoId: string): Promise<boolean> {
    const frames = await this.get(videoId);
    return frames !== null;
  }

  #serializeFrames(frames: AnalyzedFrameData[]): SerializedFrameData[] {
    return frames.map(frame => ({
      timestamp: frame.timestamp,
      caption: frame.caption,
      embedding: Array.from(frame.embedding),
      imageDataUrl: frame.imageDataUrl,
    }));
  }

  #deserializeFrames(serialized: SerializedFrameData[]): AnalyzedFrameData[] {
    return serialized.map(frame => ({
      timestamp: frame.timestamp,
      caption: frame.caption,
      embedding: new Float32Array(frame.embedding),
      imageDataUrl: frame.imageDataUrl,
    }));
  }
}

let cacheInstance: AnalyzedFrameCache | null = null;

export function getAnalyzedFrameCache(): AnalyzedFrameCache {
  if (!cacheInstance) {
    cacheInstance = new AnalyzedFrameCache();
  }
  return cacheInstance;
}

