import { FrameCache } from './frame-cache';
import type { VideoSampleSink } from 'mediabunny';
import type { VideoStreamingInterface } from './types';

export class VideoStreaming implements VideoStreamingInterface {
  #timestamps: number[];
  #videoSink: VideoSampleSink;
  #frameCache: FrameCache;
  #bufferSize: number;
  #currentIndex: number = -1;
  #isBuffering: boolean = false;
  #bufferPromises: Map<number, Promise<VideoFrame | null>>;

  constructor(
      timestamps: number[],
      videoSink: VideoSampleSink,
      cacheSize: number = 10000,
      bufferSize: number = 5
  ) {
    this.#timestamps = timestamps;
    this.#videoSink = videoSink;
    this.#frameCache = new FrameCache(cacheSize);
    this.#bufferSize = bufferSize;
    this.#bufferPromises = new Map();
  }

  async getFrameAtIndex(index: number): Promise<VideoFrame | null> {
    if (index < 0 || index >= this.#timestamps.length) {
      return null;
    }

    const cachedFrame = this.#frameCache.get(index);
    if (cachedFrame) {
      this.#updateCurrentIndex(index);
      return cachedFrame;
    }

    const bufferedPromise = this.#bufferPromises.get(index);
    if (bufferedPromise) {
      return bufferedPromise;
    }

    const framePromise = this.#loadFrame(index);
    this.#bufferPromises.set(index, framePromise);

    try {
      const frame = await framePromise;
      this.#updateCurrentIndex(index);
      return frame;
    } finally {
      this.#bufferPromises.delete(index);
    }
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
        if (!this.#frameCache.has(i) && !this.#bufferPromises.has(i)) {
          const promise = this.#loadFrame(i);
          this.#bufferPromises.set(i, promise);

          promise
          .then(() => this.#bufferPromises.delete(i))
          .catch(err => {
            console.error(`Error prefetching frame ${i}:`, err);
            this.#bufferPromises.delete(i);
          });
        }
      }

      this.#isBuffering = false;
    }, 0);
  }

  async #loadFrame(index: number): Promise<VideoFrame | null> {
    try {
      const timestamp = this.#timestamps[index];
      if (timestamp === undefined) {
        console.warn(`Not found frame at index ${index}`)
        return null
      }
      const sample = await this.#videoSink.getSample(timestamp);

      if (sample) {
        const videoFrame = sample.toVideoFrame();
        this.#frameCache.set(index, videoFrame);
        return videoFrame;
      }

      return null;
    } catch (error) {
      console.error(`Error loading frame at index ${index}:`, error);
      return null;
    }
  }


  cleanup(): void {
    this.#frameCache.clear();
    this.#bufferPromises.clear();
    this.#currentIndex = -1;
  }
}

