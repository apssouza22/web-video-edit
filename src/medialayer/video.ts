import {createFrameService, Frame} from '@/frame';
import {AbstractMedia} from './media-common';
import {LayerFile, VideoMetadata} from './types';
import {loadVideo, VideoStreaming} from "@/video";
import {Canvas2DRender} from '@/common/render-2d';

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
    this._loadUpdateListener(this, progress -1);
    if (progress < 100 || !metadata?.frames) {
      return;
    }
    this.totalTimeInMilSeconds = metadata.totalTimeInMilSeconds;
    this._width = metadata.width;
    this._height = metadata.height;

    this._frameService = createFrameService(this.totalTimeInMilSeconds, this.startTime);
    this.videoStreaming = metadata.frames;

    this._renderer.setSize(this._width, this._height);
    this._ready = true;
    this._loadUpdateListener(this, 100);
  }

  /**
   * Removes a video interval by removing frames from the media
   */
  removeInterval(startTime: number, endTime: number): boolean {
    const success = this._frameService.removeInterval(startTime, endTime);
    if (success) {
      this.totalTimeInMilSeconds = this._frameService.getTotalTimeInMilSec();
      console.log("Video clipping successful");
    }
    return success;
  }

  async render(ctxOut: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): Promise<void> {
    if (!this._ready) {
      return;
    }
    if (!this.videoStreaming) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }

    const frame = await this.getFrame(currentTime);
    if (!frame) {
      return;
    }

    if (!this.shouldReRender(currentTime)) {
      Canvas2DRender.drawTransformed(this.ctx, ctxOut, frame);
      return;
    }
    
    this._renderer.drawFrame(frame);
    Canvas2DRender.drawTransformed(this._renderer.context, ctxOut, frame);
    this.updateRenderCache(currentTime);
  }

  async getFrameAtIndex(index: number): Promise<VideoFrame | null> {
    const frame = this._frameService.frames[index];
    if (!frame) {
      return null;
    }
    return this.videoStreaming!.getFrameAtIndex(frame.index!);
  }

  async getFrame(currentTime: number): Promise<Frame | null> {
    const index = this._frameService.getIndex(currentTime, this.startTime);
    if (index < 0 || index >= this._frameService.getLength()) {
      return null;
    }
    const frame = this._frameService.frames[index];
    const videoFrame = await this.videoStreaming?.getFrameAtIndex(frame.index!);
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

  protected _createCloneInstance(): AbstractMedia {
    const videoMedia = new VideoMedia(this._file!, true);
    videoMedia._frameService = createFrameService(this.totalTimeInMilSeconds, this.startTime);
    videoMedia._frameService.initializeFrames();
    videoMedia.videoStreaming = this.videoStreaming;
    return videoMedia;
  }
}
