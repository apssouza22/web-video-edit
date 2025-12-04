import {createFrameService, Frame} from '@/medialayer/frame';
import {AbstractMedia} from './media-common';
import {LayerFile} from './types';
import {Canvas2DRender} from '@/common/render-2d';
import {FrameSource} from '@/mediasource';

export class VideoMedia extends AbstractMedia {
  private frameSource: FrameSource | undefined;

  constructor(file: LayerFile, frameSource?: FrameSource) {
    super(file);

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

    this._frameService = createFrameService(this.totalTimeInMilSeconds, this.startTime);
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
    const videoFrame = await this.frameSource?.getFrameAtIndex(frame.index!);
    return videoFrame as VideoFrame | null;
  }

  async getFrame(currentTime: number): Promise<Frame | null> {
    const index = this._frameService.getIndex(currentTime, this.startTime);
    if (index < 0 || index >= this._frameService.getLength()) {
      return null;
    }
    const frame = this._frameService.frames[index];
    const videoFrame = await this.frameSource?.getFrameAtIndex(frame.index!);
    if (!videoFrame) {
      return null;
    }
    return new Frame(videoFrame, frame.x, frame.y, frame.scale, frame.rotation, frame.anchor);
  }

  cleanup(): void {
    if (this.frameSource) {
      this.frameSource.cleanup();
      this.frameSource = undefined;
    }
  }

  protected _createCloneInstance(): AbstractMedia {
    const videoMedia = new VideoMedia(this._file!);
    videoMedia._frameService = createFrameService(this.totalTimeInMilSeconds, this.startTime);
    videoMedia._frameService.initializeFrames();
    videoMedia.frameSource = this.frameSource;
    return videoMedia;
  }
}
