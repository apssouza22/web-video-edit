import {FlexibleLayer} from './media-common';
import {LayerChange, LayerFile} from './types';

export class TextLayer extends FlexibleLayer {
  public color: string;
  public shadow: boolean;

  constructor(text: string) {
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
   * Update the layer's dimensions and text properties
   */
  update(change: LayerChange, refTime: number): void {
    const rect = this.renderer.measureText(this.name);
    this.width = rect.width;
    this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
    super.update(change, refTime);
  }

  render(ctxOut: CanvasRenderingContext2D, refTime: number, playing: boolean = false): void {
    if (!this.isLayerVisible(refTime)) {
      return;
    }
    
    const frame = this.getFrame(refTime);
    if (!frame) {
      return;
    }
    
    if (!this.shouldReRender(refTime)) {
      this.drawScaled(this.ctx, ctxOut);
      return;
    }

    const scale = frame.scale;
    this.renderer.font = Math.floor(scale * 30) + "px sans-serif";
    const rect = this.renderer.measureText(this.name);
    this.width = rect.width;
    this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
    
    const x = frame.x + this.renderer.width / 2;
    const y = frame.y + this.renderer.height / 2;
    
    if (this.shadow) {
      this.renderer.shadowColor = "black";
      this.renderer.shadowBlur = 7;
    } else {
      this.renderer.shadowColor = null;
      this.renderer.shadowBlur = null;
    }
    
    this.renderer.fillStyle = this.color;
    this.renderer.clearRect();
    this.renderer.save();
    this.renderer.translate(x, y);
    this.renderer.rotate(frame.rotation * (Math.PI / 180));
    this.renderer.textAlign = "center";
    this.renderer.fillText(this.name, 0, 0);
    this.renderer.restore();
    this.drawScaled(this.renderer.context, ctxOut);
    this.updateRenderCache(refTime);
  }
}
