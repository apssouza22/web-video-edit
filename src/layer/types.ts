import { Frame } from '@/frame';
import { FrameService } from '@/frame';
import { ESRenderingContext2D} from "@/common/render-2d";

/**
 * Types for file inputs used in layer creation
 */
export interface LayerFile {
  name: string;
  uri?: string;
  file?: File;
}

/**
 * Layer types that can be created
 */
export type LayerType = 'text' | 'video' | 'audio' | 'image';

/**
 * Layer load update listener function signature
 */
export type LayerLoadUpdateListener = (
  layer: any,
  progress: number,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
  audioBuffer?: AudioBuffer | undefined
) => void;

/**
 * Coordinates and transformation data for layer positioning
 */
export interface LayerCoordinates {
  f: Frame;
  scale: number;
  x: number;
  y: number;
}

/**
 * Changes that can be applied to a layer
 */
export interface LayerChange {
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
}

/**
 * Layer dump data for serialization
 */
export interface LayerDumpData {
  width: number;
  height: number;
  name: string;
  start_time: number;
  total_time: number;
  uri?: string;
  type: string;
  frames?: Float32Array[];
}

/**
 * Text layer specific properties
 */
export interface TextLayerProperties {
  color: string;
  shadow: boolean;
}

/**
 * Speed controller interface
 */
export interface SpeedControllerInterface {
  setSpeed(speed: number): void;
  getSpeed(): number;
}

/**
 * Canvas2D Render interface (matches the JavaScript implementation)
 */
export interface Canvas2DRenderInterface {
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  readonly context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly clientWidth: number;
  readonly clientHeight: number;

  setSize(width: number, height: number): void;
  clearRect(x?: number, y?: number, width?: number | null, height?: number | null): void;
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sWidth?: number | null,
    sHeight?: number | null,
    dx?: number | null,
    dy?: number | null,
    dWidth?: number | null,
    dHeight?: number | null
  ): void;
  putImageData(imageData: ImageData, dx: number, dy: number): void;
  getImageData(sx?: number, sy?: number, sw?: number | null, sh?: number | null): ImageData | null;
  measureText(text: string): TextMetrics;
  fillText(text: string, x: number, y: number, maxWidth?: number | null): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;

  // Style properties
  font: string;
  fillStyle: string | CanvasGradient | CanvasPattern;
  shadowColor: string | null;
  shadowBlur: number | null;
  textAlign: CanvasTextAlign;
}

/**
 * Demuxer metadata interface
 */
export interface DemuxerMetadata {
  totalTimeInMilSeconds: number;
  width: number;
  height: number;
}

/**
 * Video demuxer interface
 */
export interface VideoDemuxerInterface {
  setOnProgressCallback(callback: (progress: number) => void): void;
  setOnCompleteCallback(callback: (frames: any[]) => void): void;
  setOnMetadataCallback(callback: (metadata: DemuxerMetadata) => void): void;
  initDemux(file: LayerFile, renderer: Canvas2DRenderInterface): void;
}

/**
 * Layer service interface
 */
export interface LayerServiceInterface {
  clone(layer: any): any | null;
}

/**
 * Generic layer interface that all layers should implement
 */
export interface LayerInterface {
  framesCollection: FrameService;
  renderer: Canvas2DRenderInterface;
  loadUpdateListener: LayerLoadUpdateListener;
  audioBuffer : AudioBuffer | null;
  file?: LayerFile;
  name: string;
  id: string;
  description: string | null;
  uri?: string;
  ready: boolean;
  totalTimeInMilSeconds: number;
  start_time: number;
  width: number;
  height: number;
  lastRenderedTime: number;

  // Methods that all layers should implement
  addLoadUpdateListener(listener: LayerLoadUpdateListener): void;
  updateName(name: string): void;
  dump(): LayerDumpData;
  render(ctxOut: CanvasRenderingContext2D, currentTime: number, playing?: boolean): void;
  shouldReRender(currentTime: number): boolean;
  updateRenderCache(currentTime: number): void;
  init(canvasWidth?: number, canvasHeight?: number | null, audioContext?: AudioContext | null): void;
  resize(width: number, height: number): void;
  update(change: LayerChange, referenceTime: number): void;
  getFrame(ref_time: number): Frame | null;
  drawScaled(ctxFrom: HTMLVideoElement | ESRenderingContext2D, ctxOutTo: CanvasRenderingContext2D, video?: boolean): void;
  isLayerVisible(time: number): boolean;
  adjustTotalTime(diff: number): void;

  // Speed control methods
  setSpeed(speed: number): void;
  getSpeed(): number;
}
