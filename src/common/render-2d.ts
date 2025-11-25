import {dpr} from '@/constants';
import {Frame} from "@/frame";

export type ESRenderingContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type CanvasElement = HTMLCanvasElement | OffscreenCanvas;

/**
 * Canvas 2D rendering wrapper class with TypeScript support
 */
export class Canvas2DRender {
  // @ts-ignore
  #canvas: HTMLCanvasElement | OffscreenCanvas;
  #ctx: ESRenderingContext2D;
  #transferable: OffscreenCanvas | null = null;

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.#canvas = canvas.transferControlToOffscreen();
      this.#ctx = canvas.getContext("2d", {willReadFrequently: true})!;
    } else {
      this.#canvas = document.createElement('canvas');
      this.#transferable = document.createElement('canvas').transferControlToOffscreen();
      this.#ctx = this.#canvas.getContext('2d', {willReadFrequently: true})!;
    }
  }

  get canvas(): HTMLCanvasElement | OffscreenCanvas {
    return this.#canvas;
  }

  get transferableCanvas(): OffscreenCanvas | null {
    return this.#transferable;
  }

  get context(): ESRenderingContext2D {
    return this.#ctx;
  }

  get width(): number {
    return this.#canvas?.width ?? 0;
  }

  get height(): number {
    return this.#canvas?.height ?? 0;
  }

  get clientWidth(): number {
    if (this.#canvas instanceof HTMLCanvasElement) {
      return this.#canvas.clientWidth;
    }
    return this.#canvas?.width ?? 0;
  }

  get clientHeight(): number {
    if (this.#canvas instanceof HTMLCanvasElement) {
      return this.#canvas.clientHeight;
    }
    return this.#canvas?.height ?? 0;
  }

  setSize(width: number, height: number): void {
    if (this.#canvas) {
      this.#canvas.width = width;
      this.#canvas.height = height;
    }
  }

  // Context drawing methods
  clearRect(x: number = 0, y: number = 0, width: number | null = null, height: number | null = null): void {
    if (!this.#ctx || !this.#canvas) return;

    const w = width !== null ? width : this.#canvas.width;
    const h = height !== null ? height : this.#canvas.height;
    this.#ctx.clearRect(x, y, w, h);
  }

  drawFrame(frame: Frame): void {
    this.#drawImage(
        frame.videoData as VideoFrame,
        0, 0,
        this.width, this.height,
        0, 0,
        this.width,
        this.height
    );
  }

  #drawImage(
      image: CanvasImageSource,
      sx: number,
      sy: number,
      sWidth: number | null = null,
      sHeight: number | null = null,
      dx: number | null = null,
      dy: number | null = null,
      dWidth: number | null = null,
      dHeight: number | null = null
  ): void {
    if (!this.#ctx) return;

    if (sWidth === null) {
      this.#ctx.drawImage(image, sx, sy);
    } else if (dx === null) {
      this.#ctx.drawImage(image, sx, sy, sWidth, sHeight!);
    } else {
      this.#ctx.drawImage(image, sx, sy, sWidth, sHeight!, dx, dy!, dWidth!, dHeight!);
    }
  }


  getImageData(sx: number = 0, sy: number = 0, sw: number | null = null, sh: number | null = null): ImageData | null {
    if (!this.#ctx || !this.#canvas) return null;

    const w = sw !== null ? sw : this.#canvas.width;
    const h = sh !== null ? sh : this.#canvas.height;
    return this.#ctx.getImageData(sx, sy, w, h);
  }

  save(): void {
    if (!this.#ctx) return;
    this.#ctx.save();
  }

  restore(): void {
    if (!this.#ctx) return;
    this.#ctx.restore();
  }

  translate(x: number, y: number): void {
    if (!this.#ctx) return;
    this.#ctx.translate(x, y);
  }

  scale(x: number, y: number): void {
    if (!this.#ctx) return;
    this.#ctx.scale(x, y);
  }


  // Static method for standalone usage (maintains backward compatibility)
  static drawScaled(
      ctxFrom: HTMLVideoElement | ESRenderingContext2D,
      ctxOutTo: ESRenderingContext2D
  ): void {
    const isVideo = ctxFrom instanceof HTMLVideoElement;
    const width = isVideo ? ctxFrom.videoWidth : (ctxFrom as ESRenderingContext2D).canvas.width ?? 0;
    const height = isVideo ? ctxFrom.videoHeight : (ctxFrom as ESRenderingContext2D).canvas.height ?? 0;

    let {ratio, offset_width, offset_height} = getCoordinates(width, height, ctxOutTo.canvas);
    ctxOutTo.drawImage(
        isVideo ? ctxFrom : (ctxFrom as ESRenderingContext2D).canvas as CanvasImageSource,
        0, 0,
        width, height,
        offset_width, offset_height,
        ratio * width, ratio * height
    );
  }

  static drawTransformed(
      ctxFrom: ESRenderingContext2D,
      ctxOutTo: ESRenderingContext2D,
      frame: Frame
  ): void {
    const width = ctxFrom.canvas.width ?? 0;
    const height = ctxFrom.canvas.height ?? 0;
    const bounding = getBoundingBox(width, height, ctxOutTo.canvas);

    ctxOutTo.save();
    ctxOutTo.translate(
      bounding.centerX + frame.x * bounding.ratio * bounding.scaleFactor, 
      bounding.centerY + frame.y * bounding.ratio * bounding.scaleFactor
    );
    
    if (frame.rotation) {
      ctxOutTo.rotate((frame.rotation * Math.PI) / 180);
    }
    let scaledWidth = bounding.width * frame.scale * bounding.scaleFactor;
    let scaledHeight = bounding.height * frame.scale * bounding.scaleFactor;

    if (width < ctxOutTo.canvas.width || height < ctxOutTo.canvas.height) {
      scaledWidth = width * frame.scale * bounding.scaleFactor;
      scaledHeight = height * frame.scale * bounding.scaleFactor;
    }

    ctxOutTo.drawImage(
        ctxFrom.canvas as CanvasImageSource,
        0, 0,
        width, height,
        -scaledWidth / 2, -scaledHeight / 2,
        scaledWidth, scaledHeight
    );
    
    ctxOutTo.restore();
  }
}

export function getBoundingBox(width: number, height: number, canvas: CanvasElement) {
  const {ratio, offset_width, offset_height} = getCoordinates(width, height, canvas);
  const canvasScaled = canvas.width !== (canvas as HTMLCanvasElement).clientWidth;
  const scaleFactor = canvasScaled ? dpr : 1;
  const baseWidth = ratio * width;
  const baseHeight = ratio * height;
  
  return {
    x: offset_width,
    y: offset_height,
    width: baseWidth,
    height: baseHeight,
    ratio: ratio,
    scaleFactor: scaleFactor,
    centerX: (offset_width + baseWidth / 2) * scaleFactor,
    centerY: (offset_height + baseHeight / 2) * scaleFactor
  };
}

function getCoordinates(width: number, height: number, canvas: CanvasElement) {
  const in_ratio = width / height;
  // Check if the output canvas context has been scaled by device pixel ratio
  const canvasScaled = canvas.width !== (canvas as HTMLCanvasElement).clientWidth;
  const outLogicalWidth = canvasScaled ? canvas.width / dpr : canvas.width;
  const outLogicalHeight = canvasScaled ? canvas.height / dpr : canvas.height;
  const out_ratio = outLogicalWidth / outLogicalHeight;

  let ratio = 1;
  let offset_width = 0;
  let offset_height = 0;
  if (in_ratio > out_ratio) { // input is wider - match width
    ratio = outLogicalWidth / width;
    offset_height = (outLogicalHeight - (ratio * height)) / 2;
  } else { // output is wider - match height
    ratio = outLogicalHeight / height;
    offset_width = (outLogicalWidth - (ratio * width)) / 2;
  }
  return {ratio, offset_width, offset_height};
}
