
class Canvas2DRenderer {
  #canvas = null;
  #ctx = null;

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");
  }

  draw(frame) {
    this.#canvas.width = frame.displayWidth;
    this.#canvas.height = frame.displayHeight;
    this.#ctx.drawImage(frame, 0, 0, frame.displayWidth, frame.displayHeight);
    frame.close();
  }

  getImageData(x, y, width, height) {
    return this.#ctx.getImageData(x, y, this.#canvas.width, this.#canvas.height);
  }

  get canvas() {
    return this.#canvas;
  }

  clearRect(x = 0, y = 0, width = null, height = null) {
    const w = width !== null ? width : this.#canvas.width;
    const h = height !== null ? height : this.#canvas.height;
    this.#ctx.clearRect(x, y, w, h);
  }
}
