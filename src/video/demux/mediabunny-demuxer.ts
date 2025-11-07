import {Canvas2DRender} from '@/common/render-2d';
import {VideoMetadata} from '@/media/types';
import {fps} from '@/constants';
import {ALL_FORMATS, BlobSource, Input, VideoSampleSink, WrappedCanvas,} from 'mediabunny';
import {StudioState} from "@/common";

export type ProgressCallback = (progress: number) => void;
export type CompleteCallback = (frames: any[]) => void;
export type MetadataCallback = (metadata: VideoMetadata) => void;

export class MediaBunnyDemuxer {
  private onProgressCallback: ProgressCallback = () => {};
  private onCompleteCallback: CompleteCallback = () => {};
  private onMetadataCallback: MetadataCallback = () => {};
  
  private frames: any[] = [];
  private input: Input | null = null;
  private videoSink: VideoSampleSink | null = null;
  private isProcessing = false;
  private totalDuration = 0;
  private targetFps: number = fps;

  setOnProgressCallback(callback: ProgressCallback): void {
    this.onProgressCallback = callback;
  }

  setOnCompleteCallback(callback: CompleteCallback): void {
    this.onCompleteCallback = callback;
  }

  setOnMetadataCallback(callback: MetadataCallback): void {
    this.onMetadataCallback = callback;
  }

  setTargetFps(targetFps: number): void {
    this.targetFps = targetFps;
  }

  async initialize(file: File, renderer: Canvas2DRender): Promise<void> {
    try {
      this.isProcessing = true;
      this.frames = [];

      const source = new BlobSource(file);
      this.input = new Input({
        source,
        formats: ALL_FORMATS,
      });

      this.totalDuration = await this.input.computeDuration();
      const videoTrack = await this.input.getPrimaryVideoTrack();

      if (!videoTrack) {
        throw new Error('No video track found in the file');
      }

      if (videoTrack.codec === null) {
        throw new Error('Unsupported video codec');
      }

      if (!(await videoTrack.canDecode())) {
        throw new Error('Unable to decode the video track');
      }

      const width = videoTrack.displayWidth;
      const height = videoTrack.displayHeight;
      const totalTimeInMilSeconds = this.totalDuration * 1000;

      this.onMetadataCallback({
        width,
        height,
        totalTimeInMilSeconds,
        frames: [],
      });

      this.videoSink = new VideoSampleSink(videoTrack);
      StudioState.getInstance().setMinVideoSizes(width, height)
      await this.extractFrames();
    } catch (error) {
      console.error('MediaBunnyDemuxer initialization error:', error);
      this.cleanup();
      throw error;
    }
  }

  private async extractFrames(): Promise<void> {
    if (!this.videoSink) {
      return;
    }

    try {
      const frameInterval = 1 / this.targetFps;
      const totalFramesTarget = Math.floor(this.totalDuration * this.targetFps);
      
      console.log(`Extracting frames at ${this.targetFps} fps (${totalFramesTarget} total frames)`);

      let currentFrameIndex = 0;
      let nextTargetTime = 0;

      const frameIterator = this.videoSink.samples(0);

      for await (const videoSample of frameIterator) {
        if (!this.isProcessing) {
          break;
        }

        const timestamp = videoSample.timestamp;

        if (timestamp >= nextTargetTime && currentFrameIndex < totalFramesTarget) {
          this.frames.push(videoSample.toVideoFrame());

          currentFrameIndex++;
          nextTargetTime = currentFrameIndex * frameInterval;

          const progress = totalFramesTarget > 0 
            ? Math.min(100, (currentFrameIndex / totalFramesTarget) * 100)
            : 0;
          
          this.onProgressCallback(progress);
        }

        if (currentFrameIndex >= totalFramesTarget) {
          break;
        }
      }

      console.log(`Extracted ${this.frames.length} frames at ${this.targetFps} fps`);
      
      this.onProgressCallback(100);
      this.onCompleteCallback(this.frames);
    } catch (error) {
      console.error('Error extracting frames:', error);
      throw error;
    }
  }

  private convertToVideoFrame(
    wrappedCanvas: WrappedCanvas,
    renderer: Canvas2DRender
  ): ImageData {
    const context = renderer.context;
    const canvas = wrappedCanvas.canvas;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(canvas, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    if (!imageData) {
      throw new Error('Failed to extract ImageData from canvas');
    }

    return imageData;
  }

  cleanup(): void {
    try {
      this.isProcessing = false;

      if (this.frames && this.frames.length > 0) {
        this.frames = [];
      }

      this.videoSink = null;
      this.input = null;
    } catch (error) {
      console.error('Error during MediaBunnyDemuxer cleanup:', error);
    }
  }
}

