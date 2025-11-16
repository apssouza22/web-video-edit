import type { VideoMedia } from '@/media/video';

export class VideoThumbnailGenerator {
  #videoMedia: VideoMedia;
  #thumbnailCache: Map<number, HTMLCanvasElement>;
  #thumbnailWidth: number;
  #thumbnailHeight: number;
  #isGenerating: boolean = false;
  #generationQueue: Set<number> = new Set();

  constructor(
    videoMedia: VideoMedia,
    thumbnailWidth: number = 80,
    thumbnailHeight: number = 45
  ) {
    this.#videoMedia = videoMedia;
    this.#thumbnailCache = new Map();
    this.#thumbnailWidth = thumbnailWidth;
    this.#thumbnailHeight = thumbnailHeight;
  }

  async generateThumbnail(frameIndex: number): Promise<HTMLCanvasElement | null> {
    const cached = this.#thumbnailCache.get(frameIndex);
    if (cached) {
      return cached;
    }

    if (this.#generationQueue.has(frameIndex)) {
      return null;
    }
    this.#generationQueue.add(frameIndex);
    try {
      const videoFrame = await this.#videoMedia.getFrameAtIndex(frameIndex);
      if (!videoFrame) {
        this.#generationQueue.delete(frameIndex);
        return null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = this.#thumbnailWidth;
      canvas.height = this.#thumbnailHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        this.#generationQueue.delete(frameIndex);
        return null;
      }

      ctx.drawImage(
        videoFrame,
        0, 0, videoFrame.displayWidth, videoFrame.displayHeight,
        0, 0, this.#thumbnailWidth, this.#thumbnailHeight
      );

      this.#thumbnailCache.set(frameIndex, canvas);
      this.#generationQueue.delete(frameIndex);

      return canvas;
    } catch (error) {
      console.error(`Error generating thumbnail for frame ${frameIndex}:`, error);
      this.#generationQueue.delete(frameIndex);
      return null;
    }
  }

  async generateThumbnails(frameIndices: number[]): Promise<void> {
    if (this.#isGenerating) {
      return;
    }

    this.#isGenerating = true;

    for (const frameIndex of frameIndices) {
      if (!this.#thumbnailCache.has(frameIndex) && !this.#generationQueue.has(frameIndex)) {
        await this.generateThumbnail(frameIndex);
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }

    this.#isGenerating = false;
  }

  getThumbnail(frameIndex: number): HTMLCanvasElement | null {
    return this.#thumbnailCache.get(frameIndex) || null;
  }

  hasThumbnail(frameIndex: number): boolean {
    return this.#thumbnailCache.has(frameIndex);
  }

  clearCache(): void {
    this.#thumbnailCache.clear();
    this.#generationQueue.clear();
  }

  getCacheSize(): number {
    return this.#thumbnailCache.size;
  }

  setThumbnailSize(width: number, height: number): void {
    if (width !== this.#thumbnailWidth || height !== this.#thumbnailHeight) {
      this.#thumbnailWidth = width;
      this.#thumbnailHeight = height;
      this.clearCache();
    }
  }

  cleanup(): void {
    this.clearCache();
    this.#isGenerating = false;
  }
}

