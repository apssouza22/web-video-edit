import {createFrameService, Frame} from '@/mediaclip/frame';
import {AbstractMedia} from './media-common';
import {Canvas2DRender} from '@/common/render-2d';
import {FrameSource} from '@/mediaclip/mediasource';

export class VideoMedia extends AbstractMedia {
  private frameSource: FrameSource | undefined;
  private lastRenderedFrame: Frame | null = null;

  constructor(name: string, frameSource?: FrameSource) {
    super(name);

    if (!frameSource) {
      return;
    }

    this.initializeFromFrameSource(frameSource);
  }

  private initializeFromFrameSource(frameSource: FrameSource): void {
    this.frameSource = frameSource;
    this.totalTimeInMilSeconds = frameSource.metadata.totalTimeInMilSeconds;
    this._width = frameSource.metadata.width;
    this._height = frameSource.metadata.height;

    const timestamps = frameSource.metadata.timestamps;
    console.log(`[VideoMedia] Initializing with ${timestamps?.length || 0} timestamps, duration: ${this.totalTimeInMilSeconds}ms`);

    this._frameService = createFrameService(
      this.totalTimeInMilSeconds,
      this.startTime,
      timestamps
    );
    this._renderer.setSize(this._width, this._height);
    this._ready = true;
  }

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
    if (!this.frameSource) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }

    if (!this.shouldReRender(currentTime) && this.lastRenderedFrame) {
      Canvas2DRender.drawTransformed(this.ctx, ctxOut, this.lastRenderedFrame);
      return;
    }
    const frame = await this.getFrame(currentTime, true);
    if (!frame) {
      return;
    }
    this.lastRenderedFrame = frame;
    this._renderer.drawFrame(frame);
    Canvas2DRender.drawTransformed(this._renderer.context, ctxOut, frame);
    this.updateRenderCache(currentTime);
  }

  async getFrameAtIndex(index: number, preFetch:boolean = true): Promise<ImageBitmap | null> {
    const frame = this._frameService.frames[index];
    if (!frame) {
      return null;
    }
    const imageBitmap = await this.frameSource?.getFrameAtIndex(frame.index!, preFetch);
    return imageBitmap as ImageBitmap | null;
  }

  async getFrame(currentTime: number, playing: boolean = false): Promise<Frame | null> {
    const frame = this._frameService.getFrame(currentTime, this.startTime);
    if (!frame || frame.index === undefined) {
      return null;
    }
    const imageBitmap = await this.frameSource?.getFrameAtIndex(frame.index, playing);
    if (!imageBitmap) {
      return null;
    }
    frame.videoData = imageBitmap;
    return frame;
  }

  cleanup(): void {
    if (this.frameSource) {
      this.frameSource.cleanup();
      this.frameSource = undefined;
    }
  }

  protected _createCloneInstance(): AbstractMedia {
    const videoMedia = new VideoMedia(this.name);
    const timestamps = this.frameSource?.metadata.timestamps || [];
    videoMedia._frameService = createFrameService(this.totalTimeInMilSeconds, this.startTime, timestamps);
    videoMedia._frameService.initializeFrames();
    videoMedia.frameSource = this.frameSource;
    return videoMedia;
  }
}
