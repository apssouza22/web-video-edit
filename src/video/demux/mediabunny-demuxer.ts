import {Canvas2DRender} from '@/common/render-2d';
import {fps} from '@/constants';
import {ALL_FORMATS, BlobSource, Input, VideoSampleSink,} from 'mediabunny';
import {StudioState} from "@/common";
import {CompleteCallback, MetadataCallback, ProgressCallback} from "@/video/demux/types";
import {VideoStreaming} from "@/video";


export class MediaBunnyDemuxer {
  private onProgressCallback: ProgressCallback = () => {};
  private onCompleteCallback: CompleteCallback = () => {};
  private onMetadataCallback: MetadataCallback = () => {};
  
  private timestamps: number[] = [];
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
      this.timestamps = [];

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

      this.videoSink = new VideoSampleSink(videoTrack);
      StudioState.getInstance().setMinVideoSizes(width, height)

      this.onMetadataCallback({
        width,
        height,
        totalTimeInMilSeconds
      });
      await this.extractTimestamps();
    } catch (error) {
      console.error('MediaBunnyDemuxer initialization error:', error);
      this.cleanup();
      throw error;
    }
  }

  private async extractTimestamps(): Promise<void> {
    if (!this.videoSink) {
      return;
    }

    try {
      const frameInterval = 1 / this.targetFps;
      const totalFramesTarget = Math.floor(this.totalDuration * this.targetFps);
      
      console.log(`Extracting timestamps at ${this.targetFps} fps (${totalFramesTarget} total frames)`);

      let currentFrameIndex = 0;
      let nextTargetTime = 0;

      const frameIterator = this.videoSink.samples(0);

      for await (const videoSample of frameIterator) {
        if (!this.isProcessing) {
          break;
        }

        const timestamp = videoSample.timestamp;

        if (timestamp >= nextTargetTime && currentFrameIndex < totalFramesTarget) {
          this.timestamps.push(timestamp);

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

      console.log(`Extracted ${this.timestamps.length} timestamps at ${this.targetFps} fps`);
      
      this.onProgressCallback(100);
      this.onCompleteCallback(new VideoStreaming(this.timestamps, this.videoSink!, 1000, 5));
    } catch (error) {
      console.error('Error extracting timestamps:', error);
      throw error;
    }
  }


  cleanup(): void {
    try {
      this.isProcessing = false;
      this.timestamps = [];
      
      // Note: videoSink is kept alive for on-demand frame retrieval
      // It will be cleaned up by the VideoMedia class
      this.input = null;
    } catch (error) {
      console.error('Error during MediaBunnyDemuxer cleanup:', error);
    }
  }
}

