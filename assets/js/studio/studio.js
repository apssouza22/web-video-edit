class VideoStudio {

  constructor() {
    this.update = null;
    this.mainSection = document.getElementById('video-canvas');

    this.player = new VideoPlayer()
    this.player.mount(this.mainSection);

    this.timeline = new Timeline(this);
    this.layersSidebarView = new LayersSidebarView(this);
    this.layerLoader = new LayerLoader(this, this.layersSidebarView);
    this.videoExporter = new VideoExporter(this);
    this.controls = new StudioControls(this);

    window.requestAnimationFrame(this.loop.bind(this));
    this.#setUpComponentListeners();
    this.setupPinchHandler();
    this.setupDragHandler();
    this.resize();
  }

  init() {
    this.videoExporter.init();
    this.controls.init();
  }

  #setUpComponentListeners() {
    this.player.addTimeUpdateListener((newTime, oldTime) => {
      this.timeline.playerTime = newTime;
    });
    
    this.timeline.addTimeUpdateListener((newTime, oldTime) => {
      if (!this.player.playing) {
        this.player.setTime(newTime);
      }
    });
  
    
    this.timeline.addLayerUpdateListener((action, layer, oldLayer) => {
      if (action === 'select') {
        this.layersSidebarView.setSelectedLayer(layer);
      } else if (action === 'delete') {
        this.remove(layer);
      } else if (action === 'clone') {
        console.log("Clone action not implemented yet");    
      } else if (action === 'split') {
        this.split();
      }
    });
    
    this.layersSidebarView.addLayerUpdateListener((action, layer, oldLayer) => {
      if (action === 'select') {
        this.timeline.setSelectedLayer(layer);
      } else if (action === 'delete') {
        this.remove(layer);
      } else if (action === 'clone') {
        // Handle clone action (if implemented)
      } else if (action === 'split') {
        // Handle split action (if implemented)
      }
    });
  }


  dumpToJson() {
    let out = [];
    for (let layer of this.getLayers()) {
      out.push(layer.dump());
    }
    return JSON.stringify(out);
  }

  intersectsTime(time, query) {
    if (!query) {
      query = this.player.time;
    }
    return Math.abs(query - time) / this.player.total_time < 0.01;
  }

  setupPinchHandler() {
    this.pinchHandler = new PinchHandler(
      this.mainSection,
      (function (scale, rotation) {
        this.update = {
          scale: scale,
          rotation: rotation
        };
      }).bind(this),
      this
    );
    this.pinchHandler.setupEventListeners();
  }

  setupDragHandler() {
    let callback = (function (x, y) {
      this.update = { x: x, y: y };
    }).bind(this);

    // Create a new DragHandler instance
    const dragHandler = new DragItemHandler(this.mainSection, callback, this);
    dragHandler.setupEventListeners()
  }

  /**
   * Gets the currently selected layer
   * @returns {FlexibleLayer}
   */
  getSelectedLayer() {
    return this.layersSidebarView.selectedLayer;
  }

  getLayers() {
    return this.layersSidebarView.layers;
  }

  /**
   *
   * @param {StandardLayer} layer
   */
  remove(layer) {
    const idx = this.getLayers().indexOf(layer);
    const len = this.getLayers().length;
    if (idx > -1) {
      this.getLayers().splice(idx, 1);
      let layer_picker = document.getElementById('layers');
      // divs are reversed
      layer_picker.children[len - idx - 1].remove();
    }
    if (layer instanceof AudioLayer) {
      layer.disconnect();
    }
    this.player.total_time = 0;
    for (let layer of this.getLayers()) {
      if (layer.start_time + layer.totalTimeInMilSeconds > this.player.total_time) {
        this.player.total_time = layer.start_time + layer.totalTimeInMilSeconds;
      }
    }
    if (this.player.time > this.player.total_time) {
      this.player.time = this.player.total_time;
    }
  }

  split() {
    if (!this.getSelectedLayer()) {
      return;
    }
    let l = this.getSelectedLayer();
    if (!(l instanceof VideoLayer)) {
      return;
    }
    if (!l.ready) {
      return;
    }
    if (l.start_time > this.player.time) {
      return;
    }
    if (l.start_time + l.totalTimeInMilSeconds < this.player.time) {
      return;
    }
    let nl = new VideoLayer({
      name: l.name + "NEW",
      _leave_empty: true
    });
    const pct = (this.player.time - l.start_time) / l.totalTimeInMilSeconds;
    const split_idx = Math.round(pct * l.framesCollection.frames.length);
    nl.framesCollection.frames = l.framesCollection.frames.splice(0, split_idx);
    nl.start_time = l.start_time;
    nl.totalTimeInMilSeconds = pct * l.totalTimeInMilSeconds;
    nl.width = l.width;
    nl.height = l.height;
    nl.canvas.width = l.canvas.width;
    nl.canvas.height = l.canvas.height;
    this.layerLoader.insertLayer(nl);
    nl.resize(); // fixup thumbnail
    nl.ready = true;

    l.start_time = l.start_time + nl.totalTimeInMilSeconds;
    l.totalTimeInMilSeconds = l.totalTimeInMilSeconds - nl.totalTimeInMilSeconds;

  }

  play() {
    this.player.play();
  }

  pause() {
    this.player.pause();
  }

  render(time, update_preview) {

  }

  resize() {
    this.player.resize();
    this.timeline.resize();
    this.layersSidebarView.resize();
  }

  loop(realtime) {
    // Process updates for selected layer
    if (this.getSelectedLayer() && this.update) {
      this.getSelectedLayer().update(this.update, this.player.time);
      this.update = null;
    }

    this.player.addLayers(this.getLayers());
    this.player.render(realtime)
    this.timeline.render(this.getLayers());
    this.layersSidebarView.render(this.player.time);

    window.requestAnimationFrame(this.loop.bind(this));
  }

}

