import {FlexibleLayer} from './media-common';
import {LayerChange, LayerFile} from './types';
import {Canvas2DRender} from '@/common/render-2d';

export class TextMedia extends FlexibleLayer {
  public color: string;
  public shadow: boolean;

  constructor(text: string) {
    // @ts-ignore
    const fakeFile: LayerFile = {
      name: text
    };
    
    super(fakeFile);
    this.color = "#ffffff";
    this.shadow = true;
    this.ready = true;
    
    setTimeout(() => {
      this.loadUpdateListener(this, 100, this.ctx);
    }, 10);
  }

  /**
   * Update the media's dimensions and text properties
   */
  async update(change: LayerChange, refTime: number): Promise<void> {
    const rect = this.renderer.measureText(this.name);
    this.width = rect.width;
    this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
    super.update(change, refTime);
  }

  async render(ctxOut: CanvasRenderingContext2D, refTime: number, playing: boolean = false): Promise<void> {
    if (!this.isLayerVisible(refTime)) {
      return;
    }

    const frame = await this.getFrame(refTime);
    if (!frame) {
      return;
    }

    if (!this.shouldReRender(refTime)) {
      Canvas2DRender.drawTransformed(this.ctx, ctxOut, frame);
      return;
    }

    this.renderer.font = "30px sans-serif";
    const rect = this.renderer.measureText(this.name);
    this.width = rect.width;
    this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
    
    const x = this.renderer.width / 2;
    const y = this.renderer.height / 2;
    
    if (this.shadow) {
      this.renderer.shadowColor = "black";
      this.renderer.shadowBlur = 7;
    } else {
      this.renderer.shadowColor = '';
      this.renderer.shadowBlur = 1;
    }
    
    this.renderer.fillStyle = this.color;
    this.renderer.clearRect();
    this.renderer.textAlign = "center";
    this.renderer.fillText(this.name, x, y);
    Canvas2DRender.drawTransformed(this.renderer.context, ctxOut, frame);
    this.updateRenderCache(refTime);
  }
}
