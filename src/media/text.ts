import {AbstractMedia, FlexibleMedia} from './media-common';
import {LayerChange, LayerFile} from './types';
import {Canvas2DRender} from '@/common/render-2d';

export class TextMedia extends FlexibleMedia {
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
    const rect = this.renderer.context.measureText(this.name);
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

    const context = this.renderer.context;
    context.font = "30px sans-serif";
    const rect = context.measureText(this.name);
    this.width = rect.width;
    this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
    
    const x = this.renderer.width / 2;
    const y = this.renderer.height / 2;
    
    if (this.shadow) {
      context.shadowColor = "black";
      context.shadowBlur = 7;
    } else {
      context.shadowColor = '';
      context.shadowBlur = 1;
    }
    
    context.fillStyle = this.color;
    this.renderer.clearRect();
    context.textAlign = "center";
    context.fillText(this.name, x, y);

    Canvas2DRender.drawTransformed(context, ctxOut, frame);
    this.updateRenderCache(refTime);
  }

  protected _createCloneInstance(): AbstractMedia {
    return new TextMedia(this.name) as AbstractMedia;
  }

  /**
   * Override clone to also copy TextMedia-specific properties
   */
  clone(): AbstractMedia {
    const cloned = super.clone();
    if (cloned) {
      (cloned as TextMedia).color = this.color;
      (cloned as TextMedia).shadow = this.shadow;
    }
    return cloned;
  }
}
