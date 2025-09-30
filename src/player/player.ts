import { dpr } from '@/constants';
import { AudioLayer } from '../layer/index.js';
import { PlayerLayer } from './player-layer.js';
import type {
  TimeUpdateListener,
  LayerTransformedListener,
  PlayerEndCallback,
  CanvasContext2D,
  CanvasElement,
  AudioContextType
} from './types.js';
import type { StandardLayer } from '@/layer';

export class VideoPlayer {
  #selectedLayer: StandardLayer | null = null;
  #contentScaleFactor = 0.9; // Scale content to 90% to create 10% margin

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
  public layers: PlayerLayer[] = [];
  public timeUpdateListener: TimeUpdateListener = (newTime: number, oldTime: number) => {
    // Default empty listener
  };
  public layerTransformedListener: LayerTransformedListener = (layer: StandardLayer) => {
    // Default empty listener
  };

  constructor() {
    const playerHolder = document.getElementById("video-canvas");
    this.playerHolder = playerHolder;
    
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to get 2D context from canvas');
    }
    this.ctx = ctx;
    
    this.audioContext = new AudioContext();
  }

  /**
   * Setter for time property that notifies listeners when time changes
   */
  setTime(newTime: number): void {
    const oldTime = this.time;
    this.time = newTime;
    if (oldTime !== newTime) {
      this.timeUpdateListener(newTime, oldTime);
    }
  }

  addTimeUpdateListener(listener: TimeUpdateListener): void {
    if (typeof listener !== 'function') {
      throw new Error('Time update listener must be a function');
    }
    this.timeUpdateListener = listener;
  }

  addLayerTransformedListener(listener: LayerTransformedListener): void {
    this.layerTransformedListener = listener;
  }

  addLayers(layers: StandardLayer[]): void {
    this.layers = layers.map(layer => {
      const playerLayer = new PlayerLayer(layer, this.canvas);
      if (this.#selectedLayer === layer) {
        playerLayer.selected = true;
      }
      playerLayer.setTransformCallback(this.#onLayerTransformed.bind(this));
      return playerLayer;
    });
  }

  /**
   * Handle layer transformation events
   */
  #onLayerTransformed(layer: StandardLayer): void {
    this.layerTransformedListener(layer);
  }

  /**
   * Set selected layer for transformation
   */
  setSelectedLayer(layer: StandardLayer): void {
    this.layers.forEach(playerLayer => {
      playerLayer.selected = false;
    });
    this.#selectedLayer = layer;
    const playerLayer = this.layers.find(pl => pl.layer === layer);
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
      const layer = l.layer;
      if (layer instanceof AudioLayer) {
        layer.connectAudioSource(this.audioContext);
      }
    }
  }

  play(): void {
    this.playing = true;
    if (this.lastPausedTime !== this.time) {
      this.refreshAudio();
    }
    this.audioContext.resume();
  }

  pause(): void {
    this.playing = false;
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
    this.#addPaddingToCanvas();

    for (const layer of this.layers) {
      layer.render(this.ctx, this.time, this.playing);
    }

    this.ctx.restore();
  }

  /**
   * Add some buffering to the canvas so we can transform the content
   * Without this, we can not see the layer boundaries
   */
  #addPaddingToCanvas(): void {
    this.ctx.save();

    // Calculate the offset to center the scaled content
    const canvasWidth = this.ctx.canvas.clientWidth;
    const canvasHeight = this.ctx.canvas.clientHeight;

    const offsetX = (canvasWidth * (1 - this.#contentScaleFactor)) / 2;
    const offsetY = (canvasHeight * (1 - this.#contentScaleFactor)) / 2;

    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(this.#contentScaleFactor, this.#contentScaleFactor);

    // Paint the background white
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  #updateTotalTime(): void {
    for (const l of this.layers) {
      const layer = l.layer;
      if (layer.start_time + layer.totalTimeInMilSeconds > this.total_time) {
        this.total_time = layer.start_time + layer.totalTimeInMilSeconds;
      }
    }
  }

  isPlaying(): boolean {
    return this.playing && this.total_time > 0;
  }
}
