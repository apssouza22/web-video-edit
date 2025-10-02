import { createFrameService } from '../frame/index';
import { FrameService } from '../frame/frames';
import { Frame } from '../frame/frame';
import { Canvas2DRender } from '../common/render-2d.js';
import { SpeedController } from './speed-controller';
import { 
  LayerFile,
  LayerInterface,
  LayerLoadUpdateListener,
  LayerChange,
  LayerDumpData,
  Canvas2DRenderInterface
} from './types';

export class StandardLayer implements LayerInterface {
  public audioBuffer: AudioBuffer | null = null;
  public file?: LayerFile;
  public name: string;
  public id: string;
  public description: string | null;
  public uri?: string;
  public ready: boolean;
  public totalTimeInMilSeconds: number;
  public start_time: number;
  public width: number;
  public height: number;
  public renderer: Canvas2DRenderInterface;
  public loadUpdateListener: LayerLoadUpdateListener;
  public lastRenderedTime: number;
  public framesCollection: FrameService;
  public speedController: SpeedController;

  constructor(file?: LayerFile) {
    this.file = file;
    this.name = file?.name || 'Layer';
    this.id = this.name + "-" + crypto.randomUUID();
    this.description = null;
    
    if (file?.uri) {
      this.uri = file.uri;
    }
    
    this.ready = false;
    this.totalTimeInMilSeconds = 0;
    this.start_time = 0;
    this.width = 0;
    this.height = 0;
    this.renderer = new Canvas2DRender();
    this.loadUpdateListener = (layer, progress, ctx, audioBuffer) => {
      // Default empty listener
    };
    this.lastRenderedTime = -1;

    this.framesCollection = createFrameService(this.totalTimeInMilSeconds, this.start_time, false);
    this.speedController = new SpeedController(this);
    addElementToBackground(this.renderer.canvas);
    this.updateName(this.name);
  }

  // Getters for backward compatibility
  get canvas(): HTMLCanvasElement {
    return this.renderer.canvas;
  }

  get ctx(): CanvasRenderingContext2D {
    return this.renderer.context;
  }

  /**
   * Adjusts the total time of the video layer by adding or removing frames
   */
  adjustTotalTime(diff: number): void {
    if (!this.ready || !this.framesCollection) {
      console.warn('VideoLayer not ready or frames collection not available');
      return;
    }
    if (this.audioBuffer) {
      console.log("Audio layer cannot adjust total time");
      return;
    }
    this.framesCollection.adjustTotalTime(diff);
    this.totalTimeInMilSeconds = this.framesCollection.getTotalTimeInMilSec();
    this.#resetRenderCache();
  }

  /**
   * Checks if the layer is visible at the given time
   */
  isLayerVisible(time: number): boolean {
    return time >= this.start_time && time < this.start_time + this.totalTimeInMilSeconds;
  }

  /**
   * Listens for the load event and calls the provided function when the layer is ready
   */
  addLoadUpdateListener(listener: LayerLoadUpdateListener): void {
    if (typeof listener !== 'function') {
      throw new Error('onLoadUpdate listener must be a function');
    }
    this.loadUpdateListener = listener;
  }

  updateName(name: string): void {
    this.name = name;
  }

  dump(): LayerDumpData {
    return {
      width: this.width,
      height: this.height,
      name: this.name,
      start_time: this.start_time,
      total_time: this.totalTimeInMilSeconds,
      uri: this.uri,
      type: this.constructor.name
    };
  }

  render(ctxOut: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): void {
    // This is the base render method that subclasses should override
    // It now includes caching logic to avoid redundant rendering
    console.log("render not implemented");
  }

  /**
   * Checks if the layer needs to be rendered again based on time and playing state
   */
  shouldReRender(currentTime: number): boolean {
    // Only re-render if time has changed
    return currentTime !== this.lastRenderedTime;
  }

  /**
   * Updates the rendering cache information
   */
  updateRenderCache(currentTime: number): void {
    this.lastRenderedTime = currentTime;
  }

  /**
   * Resets the rendering cache, forcing a re-render on next frame
   * Call this method after operations that change the visual appearance
   * like updates to position, scale, or rotation
   */
  #resetRenderCache(): void {
    this.lastRenderedTime = -1;
  }

  init(canvasWidth: number = 500, canvasHeight: number | null = null, audioContext: AudioContext | null = null): void {
    this.renderer.setSize(canvasWidth, canvasHeight);
  }

  resize(width: number, height: number): void {
    console.log("Resizing layer to width:", width, "height:", height);
    this.renderer.setSize(width, height);
    this.#resetRenderCache();
  }

  /**
   * Updates the frame at the specified reference time with the provided changes
   *
   * NOTICE: Currently ignores the reference time and applies changes to all frames.
   */
  update(change: LayerChange, referenceTime: number): void {
    let f = this.getFrame(referenceTime);
    if (!f) {
      return;
    }

    let hasChanges = false;

    if (change.scale) {
      const newScale = f.scale * change.scale;
      const canvasWidth = this.renderer.width;
      const canvasHeight = this.renderer.height;

      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        const frame = this.framesCollection.frames[i];
        const distanceFromCenterX = frame.x - (canvasWidth / 2);
        const distanceFromCenterY = frame.y - (canvasHeight / 2);
        const scaleFactor = newScale / frame.scale;
        const newDistanceFromCenterX = distanceFromCenterX * scaleFactor;
        const newDistanceFromCenterY = distanceFromCenterY * scaleFactor;

        frame.x = (canvasWidth / 2) + newDistanceFromCenterX;
        frame.y = (canvasHeight / 2) + newDistanceFromCenterY;
        frame.scale = newScale;
      }
      hasChanges = true;
    }

    if (change.x !== undefined) {
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i].x = change.x;
      }
      hasChanges = true;
    }

    if (change.y !== undefined) {
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i].y = change.y;
      }
      hasChanges = true;
    }

    if (change.rotation !== undefined) {
      for (let i = 0; i < this.framesCollection.getLength(); ++i) {
        this.framesCollection.frames[i].rotation = f.rotation + change.rotation;
      }
      hasChanges = true;
    }

    // Reset the render cache if any changes were made
    if (hasChanges) {
      this.#resetRenderCache();
    }
  }

  /**
   * Gets the frame at the specified reference time
   */
  getFrame(ref_time: number): Frame | null {
    return this.framesCollection.getFrame(ref_time, this.start_time);
  }

  drawScaled(ctxFrom: CanvasRenderingContext2D, ctxOutTo: CanvasRenderingContext2D, video: boolean = false): void {
    Canvas2DRender.drawScaled(ctxFrom, ctxOutTo, video);
  }

  // Speed control methods
  setSpeed(speed: number): void {
    this.speedController.setSpeed(speed);
  }

  getSpeed(): number {
    return this.speedController.getSpeed();
  }
}

/**
 * Non-video layers that can be resized and have their total time adjusted.
 */
export class FlexibleLayer extends StandardLayer {
  constructor(file?: LayerFile) {
    super(file);
    this.totalTimeInMilSeconds = 2 * 1000;
    this.framesCollection = createFrameService(this.totalTimeInMilSeconds, this.start_time);
  }

  dump(): LayerDumpData {
    let obj = super.dump();
    obj.frames = [];
    for (let f of this.framesCollection.frames) {
      obj.frames.push(f.toArray());
    }
    return obj;
  }
}

/**
 * Add an element to the background so it can be used but not shown in the main view.
 */
export function addElementToBackground(elem: HTMLElement): void {
  let bg = document.getElementById('background');
  if (bg) {
    bg.appendChild(elem);
  } else {
    console.warn('Background element not found, cannot add element');
  }
}
