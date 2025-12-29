import {createFrameService, Frame, FrameService} from '@/mediaclip/frame';
import {Canvas2DRender, ESRenderingContext2D} from '@/common/render-2d';
import {SpeedController} from './speed-controller';
import {ESAudioContext, IClip, LayerChange, LayerDumpData, LayerLoadUpdateListener,} from './types';

export abstract class AbstractClip implements IClip {
  audioStreamDestination: MediaStreamAudioDestinationNode | null = null;
  protected _audioBuffer: AudioBuffer | null = null;
  protected _playerAudioContext: ESAudioContext | null = null;

  protected _name: string;
  protected _id: string;
  protected _ready: boolean;
  protected _width: number;
  protected _height: number;
  protected _renderer: Canvas2DRender;
  protected _loadUpdateListener: LayerLoadUpdateListener;
  protected _lastRenderedTime: number;
  protected _frameService: FrameService;
  protected _speedController: SpeedController;
  protected _startTime: number;

  public totalTimeInMilSeconds: number;

  protected constructor(name: string) {
    this._name = name;
    this._id = this._name + "-" + crypto.randomUUID();
    
    this._ready = false;
    this.totalTimeInMilSeconds = 1;
    this._startTime = 0;
    this._width = 0;
    this._height = 0;
    this._renderer = new Canvas2DRender();
    this._loadUpdateListener = (progress, layerName, layer, audioBuffer) => {
      // Default empty listener
    };
    this._lastRenderedTime = -1;

    this._frameService = createFrameService(this.totalTimeInMilSeconds, this.startTime);
    this._speedController = new SpeedController(this);
    addElementToBackground(this._renderer.canvas as HTMLElement);
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get ready(): boolean {
    return this._ready;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  set startTime(value: number) {
    this._startTime = value;
  }
  get startTime(): number {
    return this._startTime;
  }

  get audioBuffer(): AudioBuffer | null {
    return this._audioBuffer;
  }

  get frameService(): FrameService {
    return this._frameService;
  }

  playStart(time: number): void {
    // This is a no-op for non-audio medias
  }

  protected get ctx(): ESRenderingContext2D {
    return this._renderer.context;
  }

  /**
   * Adjusts the total time of the video media by adding or removing frames
   */
  adjustTotalTime(diff: number): void {
    if (!this._ready || !this._frameService) {
      console.warn('VideoMedia not ready or frames collection not available');
      return;
    }
    if (this._audioBuffer) {
      console.log("Audio media cannot adjust total time");
      return;
    }

    this._frameService.adjustTotalTime(diff);
    this.totalTimeInMilSeconds = this._frameService.getTotalTimeInMilSec();
    this.#resetRenderCache();
  }

  connectAudioSource(audioContext: AudioContext |OfflineAudioContext): void {
    // This is a no-op for non-audio medias
  }

  /**
   * Checks if the media is visible at the given time
   */
  isLayerVisible(time: number): boolean {
    return time >= this.startTime && time < this.startTime + this.totalTimeInMilSeconds;
  }

  /**
   * Listens for the load event and calls the provided function when the media is ready
   */
  addLoadUpdateListener(listener: LayerLoadUpdateListener): void {
    this._loadUpdateListener = listener;
  }

  removeInterval(startTime: number, endTime: number): boolean {
    console.log("Remove interval not implemented for this media type");
    return false;
  }

  dump(): LayerDumpData {
    return {
      width: this._width,
      height: this._height,
      name: this._name,
      startTime: this.startTime,
      total_time: this.totalTimeInMilSeconds,
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
    return currentTime !== this._lastRenderedTime;
  }

  /**
   * Updates the rendering cache information
   */
  updateRenderCache(currentTime: number): void {
    this._lastRenderedTime = currentTime;
  }

  /**
   * Resets the rendering cache, forcing a re-render on next frame
   * Call this method after operations that change the visual appearance
   * like updates to position, scale, or rotation
   */
  #resetRenderCache(): void {
    this._lastRenderedTime = -1;
  }

  init(audioContext?: ESAudioContext): void {
    if (audioContext) {
      this._playerAudioContext = audioContext;
    }
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
      const canvasWidth = this._renderer.width;
      const canvasHeight = this._renderer.height;

      for (let i = 0; i < this._frameService.getLength(); ++i) {
        const frame = this._frameService.frames[i];
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
      for (let i = 0; i < this._frameService.getLength(); ++i) {
        this._frameService.frames[i].x = change.x;
      }
      hasChanges = true;
    }

    if (change.y !== undefined) {
      for (let i = 0; i < this._frameService.getLength(); ++i) {
        this._frameService.frames[i].y = change.y;
      }
      hasChanges = true;
    }

    if (change.rotation !== undefined) {
      for (let i = 0; i < this._frameService.getLength(); ++i) {
        this._frameService.frames[i].rotation = f.rotation + change.rotation;
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
    return this._frameService.getFrame(time, this.startTime);
  }

  // Speed control methods
  setSpeed(speed: number): void {
    this._speedController.setSpeed(speed);
  }

  getSpeed(): number {
    return this._speedController.getSpeed();
  }

  getTotalFrames(): number {
    return this._frameService.getLength();
  }

  isVideo(): boolean {
    return false;
  }

  isAudio(): boolean {
    return false;
  }

  /**
   * Creates a new instance of the concrete media class for cloning
   * Each subclass must implement this to return a new instance of itself
   */
  protected abstract _createCloneInstance(): AbstractClip;

  /**
   * Creates a clone of this media layer
   * @returns A new instance of the media with copied properties
   */
  clone(): AbstractClip {
    const newMedia = this._createCloneInstance();
    const cloneStartTime = this.startTime // 10ms offset
    newMedia._id =  crypto.randomUUID();
    newMedia._name = this._name + '-clone';
    newMedia.startTime = cloneStartTime;
    newMedia.totalTimeInMilSeconds = this.totalTimeInMilSeconds;
    newMedia._width = this._width;
    newMedia._height = this._height;
    newMedia._renderer.setSize(this._renderer.width, this._renderer.height);
    newMedia._frameService.frames = [...this._frameService.frames];
    newMedia._ready = true;
    return newMedia;
  }

  /**
   * Splits this media at the specified time
   * @param splitTime - The time at which to split (in milliseconds)
   * @returns The first part of the split (clone), or null if split failed
   */
  split(splitTime: number): AbstractClip {
    const mediaClone = this.clone();
    return this._performSplit(mediaClone, splitTime);
  }

  /**
   * Performs the actual split operation
   * Default implementation handles frame-based splitting for Video, Text, and Image media
   * @param mediaClone - The cloned media that will become the first part
   * @param splitTime - The time at which to split (in milliseconds)
   */
  protected _performSplit(mediaClone: AbstractClip, splitTime: number): AbstractClip {
    const pct = (splitTime - this.startTime) / this.totalTimeInMilSeconds;
    const split_idx = Math.round(pct * this._frameService.getLength());

    mediaClone._name = this._name + "-split";
    mediaClone._frameService.frames = this._frameService.frames.slice(0, split_idx);
    mediaClone.totalTimeInMilSeconds = pct * this.totalTimeInMilSeconds;

    this._frameService.frames = this._frameService.frames.slice(split_idx);
    this.startTime = this.startTime + mediaClone.totalTimeInMilSeconds;
    this.totalTimeInMilSeconds = this.totalTimeInMilSeconds - mediaClone.totalTimeInMilSeconds;
    return mediaClone;
  }

}

/**
 * Non-video medias that can be resized and have their total time adjusted.
 */
export abstract class ResizableClip extends AbstractClip {
  protected constructor(name: string) {
    super(name);
    this.totalTimeInMilSeconds = 2 * 1000;
    this._frameService = createFrameService(this.totalTimeInMilSeconds, this.startTime);
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
