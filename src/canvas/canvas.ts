import { dpr } from '@/constants';
import {AbstractMedia, isMediaAudio} from '@/media';
import { CanvasLayer } from './canvas-layer.js';
import type {
  LayerTransformedListener,
  PlayerEndCallback,
  CanvasContext2D,
  CanvasElement,
  AudioContextType
} from './types.js';
import {StudioState} from "@/common/studio-state";
import { getEventBus, PlayerTimeUpdateEvent, PlayerLayerTransformedEvent } from '@/common/event-bus';

export class VideoCanvas {
  #selectedLayer: AbstractMedia | null = null;
  #eventBus = getEventBus();

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
  public layerTransformedListener: LayerTransformedListener = (layer: AbstractMedia) => {};
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
  }

  /**
   * Setter for time property that notifies listeners when time changes
   */
  setTime(newTime: number): void {
    const oldTime = this.time;
    this.time = newTime;
    if (oldTime !== newTime) {
      this.#eventBus.emit(new PlayerTimeUpdateEvent(newTime, oldTime));
    }
  }

  addMedias(medias: AbstractMedia[]): void {
    this.layers = medias.map(layer => {
      const playerLayer = new CanvasLayer(layer, this.canvas);
      if (this.#selectedLayer === layer) {
        playerLayer.selected = true;
      }
      playerLayer.setTransformCallback(this.#onLayerTransformed.bind(this));
      return playerLayer;
    });
  }

  /**
   * Handle media transformation events
   */
  #onLayerTransformed(layer: AbstractMedia): void {
    this.layerTransformedListener(layer);
    this.#eventBus.emit(new PlayerLayerTransformedEvent(layer));
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
    this.canvas.width = holder.clientWidth;
    this.canvas.height = holder.clientHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
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
    this.ctx.scale(dpr, dpr);
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
  }

  pause(): void {
    this.playing = false;
    this.studioState.setPlaying(false);
    this.audioContext.suspend();
    this.lastPausedTime = this.time;
  }

  render(realtime: number): number {
    if (this.lastTImestampFrame === null) {
      this.lastTImestampFrame = realtime;
    }
    this.#updateTotalTime();
    if (this.isPlaying()) {
      let newTime = this.time + (realtime - this.lastTImestampFrame);

      if (this.onend_callback && newTime >= this.total_time) {
        this.onend_callback(this);
        this.onend_callback = null;
      }
      if (newTime >= this.total_time) {
        this.refreshAudio();
      }
      // This will make the playback loop
      newTime %= this.total_time;

      this.setTime(newTime);
    }
    this.renderLayers();
    this.lastTImestampFrame = realtime;
    return this.time;
  }

  renderLayers(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    for (const layer of this.layers) {
      layer.render(this.ctx, this.time, this.playing);
    }

    this.ctx.restore();
  }

  #updateTotalTime(): void {
    for (const l of this.layers) {
      const layer = l.media;
      if (layer.start_time + layer.totalTimeInMilSeconds > this.total_time) {
        this.total_time = layer.start_time + layer.totalTimeInMilSeconds;
      }
    }
  }

  isPlaying(): boolean {
    return this.playing && this.total_time > 0;
  }
}
