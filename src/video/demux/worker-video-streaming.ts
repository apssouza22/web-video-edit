import { FrameCache } from './frame-cache';
import type { DemuxWorkerMessage, DemuxWorkerResponse, FrameResponse } from './demux-worker-types';
import type { VideoStreamingInterface } from './types';

export class WorkerVideoStreaming implements VideoStreamingInterface {
  #videoId: string;
  #worker: Worker;
  #timestamps: number[];
  #frameCache: FrameCache;
  #bufferSize: number;
  #currentIndex: number = -1;
  #isBuffering: boolean = false;
  #pendingFrameRequests: Map<number, {
    resolve: (frame: ImageBitmap | null) => void;
    reject: (error: Error) => void;
  }>;

  constructor(
    videoId: string,
    worker: Worker,
    timestamps: number[],
    cacheSize: number = 10000,
    bufferSize: number = 50
  ) {
    this.#videoId = videoId;
    this.#worker = worker;
    this.#timestamps = timestamps;
    this.#frameCache = new FrameCache(cacheSize);
    this.#bufferSize = bufferSize;
    this.#pendingFrameRequests = new Map();
    this.#setupWorkerListener();
  }

  #setupWorkerListener(): void {
    this.#worker.addEventListener('message', (event: MessageEvent<DemuxWorkerResponse>) => {
      const message = event.data;

      if (message.type === 'frame' && message.videoId === this.#videoId) {
        this.#handleFrameResponse(message);
      }
    });
  }

  #handleFrameResponse(response: FrameResponse): void {
    const pending = this.#pendingFrameRequests.get(response.index);
    if (pending) {
      this.#pendingFrameRequests.delete(response.index);
      if (response.frame) {
        this.#frameCache.set(response.index, response.frame);
      }
      pending.resolve(response.frame);
    }
  }

  async getFrameAtIndex(index: number): Promise<ImageBitmap | null> {
    if (index < 0 || index >= this.#timestamps.length) {
      return null;
    }

    const cachedFrame = this.#frameCache.get(index);
    if (cachedFrame) {
      this.#updateCurrentIndex(index);
      return cachedFrame;
    }

    const existingRequest = this.#pendingFrameRequests.get(index);
    if (existingRequest) {
      return new Promise((resolve, reject) => {
        const originalResolve = existingRequest.resolve;
        existingRequest.resolve = (frame) => {
          originalResolve(frame);
          resolve(frame);
        };
      });
    }

    return new Promise((resolve, reject) => {
      this.#pendingFrameRequests.set(index, { resolve, reject });
      this.#worker.postMessage({
        type: 'get-frame',
        videoId: this.#videoId,
        index,
      } as DemuxWorkerMessage);
      this.#updateCurrentIndex(index);
    });
  }

  #updateCurrentIndex(index: number): void {
    this.#currentIndex = index;
    this.#prefetchNextFrames();
  }

  #prefetchNextFrames(): void {
    if (this.#isBuffering) {
      return;
    }

    this.#isBuffering = true;

    setTimeout(() => {
      const startIndex = this.#currentIndex + 1;
      const endIndex = Math.min(startIndex + this.#bufferSize, this.#timestamps.length);

      for (let i = startIndex; i < endIndex; i++) {
        if (!this.#frameCache.has(i) && !this.#pendingFrameRequests.has(i)) {
          this.#pendingFrameRequests.set(i, {
            resolve: () => {},
            reject: () => {},
          });
          this.#worker.postMessage({
            type: 'get-frame',
            videoId: this.#videoId,
            index: i,
          } as DemuxWorkerMessage);
        }
      }

      this.#isBuffering = false;
    }, 0);
  }

  cleanup(): void {
    this.#frameCache.clear();
    this.#pendingFrameRequests.clear();
    this.#currentIndex = -1;
    this.#worker.postMessage({ type: 'cleanup', videoId: this.#videoId } as DemuxWorkerMessage);
  }
}
