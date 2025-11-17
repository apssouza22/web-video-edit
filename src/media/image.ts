import {FlexibleLayer} from './media-common';
import {LayerCoordinates, LayerFile} from './types';
import {Frame} from '@/frame';

export class ImageMedia extends FlexibleLayer {
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
          this.ready = true;
          this.renderer.setSize(this.width, this.height);
          this.loadUpdateListener(this, 100, this.ctx);
        }).bind(this));
      }
    }).bind(this), false);

    this.reader.readAsDataURL(file as File);
  }

  async render(ctx_out: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): Promise<void> {
    if (!this.ready) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }

    // Check if we need to re-render this frame
    if (!this.shouldReRender(currentTime)) {
      this.drawScaled(this.ctx, ctx_out);
      return;
    }

    const frame = await this.getFrame(currentTime);
    if (!frame) {
      return;
    }
    frame.videoData = this.img;
    this.renderer.drawFrame(frame)
    this.drawScaled(this.ctx, ctx_out);
    this.updateRenderCache(currentTime);
  }
}
