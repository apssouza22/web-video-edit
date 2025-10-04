import {FlexibleLayer} from './media-common';
import {LayerCoordinates, LayerFile} from './types';
import {Frame} from '@/frame';

export class ImageLayer extends FlexibleLayer {
  private img: HTMLImageElement;
  private reader: FileReader;

  constructor(file: LayerFile) {
    super(file);
    // assume images are 10 seconds
    this.img = new Image();
    this.reader = new FileReader();

    this.reader.addEventListener("load", ((): void => {
      if (typeof this.reader.result === 'string') {
        this.img.src = this.reader.result;
        this.img.addEventListener('load', ((): void => {
          this.width = this.img.naturalWidth;
          this.height = this.img.naturalHeight;
          this.ready = true;
          this.loadUpdateListener(this, 100, this.ctx);
        }).bind(this));
      }
    }).bind(this), false);

    this.reader.readAsDataURL(file as File);
  }

  render(ctx_out: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): void {
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

    const {f, scale, x, y} = this.getLayerCoordinates(currentTime);
    if (f) {
      this.renderer.clearRect();
      this.renderer.drawImage(
        this.img, 
        0, 0, 
        this.width, this.height, 
        x, y, 
        scale * this.width, 
        scale * this.height
      );
      this.drawScaled(this.ctx, ctx_out);
      this.updateRenderCache(currentTime);
    }
  }

  getLayerCoordinates(currentTime: number): LayerCoordinates {
    const f = this.getFrame(currentTime);
    if (!f) {
      return {
        f: new Frame(),
        scale: 1,
        x: 0,
        y: 0
      };
    }
    
    const scale = f.scale;
    const x = f.x + this.renderer.width / 2 - this.width / 2;
    const y = f.y + this.renderer.height / 2 - this.height / 2;
    
    return {f, scale, x, y};
  }
}
