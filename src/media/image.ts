import {FlexibleMedia} from './media-common';
import {LayerFile} from './types';
import {Canvas2DRender} from '@/common/render-2d';
import {StudioState} from "@/common";

export class ImageMedia extends FlexibleMedia {
  private img: HTMLImageElement;
  private reader: FileReader;

  constructor(file: LayerFile) {
    super(file);
    this.img = new Image();
    this.reader = new FileReader();

    this.reader.addEventListener("load", ((): void => {
      if (typeof this.reader.result === 'string') {
        this.img.src = this.reader.result;
        this.img.addEventListener('load', ((): void => {
          this.width = this.img.naturalWidth;
          this.height = this.img.naturalHeight;
          this.renderer.setSize(this.width, this.height);
          StudioState.getInstance().setMinVideoSizes(this.width, this.height)
          this.ready = true;
          this.loadUpdateListener(this, 100);
        }).bind(this));
      }
    }).bind(this), false);

    this.reader.readAsDataURL(file as File);
  }


  async render(ctxTo: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): Promise<void> {
    if (!this.ready) {
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

    frame.videoData = this.img;
    this.renderer.drawFrame(frame);
    Canvas2DRender.drawTransformed(this.ctx, ctxTo, frame);
    this.updateRenderCache(currentTime);
  }

  protected _createCloneInstance(): this {
    return new ImageMedia(this.file!) as this;
  }
}
