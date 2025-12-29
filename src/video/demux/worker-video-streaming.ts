import { FrameCache } from './frame-cache';
import type { DemuxWorkerMessage, DemuxWorkerResponse, FrameResponse, BatchFrameResponse, BatchGetFramesMessage, CancelBatchMessage } from './demux-worker-types';
import type { VideoStreamingInterface } from './types';

export class WorkerVideoStreaming implements VideoStreamingInterface {
  #videoId: string;
  #worker: Worker;
  #timestamps: number[];
  #frameCache: FrameCache;
  #targetFps: number;
  #bufferDurationSeconds: number = 5.0;
  #currentIndex: number = -1;
  #lastRequestedIndex: number = -1;
  #activeBatchRequest: string | null = null;
  #pendingFrameRequests: Map<number, {
    resolve: (frame: ImageBitmap | null) => void;
    reject: (error: Error) => void;
  }>;

  constructor(
    videoId: string,
    worker: Worker,
    timestamps: number[],
    cacheSize: number = 10000,
    targetFps: number = 30
  ) {
    this.#videoId = videoId;
    this.#worker = worker;
    this.#timestamps = timestamps;
    this.#frameCache = new FrameCache(cacheSize);
    this.#targetFps = targetFps;
    this.#pendingFrameRequests = new Map();
    this.#setupWorkerListener();
  }

  #setupWorkerListener(): void {
    this.#worker.addEventListener('message', (event: MessageEvent<DemuxWorkerResponse>) => {
      const message = event.data;

      if (message.videoId !== this.#videoId) {
        return;
      }

      if (message.type === 'frame') {
        this.#handleFrameResponse(message);
      } else if (message.type === 'batch-frame') {
        this.#handleBatchFrameResponse(message);
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

  #handleBatchFrameResponse(response: BatchFrameResponse): void {
    if (response.requestId !== this.#activeBatchRequest) {
      console.log(`[WorkerVideoStreaming] Ignoring frame from cancelled batch ${response.requestId}`);
      response.frame?.close();  // Close the ImageBitmap before returning
      return;
    }

    if (response.frame) {
      this.#frameCache.set(response.index, response.frame);
    }

    const pending = this.#pendingFrameRequests.get(response.index);
    if (pending) {
      this.#pendingFrameRequests.delete(response.index);
      pending.resolve(response.frame);
    }

    if (response.isComplete) {
      this.#activeBatchRequest = null;
    }
  }

  async getFrameAtIndex(index: number, preFetch: boolean = true): Promise<ImageBitmap | null> {
    if (index < 0 || index >= this.#timestamps.length) {
      return null;
    }
    const cachedFrame = this.#frameCache.get(index);


    // Direct fetch without adding it to the queue and updating existing index. Used for thumbnails etc.
    if(!preFetch){
      if (cachedFrame) {
        return cachedFrame;
      }
      return new Promise((resolve, reject) => {
        this.#pendingFrameRequests.set(index, { resolve, reject });
        this.#worker.postMessage({
          type: 'get-frame',
          videoId: this.#videoId,
          index,
        } as DemuxWorkerMessage);
      });
    }

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
    const isSeek = this.#lastRequestedIndex !== -1 &&
                   Math.abs(index - this.#lastRequestedIndex) > 1;

    // Only cancel if seeking outside the current batch range
    if (isSeek && this.#activeBatchRequest) {
      console.log("[WorkerVideoStreaming] Seeking outside current batch, cancelling active batch request diff: ", Math.abs(index - this.#lastRequestedIndex) );
      const batchRange = this.#calculateBatchRange(this.#currentIndex + 1);
      const isOutsideBatchRange = index < batchRange.startIndex || index >= batchRange.endIndex;

      if (isOutsideBatchRange) {
        this.#cancelActiveBatch();
      }
    }

    this.#currentIndex = index;
    this.#lastRequestedIndex = index;
    this.#prefetchNextFrames();
  }

  #getBufferFrameCount(): number {
    return Math.ceil(this.#targetFps * this.#bufferDurationSeconds);
  }

  #calculateBatchRange(fromIndex: number): { startIndex: number; endIndex: number; count: number } {
    const bufferSize = this.#getBufferFrameCount();
    const startIndex = fromIndex;
    const endIndex = Math.min(startIndex + bufferSize, this.#timestamps.length);
    const count = endIndex - startIndex;

    return { startIndex, endIndex, count };
  }

  #cancelActiveBatch(): void {
    if (!this.#activeBatchRequest) {
      return;
    }

    this.#worker.postMessage({
      type: 'cancel-batch',
      videoId: this.#videoId,
      requestId: this.#activeBatchRequest,
    } as CancelBatchMessage);

    this.#activeBatchRequest = null;
  }

  #prefetchNextFrames(): void {
    if (this.#activeBatchRequest) {
      return;
    }

    const batchRange = this.#calculateBatchRange(this.#currentIndex + 1);

    const framesToFetch: number[] = [];
    for (let i = batchRange.startIndex; i < batchRange.endIndex; i++) {
      if (!this.#frameCache.has(i) && !this.#pendingFrameRequests.has(i)) {
        framesToFetch.push(i);
      }
    }

    if (framesToFetch.length === 0) {
      return;
    }

    const requestId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.#activeBatchRequest = requestId;

    for (const index of framesToFetch) {
      this.#pendingFrameRequests.set(index, {
        resolve: () => {},
        reject: () => {},
      });
    }

    this.#worker.postMessage({
      type: 'batch-get-frames',
      videoId: this.#videoId,
      startIndex: batchRange.startIndex,
      endIndex: batchRange.endIndex,
      requestId,
    } as BatchGetFramesMessage);
  }

  cleanup(): void {
    this.#frameCache.clear();
    this.#pendingFrameRequests.clear();
    this.#currentIndex = -1;
    this.#worker.postMessage({ type: 'cleanup', videoId: this.#videoId } as DemuxWorkerMessage);
  }
}
