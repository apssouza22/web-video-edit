import {dpr} from '@/constants';
import {AbstractMedia, isMediaAudio} from '@/mediaclip';
import {AudioMedia} from '@/mediaclip/audio/audio';
import {CanvasLayer} from './canvas-layer.js';
import type {
  AudioContextType,
  CanvasContext2D,
  CanvasElement,
  LayerTransformedListener,
  PlayerEndCallback
} from './types.js';
import {StudioState} from "@/common/studio-state";
import {getEventBus, PlayerLayerTransformedEvent, PlayerTimeUpdateEvent} from '@/common/event-bus';

export class VideoCanvas {
  #selectedLayer: AbstractMedia | null = null;
  #eventBus = getEventBus();
  #audioContextStartTime: number | null = null;
  #mediaStartTime: number = 0;
  #audioScheduleTime: number | null = null;
  static readonly AUDIO_SCHEDULE_DELAY = 0.1; // 100ms lookahead

  public playing = false;
  public onend_callback: PlayerEndCallback | null = null;
  public total_time = 0;
  public lastTImestampFrame: number | null = null;
  public time = 0;
  public lastPausedTime = Number.MAX_SAFE_INTEGER;
  public playerHolder: HTMLElement | null;
  public canvas: CanvasElement;
  public ctx: CanvasContext2D;
  public audioContext: AudioContextType;
  public width = 0;
  public height = 0;
  public layers: CanvasLayer[] = [];
  private studioState: StudioState;

  constructor(studioState: StudioState) {
    this.studioState = studioState;
    this.playerHolder = document.getElementById("video-canvas");
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

  setTime(newTime: number): void {
    const oldTime = this.time;
    this.time = newTime;
    if (oldTime !== newTime) {
      this.#eventBus.emit(new PlayerTimeUpdateEvent(newTime, oldTime));
      if (!this.playing) {
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
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    // this.ctx.scale(dpr, dpr);
  }

  refreshAudio(): void {
    for (const l of this.layers) {
      const layer = l.media;
      if (isMediaAudio(layer)) {
        layer.connectAudioSource(this.audioContext);
      }
    }
  }

  play(): void {
    this.playing = true;
    this.studioState.setPlaying(true);
    if (this.lastPausedTime !== this.time) {
      this.refreshAudio();
    }
    this.audioContext.resume();
    this.#capturePlaybackReference();

    // Schedule audio to start 100ms in the future
    this.#audioScheduleTime = this.audioContext.currentTime + VideoCanvas.AUDIO_SCHEDULE_DELAY;

    // Start audio at the scheduled time
    this.#startScheduledAudio();
  }

  #capturePlaybackReference(): void {
    this.#audioContextStartTime = this.audioContext.currentTime;
    this.#mediaStartTime = this.time;
  }

  #startScheduledAudio(): void {
    for (const layer of this.layers) {
      const media = layer.media;
      if (isMediaAudio(media)) {
        const audioLayer = media as AudioMedia;
        const time = this.time - media.startTime;
        if (time >= 0 && time <= media.totalTimeInMilSeconds) {
          audioLayer.scheduleStart(this.#audioScheduleTime!, time / 1000);
        }
      }
    }
  }

  pause(): void {
    this.playing = false;
    this.studioState.setPlaying(false);
    this.audioContext.suspend();
    this.lastPausedTime = this.time;
    this.#audioContextStartTime = null;
    this.#audioScheduleTime = null;
  }

  async render(realtime: number): Promise<number> {
    if (this.lastTImestampFrame === null) {
      this.lastTImestampFrame = realtime;
    }
    this.#updateTotalTime();
    if (this.isPlaying()) {
      let newTime = this.#calculateAudioSyncedTime();

      if (this.onend_callback && newTime >= this.total_time) {
        this.onend_callback(this);
        this.onend_callback = null;
      }
      if (newTime >= this.total_time) {
        this.refreshAudio();
        this.#capturePlaybackReference();
        this.#audioScheduleTime = this.audioContext.currentTime + VideoCanvas.AUDIO_SCHEDULE_DELAY;
        this.#startScheduledAudio();
        newTime = 0;
      }

      this.setTime(newTime);
    }
    await this.renderLayers();
    this.lastTImestampFrame = realtime;
    return this.time;
  }

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
      await layer.render(this.ctx, this.time, this.playing);
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
    return this.playing && this.total_time > 0;
  }
}
