import {dpr} from '@/constants';
import {Frame} from "@/frame";

export type ESRenderingContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type CanvasElement = HTMLCanvasElement | OffscreenCanvas;

/**
 * Canvas 2D rendering wrapper class with TypeScript support
 */
export class Canvas2DRender{
  // @ts-ignore
  #canvas: HTMLCanvasElement | OffscreenCanvas;
  #ctx: ESRenderingContext2D;
  #transferable: OffscreenCanvas | null = null;

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.#canvas = canvas.transferControlToOffscreen();
      this.#ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    } else {
      this.#canvas = document.createElement('canvas');
      this.#transferable = document.createElement('canvas').transferControlToOffscreen();
      this.#ctx = this.#canvas.getContext('2d', { willReadFrequently: true })!;
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

  drawFrame(frame:Frame): void {
    const x = frame.x + this.width / 2 - this.width / 2;
    const y = frame.y + this.height / 2 - this.height / 2;
    this.#drawImage(
        frame.videoData as VideoFrame,
        0, 0,
        this.width, this.height,
        x, y,
        frame.scale * this.width,
        frame.scale * this.height
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

  measureText(text: string): TextMetrics{
    return this.#ctx.measureText(text);
  }

  fillText(text: string, x: number, y: number, maxWidth: number | null = null): void {
    if (!this.#ctx) return;
    
    if (maxWidth !== null) {
      this.#ctx.fillText(text, x, y, maxWidth);
    } else {
      this.#ctx.fillText(text, x, y);
    }
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

  rotate(angle: number): void {
    if (!this.#ctx) return;
    this.#ctx.rotate(angle);
  }

  scale(x: number, y: number): void {
    if (!this.#ctx) return;
    this.#ctx.scale(x, y);
  }

  // Style properties
  set font(value: string) {
    if (this.#ctx) {
      this.#ctx.font = value;
    }
  }

  get font(): string {
    return this.#ctx?.font ?? '';
  }

  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    if (this.#ctx) {
      this.#ctx.fillStyle = value;
    }
  }

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.#ctx?.fillStyle ?? '';
  }

  set shadowColor(value: string) {
    if (this.#ctx) {
      this.#ctx.shadowColor = value;
    }
  }

  get shadowColor(): string {
    return this.#ctx?.shadowColor ?? '';
  }

  set shadowBlur(value: number) {
    if (this.#ctx) {
      this.#ctx.shadowBlur = value;
    }
  }

  get shadowBlur(): number {
    return this.#ctx?.shadowBlur ?? 0;
  }

  set textAlign(value: CanvasTextAlign) {
    if (this.#ctx) {
      this.#ctx.textAlign = value;
    }
  }

  get textAlign(): CanvasTextAlign {
    return this.#ctx?.textAlign ?? 'start';
  }

  // Static method for standalone usage (maintains backward compatibility)
  static drawScaled(
    ctxFrom: HTMLVideoElement | ESRenderingContext2D,
    ctxOutTo: ESRenderingContext2D,
    video: boolean = false
  ): void {
    const width = video && ctxFrom instanceof HTMLVideoElement
      ? ctxFrom.videoWidth
      : ctxFrom instanceof Canvas2DRender
        ? ctxFrom.clientWidth
        : (ctxFrom as any).canvas?.clientWidth ?? 0;

    const height = video && ctxFrom instanceof HTMLVideoElement
      ? ctxFrom.videoHeight
      : ctxFrom instanceof Canvas2DRender
        ? ctxFrom.clientHeight
        : (ctxFrom as any).canvas?.clientHeight ?? 0;

    let {ratio, offset_width, offset_height} = getCoordinates(width, height, ctxOutTo.canvas);
    ctxOutTo.drawImage(
        video ? ctxFrom as HTMLVideoElement : (ctxFrom as ESRenderingContext2D).canvas as CanvasImageSource,
        0, 0,
        width, height,
        offset_width, offset_height,
        ratio * width, ratio * height
    );
  }
}

export function getBoundingBox(width: number, height: number, canvas: CanvasElement) {
  const {ratio, offset_width, offset_height} = getCoordinates(width, height, canvas);
  return {
    x: offset_width,
    y: offset_height,
    width: ratio * width,
    height: ratio * height,
    ratio: ratio
  };
}

function getCoordinates(width: number, height: number, canvas: CanvasElement) {
  const in_ratio = width / height;
  // Check if the output canvas context has been scaled by device pixel ratio
  // by comparing actual canvas size to client size
  const canvasScaled = canvas.width !== (canvas as HTMLCanvasElement).clientWidth;

  // Use appropriate dimensions based on whether canvas is scaled
  const outLogicalWidth = canvasScaled ? canvas.width / dpr : canvas.width;
  const outLogicalHeight = canvasScaled ? canvas.height / dpr : canvas.height;

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
  return {ratio, offset_width, offset_height};
}
