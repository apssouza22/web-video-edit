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
    let rect = this.ctx.measureText(this.name);
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
    this.ctx.font = Math.floor(scale * 30) + "px sans-serif";
    let rect = this.ctx.measureText(this.name);
    this.width = rect.width;
    this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
    let x = frame[0] + this.canvas.width / 2;
    let y = frame[1] + this.canvas.height / 2;
    if (this.shadow) {
      this.ctx.shadowColor = "black";
      this.ctx.shadowBlur = 7;
    } else {
      this.ctx.shadowColor = null;
      this.ctx.shadowBlur = null;
    }
    this.ctx.fillStyle = this.color;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(frame[3] * (Math.PI / 180));
    this.ctx.textAlign = "center";
    this.ctx.fillText(this.name, 0, 0);
    this.ctx.restore();
    this.drawScaled(this.ctx, ctxOut);
    this.updateRenderCache(refTime, playing);
  }
}
