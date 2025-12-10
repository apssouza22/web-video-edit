import {dpr} from '@/constants';
import {Frame} from "@/mediaclip/frame";

export type ESRenderingContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type CanvasElement = HTMLCanvasElement | OffscreenCanvas;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface MediaBounds {
  css: Rect;
  physical: Rect;
  ratio: number;
  pixelRatio: number;
  scaleFactor: number;
}

export interface FrameTransformInput {
  x: number;
  y: number;
  scale: number;
}

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
        frame.videoData as CanvasImageSource,
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
    const fromWidth = ctxFrom.canvas.width ?? 0;
    const fromHeight = ctxFrom.canvas.height ?? 0;
    
    const bounds = calculateMediaBounds(fromWidth, fromHeight, ctxOutTo.canvas, {
      x: frame.x,
      y: frame.y,
      scale: frame.scale
    });

    ctxOutTo.save();
    ctxOutTo.translate(bounds.physical.centerX, bounds.physical.centerY);
    
    if (frame.rotation) {
      ctxOutTo.rotate((frame.rotation * Math.PI) / 180);
    }

    ctxOutTo.drawImage(
        ctxFrom.canvas as CanvasImageSource,
        0, 0,
        fromWidth, fromHeight,
        -bounds.physical.width / 2, -bounds.physical.height / 2,
        bounds.physical.width, bounds.physical.height
    );
    
    ctxOutTo.restore();
  }
}

function getBoundingBox(width: number, height: number, canvas: CanvasElement) {
  const {ratio, offset_width, offset_height} = getCoordinates(width, height, canvas);
  const scaleFactor = 1;
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

function getLogicalDimensions(canvas: CanvasElement): {width: number, height: number} {
  if (canvas instanceof HTMLCanvasElement && canvas.clientWidth > 0) {
    return {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };
  }
  return {
    width: canvas.width / dpr,
    height: canvas.height / dpr
  };
}

function getPixelRatio(canvas: CanvasElement): number {
  if (canvas instanceof HTMLCanvasElement && canvas.clientWidth > 0) {
    return canvas.width / canvas.clientWidth;
  }
  return dpr;
}

/**
 * Calculate media bounds on the canvas with given transformations
 * The result contains both physical pixel dimensions and CSS dimensions
 * This is useful for rendering on high-DPI displays
 *
 * @param sourceWidth
 * @param sourceHeight
 * @param canvas
 * @param frameTransform
 */
export function calculateMediaBounds(
  sourceWidth: number,
  sourceHeight: number,
  canvas: CanvasElement,
  frameTransform: FrameTransformInput = { x: 0, y: 0, scale: 1 }
): MediaBounds {
  const bounding = getBoundingBox(sourceWidth, sourceHeight, canvas);
  const logicalDimensions = getLogicalDimensions(canvas);
  const pixelRatio = getPixelRatio(canvas);
  const scaleFactor = bounding.scaleFactor;

  let baseWidth = bounding.width * scaleFactor;
  let baseHeight = bounding.height * scaleFactor;

  if (sourceWidth < logicalDimensions.width || sourceHeight < logicalDimensions.height) {
    baseWidth = sourceWidth * scaleFactor * pixelRatio;
    baseHeight = sourceHeight * scaleFactor * pixelRatio;
  }

  const transformedCenterX = bounding.centerX + frameTransform.x * bounding.ratio * scaleFactor;
  const transformedCenterY = bounding.centerY + frameTransform.y * bounding.ratio * scaleFactor;

  const scaledWidth = baseWidth * frameTransform.scale;
  const scaledHeight = baseHeight * frameTransform.scale;

  const physicalX = transformedCenterX - scaledWidth / 2;
  const physicalY = transformedCenterY - scaledHeight / 2;

  return {
    physical: {
      x: physicalX,
      y: physicalY,
      width: scaledWidth,
      height: scaledHeight,
      centerX: transformedCenterX,
      centerY: transformedCenterY
    },
    css: {
      x: physicalX / pixelRatio,
      y: physicalY / pixelRatio,
      width: scaledWidth / pixelRatio,
      height: scaledHeight / pixelRatio,
      centerX: transformedCenterX / pixelRatio,
      centerY: transformedCenterY / pixelRatio
    },
    ratio: bounding.ratio,
    pixelRatio,
    scaleFactor
  };
}

function getCoordinates(width: number, height: number, canvas: CanvasElement) {
  const in_ratio = width / height;
  const outLogicalWidth = canvas.width;
  const outLogicalHeight = canvas.height;
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

export function isCanvasScaled(canvas: CanvasElement): boolean {
    // Check if the output canvas context has been scaled by device pixel ratio
  if (canvas instanceof HTMLCanvasElement) {
    return canvas.width !== (canvas as HTMLCanvasElement).clientWidth;
  }
  return false;
}