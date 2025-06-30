import {dpr} from '../constants.js';

export class Canvas2DRender {
  #canvas = null;
  #ctx = null;

  constructor(canvas = null) {
    if (canvas) {
      this.#canvas = canvas;
      this.#ctx = canvas.getContext("2d", {willReadFrequently: true});
    } else {
      this.#createCanvas();
    }
  }

  // Canvas management methods
  #createCanvas() {
    this.#canvas = document.createElement('canvas');
    this.#ctx = this.#canvas.getContext('2d', {willReadFrequently: true});
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

  // Static method for standalone usage (maintains backward compatibility)
  static drawScaled(ctxFrom, ctxOutTo, video = false) {
    const width = video ? ctxFrom.videoWidth : ctxFrom.canvas.clientWidth;
    const height = video ? ctxFrom.videoHeight : ctxFrom.canvas.clientHeight;
    const in_ratio = width / height;

    // Check if the output canvas context has been scaled by device pixel ratio
    // by comparing actual canvas size to client size
    const canvasScaled = ctxOutTo.canvas.width !== ctxOutTo.canvas.clientWidth;
    
    // Use appropriate dimensions based on whether canvas is scaled
    const outLogicalWidth = canvasScaled ? 
      ctxOutTo.canvas.width / dpr : 
      ctxOutTo.canvas.width;
    const outLogicalHeight = canvasScaled ? 
      ctxOutTo.canvas.height / dpr : 
      ctxOutTo.canvas.height;
    
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

}
