import { FlexibleLayer } from './index.js';

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
        this.loadUpdateListener(this, 100, this.ctx, null);
      }).bind(this));
    }).bind(this), false);
    this.reader.readAsDataURL(file);
  }

  render(ctx_out, currentTime, playing = false) {
    if (!this.ready) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }
    
    // Check if we need to re-render this frame
    if (!this.shouldReRender(currentTime)) {
      // If we've already rendered this frame, just draw the cached canvas
      this.drawScaled(this.ctx, ctx_out);
      return;
    }
    
    let f = this.getFrame(currentTime);
    if (f) {
      let scale = f.scale;
      let x = f.x + this.renderer.width / 2 - this.width / 2;
      let y = f.y + this.renderer.height / 2 - this.height / 2;
      this.renderer.clearRect();
      this.renderer.drawImage(this.img, 0, 0, this.width, this.height, x, y, scale * this.width, scale * this.height);
      this.drawScaled(this.ctx, ctx_out);
      
      // Update the render cache
      this.updateRenderCache(currentTime);
    }
  }
}
