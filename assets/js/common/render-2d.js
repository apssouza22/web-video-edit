import {dpr} from '../constants.js';

export class Canvas2DRender {
  #canvas = null;
  #ctx = null;

  constructor(canvas = null) {
    if (canvas) {
      this.#canvas = canvas;
      this.#ctx = canvas.getContext("2d", { willReadFrequently: true });
    } else {
      this.#createCanvas();
    }
  }

  // Canvas management methods
  #createCanvas() {
    this.#canvas = document.createElement('canvas');
    this.#ctx = this.#canvas.getContext('2d', { willReadFrequently: true });
  }

  get canvas() {
    return this.#canvas;
  }

  get context() {
    return this.#ctx;
  }

  get width() {
    return this.#canvas.width;
  }

  get height() {
    return this.#canvas.height;
  }

  get clientWidth() {
    return this.#canvas.clientWidth;
  }

  get clientHeight() {
    return this.#canvas.clientHeight;
  }

  setSize(width, height) {
    this.#canvas.width = width;
    this.#canvas.height = height;
  }

  // Context drawing methods
  clearRect(x = 0, y = 0, width = null, height = null) {
    const w = width !== null ? width : this.#canvas.width;
    const h = height !== null ? height : this.#canvas.height;
    this.#ctx.clearRect(x, y, w, h);
  }

  drawImage(image, sx, sy, sWidth = null, sHeight = null, dx = null, dy = null, dWidth = null, dHeight = null) {
    if (sWidth === null) {
      this.#ctx.drawImage(image, sx, sy);
    } else if (dx === null) {
      this.#ctx.drawImage(image, sx, sy, sWidth, sHeight);
    } else {
      this.#ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }
  }

  putImageData(imageData, dx, dy) {
    this.#ctx.putImageData(imageData, dx, dy);
  }

  getImageData(sx = 0, sy = 0, sw = null, sh = null) {
    const w = sw !== null ? sw : this.#canvas.width;
    const h = sh !== null ? sh : this.#canvas.height;
    return this.#ctx.getImageData(sx, sy, w, h);
  }

  measureText(text) {
    return this.#ctx.measureText(text);
  }

  fillText(text, x, y, maxWidth = null) {
    if (maxWidth !== null) {
      this.#ctx.fillText(text, x, y, maxWidth);
    } else {
      this.#ctx.fillText(text, x, y);
    }
  }

  save() {
    this.#ctx.save();
  }

  restore() {
    this.#ctx.restore();
  }

  translate(x, y) {
    this.#ctx.translate(x, y);
  }

  rotate(angle) {
    this.#ctx.rotate(angle);
  }

  scale(x, y) {
    this.#ctx.scale(x, y);
  }

  // Style properties
  set font(value) {
    this.#ctx.font = value;
  }

  get font() {
    return this.#ctx.font;
  }

  set fillStyle(value) {
    this.#ctx.fillStyle = value;
  }

  get fillStyle() {
    return this.#ctx.fillStyle;
  }

  set shadowColor(value) {
    this.#ctx.shadowColor = value;
  }

  get shadowColor() {
    return this.#ctx.shadowColor;
  }

  set shadowBlur(value) {
    this.#ctx.shadowBlur = value;
  }

  get shadowBlur() {
    return this.#ctx.shadowBlur;
  }

  set textAlign(value) {
    this.#ctx.textAlign = value;
  }

  get textAlign() {
    return this.#ctx.textAlign;
  }

  // Utility methods
  drawScaled(sourceRender, video = false) {
    this.drawScaledTo(sourceRender, this, video);
  }

  drawScaledTo(sourceRender, targetRender, video = false) {
    const source = video ? sourceRender : sourceRender.canvas;
    const width = video ? source.videoWidth : source.clientWidth;
    const height = video ? source.videoHeight : source.clientHeight;
    const in_ratio = width / height;

    // Use logical dimensions (buffer dimensions divided by device pixel ratio)
    const outLogicalWidth = targetRender.width / dpr;
    const outLogicalHeight = targetRender.height / dpr;
    const out_ratio = outLogicalWidth / outLogicalHeight;

    let ratio = 1;
    let offset_width = 0;
    let offset_height = 0;
    if (in_ratio > out_ratio) { // input is wider
      // match width
      ratio = outLogicalWidth / width;
      offset_height = (outLogicalHeight - (ratio * height)) / 2;
    } else { // output is wider
      // match height
      ratio = outLogicalHeight / height;
      offset_width = (outLogicalWidth - (ratio * width)) / 2;
    }
    
    targetRender.context.drawImage(
      source,
      0, 0, width, height,
      offset_width, offset_height, ratio * width, ratio * height
    );
  }

  // Static method for standalone usage (maintains backward compatibility)
  static drawScaled(ctxFrom, ctxOutTo, video = false) {
    const width = video ? ctxFrom.videoWidth : ctxFrom.canvas.clientWidth;
    const height = video ? ctxFrom.videoHeight : ctxFrom.canvas.clientHeight;
    const in_ratio = width / height;

    // Use logical dimensions (buffer dimensions divided by device pixel ratio)
    const outLogicalWidth = ctxOutTo.canvas.width / dpr;
    const outLogicalHeight = ctxOutTo.canvas.height / dpr;
    const out_ratio = outLogicalWidth / outLogicalHeight;

    let ratio = 1;
    let offset_width = 0;
    let offset_height = 0;
    if (in_ratio > out_ratio) { // input is wider
      // match width
      ratio = outLogicalWidth / width;
      offset_height = (outLogicalHeight - (ratio * height)) / 2;
    } else { // output is wider
      // match height
      ratio = outLogicalHeight / height;
      offset_width = (outLogicalWidth - (ratio * width)) / 2;
    }
    ctxOutTo.drawImage(
      (video ? ctxFrom : ctxFrom.canvas),
      0, 0, width, height,
      offset_width, offset_height, ratio * width, ratio * height
    );
  }

  // Frame drawing method (for video frames)
  draw(frame) {
    if (frame instanceof ImageData) {
      this.putImageData(frame, 0, 0);
    } else if (frame instanceof VideoFrame) {
      // Convert VideoFrame to ImageData
      const tempRender = new Canvas2DRender();
      tempRender.setSize(this.width, this.height);
      tempRender.drawImage(frame, 0, 0, this.width, this.height);
      const imageData = tempRender.getImageData();
      this.putImageData(imageData, 0, 0);
      frame.close();
    } else {
      // Assume it's an image-like object
      this.drawImage(frame, 0, 0, this.width, this.height);
    }
  }

  // Convenience method to add canvas to background
  addToBackground() {
    let bg = document.getElementById('background');
    if (bg) {
      bg.appendChild(this.#canvas);
    }
  }
}
