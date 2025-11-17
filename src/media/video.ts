import {createFrameService, Frame} from '@/frame';
import {AbstractMedia} from './media-common';
import {LayerFile, VideoMetadata} from './types';
import {loadVideo, VideoStreaming} from "@/video";

export class VideoMedia extends AbstractMedia {
  private videoStreaming: VideoStreaming | undefined = undefined;

  constructor(file: LayerFile, skipLoading: boolean = false) {
    super(file);

    // Empty VideoLayers (split() requires this)
    if (skipLoading) {
      return;
    }

    loadVideo(file, this.onVideoLoadUpdateCallback.bind(this));
  }

  private onVideoLoadUpdateCallback(progress: number, metadata: VideoMetadata | null) {
    this.loadUpdateListener(this, progress -1, this.ctx);
    if (progress < 100 || !metadata?.frames) {
      return;
    }
    this.totalTimeInMilSeconds = metadata.totalTimeInMilSeconds;
    this.width = metadata.width;
    this.height = metadata.height;

    this.framesCollection = createFrameService(this.totalTimeInMilSeconds, this.start_time, false);
    this.framesCollection.initializeFrames();
    this.videoStreaming = metadata.frames;

    this.#handleVideoRatio();
    this.ready = true;
    this.loadUpdateListener(this, 100, this.ctx);
  }

  /**
   * Removes a video interval by removing frames from the media
   */
  removeInterval(startTime: number, endTime: number): boolean {
    const success = this.framesCollection.removeInterval(startTime, endTime);
    if (success) {
      this.totalTimeInMilSeconds = this.framesCollection.getTotalTimeInMilSec();
      console.log("Video clipping successful");
    }
    return success;
  }

  #handleVideoRatio(): void {
    const playerRatio = this.canvas.width / this.canvas.height;
    const videoRatio = this.width / this.height;

    if (videoRatio > playerRatio) {
      const scale = videoRatio / playerRatio;
      this.height *= scale;
    } else {
      const scale = playerRatio / videoRatio;
      this.width *= scale;
    }
    this.renderer.setSize(this.width, this.height);
  }

  async render(ctxOut: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): Promise<void> {
    if (!this.ready) {
      return;
    }
    if (!this.videoStreaming) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }

    if (!this.shouldReRender(currentTime)) {
      this.drawScaled(this.ctx, ctxOut);
      return;
    }
    const videoFrame = await this.getFrame(currentTime);
    if (!videoFrame) {
      return;
    }
    const x = videoFrame.x + this.renderer.width / 2 - this.width / 2;
    const y = videoFrame.y + this.renderer.height / 2 - this.height / 2;
    this.renderer.clearRect();
    this.renderer.drawImage(
        videoFrame.videoData as VideoFrame,
        0, 0,
        this.width, this.height,
        x, y,
        videoFrame.scale * this.width,
        videoFrame.scale * this.height
    );
    this.drawScaled(this.renderer.context, ctxOut);
    this.updateRenderCache(currentTime);
  }

  async getFrameAtIndex(index: number): Promise<VideoFrame | null> {
    return this.videoStreaming!.getFrameAtIndex(index);
  }

  async getFrame(currentTime: number): Promise<Frame | null> {
    const index = this.framesCollection.getIndex(currentTime, this.start_time);
    if (index < 0 || index >= this.framesCollection.getLength()) {
      return null;
    }
    const frame = this.framesCollection.frames[index];
    const videoFrame = await this.videoStreaming?.getFrameAtIndex(index);
    if (!videoFrame) {
      return null;
    }
    return new Frame(videoFrame, frame.x, frame.y, frame.scale, frame.rotation, frame.anchor);
  }

  cleanup(): void {
    if (this.videoStreaming) {
      this.videoStreaming.cleanup();
      this.videoStreaming = undefined;
    }
  }
}
