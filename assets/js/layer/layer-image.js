

import { FlexibleLayer } from './layer-common.js';

export class ImageLayer extends FlexibleLayer {
  constructor(file) {
    super(file);
    // assume images are 10 seconds
    this.img = new Image();

    this.reader = new FileReader();
    this.reader.addEventListener("load", (function () {
      this.img.src = this.reader.result;
      this.img.addEventListener('load', (function () {
        this.width = this.img.naturalWidth;
        this.height = this.img.naturalHeight;
        this.ready = true;
        this.loadUpdateListener(100);
      }).bind(this));
    }).bind(this), false);
    this.reader.readAsDataURL(file);
  }

  render(ctx_out, ref_time, playing = false) {
    if (!this.ready) {
      return;
    }
    
    // Check if we need to re-render this frame
    if (!this.shouldRender(ref_time, playing)) {
      // If we've already rendered this frame, just draw the cached canvas
      this.drawScaled(this.ctx, ctx_out);
      return;
    }
    
    let f = this.getFrame(ref_time);
    if (f) {
      let scale = f[2];
      let x = f[0] + this.canvas.width / 2 - this.width / 2;
      let y = f[1] + this.canvas.height / 2 - this.height / 2;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.img, 0, 0, this.width, this.height, x, y, scale * this.width, scale * this.height);
      this.drawScaled(this.ctx, ctx_out);
      
      // Update the render cache
      this.updateRenderCache(ref_time, playing);
    }
  }
}
