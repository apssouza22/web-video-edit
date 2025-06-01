class VideoPlayer {

  constructor() {
    this.playing = false;
    this.onend_callback = null;
    this.width = 1280;
    this.height = 720;
    this.total_time = 0;
    this.lastTImestampFrame = null;
    this.time = 0;
    this.lastPausedTime = Number.MAX_SAFE_INTEGER;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.audioContext = new AudioContext();
    /**
     * @type {StandardLayer[]} layers
     */
    this.layers = [];
    this.timeUpdateListener = (newTime, oldTime) => {};
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

  addLayers(layers) {
    this.layers = layers;
  }

  mount(holder) {
    holder.appendChild(this.canvas);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.scale(1, 1); // Reset scale to 1
    this.resize();
  }

  onend(callback) {
    this.onend_callback = callback;
  }

  resize() {
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  refreshAudio() {
    for (let layer of this.layers) {
      if (layer instanceof AudioLayer) {
        layer.connectAudioSource(this.time);
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
      // This will make the playback loop
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
      if (layer.start_time > this.time) {
        continue;
      }
      if (layer.start_time + layer.totalTimeInMilSeconds < this.time) {
        continue;
      }
      layer.render(this.ctx, this.time, this.playing);
    }
  }

  #updateTotalTime() {
    for (let layer of this.layers) {
      if (layer.start_time + layer.totalTimeInMilSeconds > this.total_time) {
        this.total_time = layer.start_time + layer.totalTimeInMilSeconds;
      }
    }
  }

  isPlaying() {
    return this.playing && this.total_time > 0;
  }
}