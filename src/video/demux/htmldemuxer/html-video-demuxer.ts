import {addElementToBackground} from '@/media/';
import {fps} from '@/constants';
import {Canvas2DRender} from '@/common/render-2d';
import {FrameMetadata, FrameQuality} from './frame-quality';
import {LayerFile, VideoMetadata} from '@/media/types';
import {CompleteCallback, MetadataCallback, ProgressCallback} from "@/video/demux/types";

export class HTMLVideoDemuxer {
  private chunkSize: number = 30;
  private optimizedFPS: number = 12;
  private video: HTMLVideoElement | null = null;
  private fileSrc: string | null = null;
  private onProgressCallback: ProgressCallback | null = null;
  private onCompleteCallback: CompleteCallback = (frames) => {};
  private onMetadataCallback: MetadataCallback | null = null;
  private isUpgrading: boolean = false;
  private frameMetadata: FrameMetadata[] = [];
  private renderer!: Canvas2DRender;

  /**
   * Set callback for progress updates
   */
  setOnProgressCallback(callback: ProgressCallback): void {
    this.onProgressCallback = callback;
  }

  /**
   * Set callback for completion
   */
  setOnCompleteCallback(callback: CompleteCallback): void {
    this.onCompleteCallback = callback;
  }

  /**
   * Set callback for metadata loading
   */
  setOnMetadataCallback(callback: MetadataCallback): void {
    this.onMetadataCallback = callback;
  }

  /**
   * Initialize HTML video processing
   */
  initialize(file: LayerFile, renderer: Canvas2DRender): void {
    this.fileSrc = file.uri || '';
    this.renderer = renderer;
    this.#createVideoElement();
  }

  #createVideoElement(): void {
    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', 'false');
    this.video.setAttribute('loop', 'false');
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('muted', 'true');
    this.video.setAttribute('preload', 'auto');
    addElementToBackground(this.video);
    this.video.addEventListener('loadedmetadata', this.#onLoadMetadata.bind(this));
    this.video.src = this.fileSrc!;
  }

  async #onLoadMetadata(): Promise<void> {
    if (!this.video) return;

    const width = this.video.videoWidth;
    const height = this.video.videoHeight;
    const duration = this.video.duration;
    console.log(`Video metadata loaded: ${width}x${height}, duration: ${duration}s`);

    const totalFramesTarget = Math.floor(duration * fps);
    this.frameMetadata = [];
    for (let i = 0; i < totalFramesTarget; i++) {
      const timestamp = i / fps;
      this.frameMetadata.push(new FrameMetadata(null, FrameQuality.EMPTY, timestamp));
    }
    
    if (this.onMetadataCallback) {
      this.onMetadataCallback({
        width,
        height,
        duration,
        totalTimeInMilSeconds: duration * 1000
      } as VideoMetadata);
    }

    await this.#waitForVideoReady();
    await this.#convertToArrayBufferOptimized();
  }

  async #waitForVideoReady(): Promise<void> {
    if (!this.video) return;

    return new Promise((resolve) => {
      if (this.video!.readyState >= 2) {
        console.log('Video ready for seeking, readyState:', this.video!.readyState);
        resolve();
        return;
      }

      const onCanPlay = (): void => {
        console.log('Video can play, readyState:', this.video!.readyState);
        this.video!.removeEventListener('canplay', onCanPlay);
        this.video!.removeEventListener('canplaythrough', onCanPlay);
        resolve();
      };

      this.video!.addEventListener('canplay', onCanPlay, {once: true});
      this.video!.addEventListener('canplaythrough', onCanPlay, {once: true});
      
      setTimeout(() => {
        this.video!.removeEventListener('canplay', onCanPlay);
        this.video!.removeEventListener('canplaythrough', onCanPlay);
        console.log('Video ready timeout, continuing anyway. readyState:', this.video!.readyState);
        resolve();
      }, 3000);
    });
  }

  async #seekWithTimeout(time: number, timeout: number = 2000): Promise<ImageData | null> {
    if (!this.video) return null;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.video!.removeEventListener('seeked', onSeeked);
        console.warn(`Seek timeout for time ${time}, readyState: ${this.video!.readyState}`);
        reject(new Error(`Seek timeout for time ${time}`));
      }, timeout);

      const onSeeked = (): void => {
        clearTimeout(timeoutId);
        this.video!.removeEventListener('seeked', onSeeked);
        Canvas2DRender.drawScaled(this.video!, this.renderer.context);
        const frame = this.renderer.getImageData(0, 0);
        resolve(frame);
      };

      this.video!.addEventListener('seeked', onSeeked, {once: true});
      this.video!.currentTime = time;
      this.video!.pause();
    });
  }

  async #convertToArrayBufferOptimized(optimizedFps: number | null = null): Promise<void> {
    if (!this.video) return;

    const actualFps = optimizedFps || this.optimizedFPS;
    await this.#loadInitialFrames(actualFps, this.video.duration);
  }

  /**
   * Load initial frames at reduced FPS for immediate playback
   */
  async #loadInitialFrames(targetFps: number, duration: number): Promise<void> {
    const frameInterval = 1 / targetFps;
    const optimizedFrameCount = Math.floor(duration * targetFps);
    const chunks = Math.ceil(optimizedFrameCount / this.chunkSize);
    
    console.log(`Loading ${optimizedFrameCount} initial frames in ${chunks} chunks...`);
    const startTime = Date.now();
    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      const startFrame = chunkIndex * this.chunkSize;
      const endFrame = Math.min(startFrame + this.chunkSize, optimizedFrameCount);

      console.log(`Processing initial chunk ${chunkIndex + 1}/${chunks} (frames ${startFrame}-${endFrame})`);
      await this.#processInitialFrameChunk(startFrame, endFrame, frameInterval, targetFps);

      // Add a small delay between chunks to prevent blocking
      if (chunkIndex < chunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    this.#fillInterpolatedFrames();
    // @ts-ignore
    this.onCompleteCallback(this.#convertToLegacyFormat());
    const elapsed = Date.now() - startTime;
    console.log('Initial video processing complete. Took', elapsed/1000, 'seconds');
    setTimeout(() => this.#startBackgroundUpgrade(), 1000);
  }

  async #processInitialFrameChunk(startFrame: number, endFrame: number, frameInterval: number, targetFps: number): Promise<void> {
    if (!this.video) return;

    for (let i = startFrame; i < endFrame; i++) {
      const time = i * frameInterval;
      const targetIndex = Math.floor(time * fps); // Map to full FPS index
      
      try {
        const frameData = await this.#seekWithTimeout(time);
        if (frameData && targetIndex < this.frameMetadata.length) {
          this.frameMetadata[targetIndex].data = frameData;
          this.frameMetadata[targetIndex].quality = FrameQuality.LOW_RES;
          this.frameMetadata[targetIndex].timestamp = time;
        }
      } catch (error) {
        console.warn(`Failed to extract frame at ${time}s:`, error);
      }
      const progress = ((i + 1) / Math.floor(this.video.duration * targetFps) * 100);
      if (this.onProgressCallback) {
        this.onProgressCallback(Math.min(progress, 100));
      }
    }
  }

  /**
   * Fill gaps between extracted frames with interpolated references
   */
  #fillInterpolatedFrames(): void {
    let lastRealFrameIndex = -1;
    
    for (let i = 0; i < this.frameMetadata.length; i++) {
      const frame = this.frameMetadata[i];
      
      if (frame.hasRealData()) {
        lastRealFrameIndex = i;
      } else if (lastRealFrameIndex >= 0) {
        // Mark as interpolated and point to nearest real frame
        frame.quality = FrameQuality.INTERPOLATED;
        frame.sourceIndex = lastRealFrameIndex;
      }
    }
  }

  #convertToLegacyFormat(): ImageData[] {
    return this.frameMetadata.map(frameMetadata => {
      return frameMetadata.getDisplayData(this.frameMetadata);
    }).filter((data): data is ImageData => data !== null);
  }

  async #startBackgroundUpgrade(): Promise<void> {
    if (this.isUpgrading) return;
    console.log('Starting background quality upgrade... Status: ', this.#getLoadingStats());
    this.isUpgrading = true;
    const now = Date.now();
    await this.#upgradeFrameQuality();
    const elapsed = Date.now() - now;
    // @ts-ignore
    this.onCompleteCallback(this.#convertToLegacyFormat());
    this.cleanup();
    console.log('Finished background quality upgrade. Took', elapsed/1000, 'ms.');
  }

  async #upgradeFrameQuality(): Promise<void> {
    const framesToUpgrade = this.frameMetadata
      .map((frame, index) => ({ frame, index }))
      .filter(({ frame }) => frame.needsUpgrade());
    
    if (framesToUpgrade.length === 0) {
      console.log('No frames need quality upgrade');
      this.isUpgrading = false;
      return;
    }
    
    console.log(`Upgrading ${framesToUpgrade.length} frames to full quality...`);
    const chunks = Math.ceil(framesToUpgrade.length / this.chunkSize);

    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      const startIdx = chunkIndex * this.chunkSize;
      const endIdx = Math.min(startIdx + this.chunkSize, framesToUpgrade.length);
      
      console.log(`Upgrading chunk ${chunkIndex + 1}/${chunks}`);
      await this.#chunkUpgrade(startIdx, endIdx, framesToUpgrade);

      if (chunkIndex < chunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    this.isUpgrading = false;
  }

  async #chunkUpgrade(startIdx: number, endIdx: number, framesToUpgrade: Array<{frame: FrameMetadata; index: number}>): Promise<void> {
    for (let i = startIdx; i < endIdx; i++) {
      const {frame, index} = framesToUpgrade[i];
      const timestamp = index / fps;

      try {
        const frameData = await this.#seekWithTimeout(timestamp);
        if (frameData) {
          frame.data = frameData;
          frame.quality = FrameQuality.HIGH_RES;
          frame.timestamp = timestamp;
          frame.sourceIndex = null; // No longer needs interpolation
        }
      } catch (error) {
        console.warn(`Failed to upgrade frame at ${timestamp}s:`, error);
      }
    }
  }

  cleanup(): void {
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
  }

  #getLoadingStats(): { total: number; lowRes: number; highRes: number; interpolated: number; empty: number } {
    if (this.frameMetadata.length === 0) {
      return { total: 0, lowRes: 0, highRes: 0, interpolated: 0, empty: 0 };
    }
    
    const stats = {
      total: this.frameMetadata.length,
      lowRes: 0,
      highRes: 0,
      interpolated: 0,
      empty: 0
    };
    
    this.frameMetadata.forEach(frame => {
      switch (frame.quality) {
        case FrameQuality.LOW_RES:
          stats.lowRes++;
          break;
        case FrameQuality.HIGH_RES:
          stats.highRes++;
          break;
        case FrameQuality.INTERPOLATED:
          stats.interpolated++;
          break;
        case FrameQuality.EMPTY:
          stats.empty++;
          break;
      }
    });
    
    return stats;
  }
}

