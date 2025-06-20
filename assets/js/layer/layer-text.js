import { FlexibleLayer } from './index.js';

export class TextLayer extends FlexibleLayer {
  constructor(text) {
    let f = {
      name: text
    };
    super(f);
    this.color = "#ffffff";
    this.shadow = true;
    this.ready = true;
    setTimeout(() => {
      this.loadUpdateListener(this,100, this.ctx, null);
    }, 10);
  }

  /**
   * Update the layer's dimensions and text properties
   *
   * @param change
   * @param refTime
   */
  update(change, refTime) {
    let rect = this.renderer.measureText(this.name);
    this.width = rect.width;
    this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
    super.update(change, refTime);
  }

  render(ctxOut, refTime, playing = false) {
    if (!this.isLayerVisible(refTime)) {
      return;
    }
    let frame = this.getFrame(refTime);
    if (!frame) {
      return;
    }
    if (!this.shouldRender(refTime, playing)) {
      this.drawScaled(this.ctx, ctxOut);
      return;
    }

    let scale = frame[2];
    this.renderer.font = Math.floor(scale * 30) + "px sans-serif";
    let rect = this.renderer.measureText(this.name);
    this.width = rect.width;
    this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
    let x = frame[0] + this.renderer.width / 2;
    let y = frame[1] + this.renderer.height / 2;
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
    this.renderer.rotate(frame[3] * (Math.PI / 180));
    this.renderer.textAlign = "center";
    this.renderer.fillText(this.name, 0, 0);
    this.renderer.restore();
    this.drawScaled(this.ctx, ctxOut);
    this.updateRenderCache(refTime);
  }
}
