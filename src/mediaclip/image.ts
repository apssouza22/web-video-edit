import {AbstractMedia, FlexibleMedia} from './media-common';
import {Canvas2DRender} from '@/common/render-2d';
import {StudioState} from "@/common";
import {FrameSource} from '@/mediaclip/mediasource';

export class ImageMedia extends FlexibleMedia {
  private frameSource: FrameSource;

  constructor(name: string, frameSource: FrameSource) {
    super(name);

    this.frameSource = frameSource;
    this.initializeFromFrameSource(frameSource);
  }

  private initializeFromFrameSource(frameSource: FrameSource): void {
    this._width = frameSource.metadata.width;
    this._height = frameSource.metadata.height;
    this._renderer.setSize(this._width, this._height);
    StudioState.getInstance().setMaxVideoSizes(this._width, this._height);
    this._ready = true;
  }

  async render(ctxTo: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): Promise<void> {
    if (!this._ready) {
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
      Canvas2DRender.drawTransformed(this.ctx, ctxTo, frame);
      return;
    }

    const imageData = await this.frameSource?.getFrameAtIndex(0);
    if (imageData) {
      frame.videoData = imageData;
    }
    this._renderer.drawFrame(frame);
    Canvas2DRender.drawTransformed(this.ctx, ctxTo, frame);
    this.updateRenderCache(currentTime);
  }


  protected _createCloneInstance(): AbstractMedia {
    const imageMedia = new ImageMedia(this.name, this.frameSource);
    imageMedia.frameSource = this.frameSource;
    imageMedia._width = this._width;
    imageMedia._height = this._height;
    imageMedia._renderer.setSize(this._width, this._height);
    imageMedia._ready = true;
    return imageMedia;
  }
}
