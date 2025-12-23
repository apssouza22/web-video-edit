import {dpr} from '@/constants';
import {AbstractMedia, ESAudioContext} from '@/mediaclip';
import {AudioMedia} from '@/mediaclip/audio/audio';
import {CanvasLayer} from './canvas-layer.js';
import type {CanvasContext2D, CanvasElement, PlayerEndCallback} from './types.js';
import {StudioState} from "@/common/studio-state";
import {getEventBus, PlayerLayerTransformedEvent, PlayerTimeUpdateEvent} from '@/common/event-bus';
import {PinchHandler} from "@/common";

export class VideoCanvas {
  #selectedLayer: AbstractMedia | null = null;
  #eventBus = getEventBus();
  #audioContextStartTime: number | null = null;
  #mediaStartTime: number = 0;
  #audioScheduleTime: number | null = null;
  static readonly AUDIO_SCHEDULE_DELAY = 0.1; // 100ms lookahead
  
  private onend_callback: PlayerEndCallback | null = null;
  private total_time = 0;
  private lastPlayedTime: number | null = null;
  private time = 0;
  private playerHolder: HTMLElement | null = null;
  private readonly canvas: CanvasElement;
  private readonly ctx: CanvasContext2D;
  private readonly audioContext: AudioContext;
  private layers: CanvasLayer[] = [];
  private studioState: StudioState;
  private pinchHandler: PinchHandler | null = null;

  constructor(studioState: StudioState) {
    this.studioState = studioState;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    if (!this.ctx) {
      throw new Error('Unable to get 2D context from canvas');
    }
    this.audioContext = new AudioContext();
    this.#setupEventListeners();
  }

  /**
   * Setup centralized event listeners for canvas transformations
   */
  #setupEventListeners(): void {
    this.canvas.addEventListener('pointerdown', this.#onPointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.#onPointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.#onPointerUp.bind(this));
    this.canvas.addEventListener('pointerleave', this.#onPointerUp.bind(this));
  }

  #onWheel(scale: number, rotation: number): void {
    const selectedLayer = this.layers.find(layer => layer.selected);
    if (selectedLayer) {
      selectedLayer.onWheel(scale, rotation);
    }
  }

  /**
   * Delegate pointer down to selected layer
   */
  #onPointerDown(event: PointerEvent): void {
    const selectedLayer = this.layers.find(layer => layer.selected);
    if (selectedLayer) {
      selectedLayer.onPointerDown(event);
    }
  }

  /**
   * Delegate pointer move to selected layer
   */
  #onPointerMove(event: PointerEvent): void {
    const selectedLayer = this.layers.find(layer => layer.selected);
    if (selectedLayer) {
      selectedLayer.onPointerMove(event);
    }
  }

  /**
   * Delegate pointer up to selected layer
   */
  #onPointerUp(event?: PointerEvent): void {
    const selectedLayer = this.layers.find(layer => layer.selected);
    if (selectedLayer) {
      selectedLayer.onPointerUp();
    }
  }

  getLayersLength(): number {
    return this.layers.length;
  }

  getCanvasAudioContext(): ESAudioContext {
    return this.audioContext;
  }

  setTime(newTime: number): void {
    const oldTime = this.time;
    this.time = newTime;
    if (oldTime !== newTime) {
      this.#eventBus.emit(new PlayerTimeUpdateEvent(newTime, oldTime));
      if (!this.studioState.isPlaying()) {
        this.#mediaStartTime = newTime;
      }
    }
  }

  addLayers(layers: AbstractMedia[]): void {
    this.layers = layers.map(layer => {
      const canvasLayer = new CanvasLayer(layer, this.canvas);
      if (this.#selectedLayer === layer) {
        canvasLayer.selected = true;
      }
      canvasLayer.setTransformCallback((layer: AbstractMedia) => {
        this.#eventBus.emit(new PlayerLayerTransformedEvent(layer));
      });
      return canvasLayer;
    });
  }

  /**
   * Set selected media for transformation
   */
  setSelectedLayer(layer: AbstractMedia): void {
    this.layers.forEach(playerLayer => {
      playerLayer.selected = false;
    });
    this.#selectedLayer = layer;
    const playerLayer = this.layers.find(pl => pl.media === layer);
    if (playerLayer) {
      console.log(`Setting selected layer: ${layer.name}`);
      playerLayer.selected = true;
    }
  }

  mount(holder: HTMLElement): void {
    this.playerHolder = holder;
    this.pinchHandler = new PinchHandler(this.playerHolder, this.#onWheel.bind(this));
    this.pinchHandler.setupEventListeners()
    holder.appendChild(this.canvas);
    this.ctx.scale(1, 1); // Reset scale to 1
    this.resize();
  }

  resize(newRatio?: string): void {
    if (newRatio && this.playerHolder) {
      this.playerHolder.style.aspectRatio = newRatio.replace(":", "/");
    }
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
  }

  refreshAudio(): void {
    for (const l of this.layers) {
      const layer = l.media;
      if (layer.isAudio()) {
        layer.connectAudioSource(this.audioContext);
      }
    }
  }

  play(): void {
    this.studioState.setPlaying(true);
    this.studioState.setPlayingTime(this.time);
    this.refreshAudio();
    this.audioContext.resume();
    this.#updatePlaybackTime();

    // Schedule audio to start 100ms in the future
    this.#audioScheduleTime = this.audioContext.currentTime + VideoCanvas.AUDIO_SCHEDULE_DELAY;
    this.#startScheduledAudio();
  }

  #updatePlaybackTime(): void {
    this.#audioContextStartTime = this.audioContext.currentTime;
    this.#mediaStartTime = this.time;
  }

  #startScheduledAudio(): void {
    for (const layer of this.layers) {
      const media = layer.media;
      if (media.isAudio()) {
        const audioLayer = media as AudioMedia;
        // Calculate how far in the future this layer should start
        const timeUntilLayerStart = (media.startTime - this.time) / 1000; // Convert to seconds
        const scheduleTime = this.#audioScheduleTime! + Math.max(0, timeUntilLayerStart);

        // Only schedule if layer is within playback range (hasn't ended yet)
        if (this.time <= media.startTime + media.totalTimeInMilSeconds) {
          const offset = Math.max(0, this.time - media.startTime) / 1000; // Seconds
          audioLayer.scheduleStart(scheduleTime, offset);
        }
      }
    }
  }

  pause(): void {
    this.studioState.setPlaying(false);
    this.audioContext.suspend();
    this.#audioContextStartTime = null;
    this.#audioScheduleTime = null;
  }

  async render(realtime: number): Promise<number> {
    if( this.layers.length === 0) {
      return this.time;
    }
    this.#updateTotalTime();
    if (this.isPlaying()) {
      let newTime = this.#calculateAudioSyncedTime();

      if (this.onend_callback && newTime >= this.total_time) {
        this.onend_callback(this);
        this.onend_callback = null;
      }
      if (newTime >= this.total_time) {
        this.studioState.setPlaying(false);
        newTime = this.total_time;
      }
      this.setTime(newTime);
    }

    if (this.lastPlayedTime !== this.time || this.isPlaying() || this.layers.some(layer => layer.isUpdated)) {
      await this.renderLayers();
      const find = this.layers.find(layer => !layer.media.isAudio() && !layer.media.shouldReRender(this.time));
      this.lastPlayedTime = find ? this.time : null;
    }
    return this.time;
  }

  /**
   * Calculate the current time synchronized with audio playback
   * This ensures that visual playback stays in sync with audio playback
   * Considers audio context start time and scheduled audio start time delays
   */
  #calculateAudioSyncedTime(): number {
    if (this.#audioContextStartTime === null || this.#audioScheduleTime === null) {
      return this.time;
    }

    const currentAudioTime = this.audioContext.currentTime;
    // Don't advance time until audio actually starts
    if (currentAudioTime < this.#audioScheduleTime) {
      return this.#mediaStartTime;
    }

    // Calculate elapsed time from when audio actually started
    const elapsedAudioTime = (currentAudioTime - this.#audioScheduleTime) * 1000;
    return this.#mediaStartTime + elapsedAudioTime;
  }

  async renderLayers(): Promise<void> {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    for (const layer of this.layers) {
      await layer.render(this.ctx, this.time, this.studioState.isPlaying());
    }
  }

  #updateTotalTime(): void {
    for (const l of this.layers) {
      const layer = l.media;
      if (layer.startTime + layer.totalTimeInMilSeconds > this.total_time) {
        this.total_time = layer.startTime + layer.totalTimeInMilSeconds;
      }
    }
  }

  isPlaying(): boolean {
    return this.studioState.isPlaying() && this.total_time > 0;
  }
}
