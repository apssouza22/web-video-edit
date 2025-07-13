import {dpr} from '../constants.js';
import {AudioLayer} from '../layer/index.js';
import {PlayerLayer} from './player-layer.js';

export class VideoPlayer {
  #selectedLayer;

  constructor() {
    this.playing = false;
    this.onend_callback = null;
    this.total_time = 0;
    this.lastTImestampFrame = null;
    this.time = 0;
    this.lastPausedTime = Number.MAX_SAFE_INTEGER;
    this.playerHolder = document.getElementById("video-canvas")
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.audioContext = new AudioContext();
    this.width = 0;
    this.height = 0;
    /**
     * @type {PlayerLayer[]} layers
     */
    this.layers = [];
    this.timeUpdateListener = (newTime, oldTime) => {
    };
    this.layerTransformedListener = layer => {};
  }

  /**
   * Setter for time property that notifies listeners when time changes
   */
  setTime(newTime) {
    const oldTime = this.time;
    this.time = newTime;
    if (oldTime !== newTime) {
      this.timeUpdateListener(newTime, oldTime)
    }
  }

  addTimeUpdateListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Time update listener must be a function');
    }
    this.timeUpdateListener = listener
  }

  addLayerTransformedListener(listener) {
    this.layerTransformedListener = listener;
  }

  addLayers(layers) {
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
   * @param {StandardLayer} layer
   */
  #onLayerTransformed(layer) {
    this.layerTransformedListener(layer);
  }

  /**
   * Set selected layer for transformation
   * @param {StandardLayer} layer
   */
  setSelectedLayer(layer) {
    this.layers.forEach(playerLayer => {
      playerLayer.selected = false;
    });
    this.#selectedLayer = layer;
    if (layer) {
      const playerLayer = this.layers.find(pl => pl.layer === layer);
      console.log(`Setting selected layer: ${layer.name}`);
      playerLayer.selected = true;
    }
  }


  mount(holder) {
    this.playerHolder = holder
    holder.appendChild(this.canvas);
    this.canvas.width = holder.clientWidth;
    this.canvas.height = holder.clientHeight
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.ctx.scale(1, 1); // Reset scale to 1
    this.resize();
  }

  onend(callback) {
    this.onend_callback = callback;
  }

  resize(newRatio) {
    if(newRatio) {
      this.playerHolder.style.aspectRatio = newRatio.replace(":", "/");
    }
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.ctx.scale(dpr, dpr);
  }

  refreshAudio() {
    for (let l of this.layers) {
      const layer = l.layer;
      if (layer instanceof AudioLayer) {
        layer.connectAudioSource(this.audioContext);
      }
    }
  }

  play() {
    this.playing = true;
    if (this.lastPausedTime !== this.time) {
      this.refreshAudio();
    }
    this.audioContext.resume();
  }

  pause() {
    this.playing = false;
    this.audioContext.suspend();
    this.lastPausedTime = this.time;
  }

  render(realtime) {
    if (this.lastTImestampFrame === null) {
      this.lastTImestampFrame = realtime;
    }
    this.#updateTotalTime()
    if (this.isPlaying()) {
      let newTime = this.time + (realtime - this.lastTImestampFrame);

      if (this.onend_callback && newTime >= this.total_time) {
        this.onend_callback(this);
        this.onend_callback = null;
      }
      if (newTime >= this.total_time) {
        this.refreshAudio();
      }
      // // This will make the playback loop
      newTime %= this.total_time;

      this.setTime(newTime);
    }
    this.renderLayers()
    this.lastTImestampFrame = realtime;
    return this.time;
  }

  renderLayers() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    for (let layer of this.layers) {
      layer.render(this.ctx, this.time, this.playing);
    }
  }

  #updateTotalTime() {
    for (let l of this.layers) {
      const layer = l.layer;
      if (layer.start_time + layer.totalTimeInMilSeconds > this.total_time) {
        this.total_time = layer.start_time + layer.totalTimeInMilSeconds;
      }
    }
  }

  isPlaying() {
    return this.playing && this.total_time > 0;
  }
}