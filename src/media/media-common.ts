import { createFrameService } from '@/frame';
import { FrameService } from '@/frame';
import { Frame } from '@/frame';
import {Canvas2DRender, ESRenderingContext2D} from '@/common/render-2d';
import { SpeedController } from './speed-controller';
import { 
  LayerFile,
  LayerLoadUpdateListener,
  LayerChange,
  LayerDumpData,
} from './types';
import {VideoMedia} from "@/media/video";

export type ESAudioContext = AudioContext | OfflineAudioContext;

export abstract class AbstractMedia {
  public audioBuffer: AudioBuffer | null = null;
  public playerAudioContext: ESAudioContext | null = null;
  public audioStreamDestination: MediaStreamAudioDestinationNode | null = null;

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
  public renderer: Canvas2DRender;
  public loadUpdateListener: LayerLoadUpdateListener;
  public lastRenderedTime: number;
  public frameService: FrameService;
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

    this.frameService = createFrameService(this.totalTimeInMilSeconds, this.start_time, false);
    this.speedController = new SpeedController(this);
    addElementToBackground(this.renderer.canvas as HTMLElement);
    this.updateName(this.name);
  }

  playStart(time: number): void {
    // This is a no-op for non-audio medias
  }

  // Getters for backward compatibility
  get canvas(): HTMLCanvasElement | OffscreenCanvas {
    return this.renderer.canvas;
  }

  get ctx(): ESRenderingContext2D{
    return this.renderer.context;
  }

  /**
   * Adjusts the total time of the video media by adding or removing frames
   */
  adjustTotalTime(diff: number): void {
    if (!this.ready || !this.frameService) {
      console.warn('VideoMedia not ready or frames collection not available');
      return;
    }
    if (this.audioBuffer) {
      console.log("Audio media cannot adjust total time");
      return;
    }
    this.frameService.adjustTotalTime(diff);
    this.totalTimeInMilSeconds = this.frameService.getTotalTimeInMilSec();
    this.#resetRenderCache();
  }

  connectAudioSource(audioContext: AudioContext |OfflineAudioContext): void {
    // This is a no-op for non-audio medias
  }

  /**
   * Checks if the media is visible at the given time
   */
  isLayerVisible(time: number): boolean {
    return time >= this.start_time && time < this.start_time + this.totalTimeInMilSeconds;
  }

  /**
   * Listens for the load event and calls the provided function when the media is ready
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

  async render(ctxOut: ESRenderingContext2D, currentTime: number, playing: boolean = false):  Promise<void> {
    // This is the base render method that subclasses should override
    // It now includes caching logic to avoid redundant rendering
    console.log("render not implemented");
  }

  /**
   * Checks if the media needs to be rendered again based on time and playing state
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

  init(canvasWidth: number = 500, canvasHeight: number = 500, audioContext?: AudioContext): void {
    this.renderer.setSize(canvasWidth, canvasHeight);
  }

  resize(width: number, height: number): void {
    console.log("Resizing media to width:", width, "height:", height);
    this.renderer.setSize(width, height);
    this.#resetRenderCache();
  }

  /**
   * Updates the frame at the specified reference time with the provided changes
   *
   * NOTICE: Currently ignores the reference time and applies changes to all frames.
   */
  async update(change: LayerChange, referenceTime: number): Promise<void> {
    let f = await this.getFrame(referenceTime);
    if (!f) {
      return;
    }

    let hasChanges = false;

    if (change.scale) {
      const newScale = f.scale * change.scale;
      const canvasWidth = this.renderer.width;
      const canvasHeight = this.renderer.height;

      for (let i = 0; i < this.frameService.getLength(); ++i) {
        const frame = this.frameService.frames[i];
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
      for (let i = 0; i < this.frameService.getLength(); ++i) {
        this.frameService.frames[i].x = change.x;
      }
      hasChanges = true;
    }

    if (change.y !== undefined) {
      for (let i = 0; i < this.frameService.getLength(); ++i) {
        this.frameService.frames[i].y = change.y;
      }
      hasChanges = true;
    }

    if (change.rotation !== undefined) {
      for (let i = 0; i < this.frameService.getLength(); ++i) {
        this.frameService.frames[i].rotation = f.rotation + change.rotation;
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
   * @param time Reference time in milliseconds
   * Returns null if no frame is found
   */
  async getFrame(time: number): Promise<Frame | null> {
    return this.frameService.getFrame(time, this.start_time);
  }

  // Speed control methods
  setSpeed(speed: number): void {
    this.speedController.setSpeed(speed);
  }

  getSpeed(): number {
    return this.speedController.getSpeed();
  }

  getTotalFrames(): number {
    return this.frameService.getLength();
  }

  isVideo(): boolean {
    return this instanceof VideoMedia;
  }

  isAudio(): boolean {
    return this.constructor.name === 'AudioMedia' //To avoid circular dependency
  }

  /**
   * Creates a new instance of the concrete media class for cloning
   * Each subclass must implement this to return a new instance of itself
   */
  protected abstract _createCloneInstance(): AbstractMedia;

  /**
   * Creates a clone of this media layer
   * @returns A new instance of the media with copied properties
   */
  clone(): AbstractMedia {
    const newMedia = this._createCloneInstance();
    const cloneStartTime = this.start_time // 10ms offset
    newMedia.id = this.id + '-clone';
    newMedia.name = this.name + ' [Clone]';
    newMedia.start_time = cloneStartTime;
    newMedia.totalTimeInMilSeconds = this.totalTimeInMilSeconds;
    newMedia.width = this.width;
    newMedia.height = this.height;
    newMedia.renderer.setSize(this.renderer.width, this.renderer.height);
    newMedia.frameService.frames = [...this.frameService.frames];
    newMedia.ready = true;
    newMedia.loadUpdateListener = this.loadUpdateListener;
    newMedia.loadUpdateListener(newMedia, 100, newMedia.ctx, newMedia.audioBuffer);
    return newMedia;
  }

}

/**
 * Non-video medias that can be resized and have their total time adjusted.
 */
export abstract class FlexibleMedia extends AbstractMedia {
  constructor(file?: LayerFile) {
    super(file);
    this.totalTimeInMilSeconds = 2 * 1000;
    this.frameService = createFrameService(this.totalTimeInMilSeconds, this.start_time);
  }

  dump(): LayerDumpData {
    let obj = super.dump();
    obj.frames = [];
    for (let f of this.frameService.frames) {
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
