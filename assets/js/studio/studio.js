import {createPlayer} from '../player/index.js';
import {createTimeline} from '../timeline/index.js';
import {LayersSidebarView, AudioLayer, createLayerService} from '../layer/index.js';
import {LayerLoader} from './layer-loader.js';
import {createVideoMuxer} from '../muxer/index.js';
import {StudioControls} from './controls.js';
import {PinchHandler} from './pinch-handler.js';
import {DragItemHandler} from './drag-handler.js';
import {MediaEditor} from './media-edit.js';
import {createTranscriptionService} from "../transcription/index.js";
import {uploadSupportedType} from './utils.js';
import {LoadingPopup} from './loading-popup.js';

export class VideoStudio {

  constructor() {
    this.update = null;
    this.mainSection = document.getElementById('video-canvas');

    this.player = createPlayer()
    this.player.mount(this.mainSection);

    this.timeline = createTimeline(this);
    this.layersSidebarView = new LayersSidebarView(this);
    this.layerLoader = new LayerLoader(this, this.layersSidebarView);
    this.videoExporter = createVideoMuxer(this);
    this.controls = new StudioControls(this);
    this.transcriptionManager = createTranscriptionService();
    this.mediaEditor = new MediaEditor(this);
    this.layerOperations = createLayerService(this.#onLayerLoadUpdate.bind(this));
    this.loadingPopup = new LoadingPopup();

    window.requestAnimationFrame(this.#loop.bind(this));

    this.#setUpComponentListeners();
    this.#setupPinchHandler();
    this.#setupDragHandler();
    this.resize();
  }

  init() {
    this.videoExporter.init();
    this.controls.init();
    this.transcriptionManager.loadModel();
  }

  #setUpComponentListeners() {
    this.player.addTimeUpdateListener((newTime, oldTime) => {
      this.timeline.playerTime = newTime;

      if (this.transcriptionManager && this.transcriptionManager.transcriptionView) {
        this.transcriptionManager.transcriptionView.highlightChunksByTime(newTime / 1000);
      }
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
        this.cloneLayer(layer);
      } else if (action === 'split') {
        this.mediaEditor.split();
      }
    });

    this.layersSidebarView.addLayerUpdateListener((action, layer, oldLayer) => {
      if (action === 'select') {
        this.timeline.setSelectedLayer(layer);
      } else if (action === 'delete') {
        this.remove(layer);
      } else if (action === 'clone') {
        this.cloneLayer(layer);
      } else if (action === 'split') {
        // Handle split action (if implemented)
      }
    });

    this.transcriptionManager.addRemoveIntervalListener((startTime, endTime) => {
      console.log(`TranscriptionManager: Removing interval from ${startTime} to ${endTime}`);
      this.mediaEditor.removeInterval(startTime, endTime);
    });

    this.transcriptionManager.addSeekListener((timestamp) => {
      this.player.pause()
      this.player.setTime(timestamp * 1000);
      this.player.play();
    });
  }

  dumpToJson() {
    let out = [];
    for (let layer of this.getLayers()) {
      out.push(layer.dump());
    }
    return JSON.stringify(out);
  }

  #setupPinchHandler() {
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

  #setupDragHandler() {
    let callback = (function (x, y) {
      this.update = {x: x, y: y};
    }).bind(this);

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

  /**
   * Get all layers in the studio
   * @returns {StandardLayer[]}
   */
  getLayers() {
    return this.layersSidebarView.layers;
  }

  /**
   * Remove a layer from the studio
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

  /**
   * Clone a layer by creating a copy with slightly modified properties
   * @param {StandardLayer} layer - The layer to clone
   */
  cloneLayer(layer) {
    const clonedLayer = this.layerOperations.clone(layer);
    this.layersSidebarView.addLayer(clonedLayer);
    this.layersSidebarView.updateLayerName(clonedLayer, clonedLayer.name);
    this.layersSidebarView.setSelectedLayer(clonedLayer);
    console.log(`Successfully cloned layer: ${layer.name}`);
    return clonedLayer;
  }

  addLayer(layer) {
    layer.start_time = this.player.time;
    layer.init(this.player.width, null, this.player.audioContext);
    return this.layersSidebarView.addLayer(layer);
  }

  play() {
    this.player.play();
  }

  pause() {
    this.player.pause();
  }

  resize() {
    this.player.resize();
    this.timeline.resize();
    this.layersSidebarView.resize();
  }

  #loop(realtime) {
    // Process updates for selected layer
    if (this.getSelectedLayer() && this.update) {
      console.log('Applying update to layer:', this.getSelectedLayer().name, 'Update:', this.update);
      this.getSelectedLayer().update(this.update, this.player.time);
      this.update = null;
    }

    this.player.addLayers(this.getLayers());
    this.player.render(realtime)
    this.timeline.render(this.getLayers());
    this.layersSidebarView.render(this.player.time);

    window.requestAnimationFrame(this.#loop.bind(this));
  }

  upload() {
    const layers = []
    let filePicker = document.getElementById('filepicker');
    filePicker.addEventListener('input', (e) => {
      if (!uploadSupportedType(e.target.files)) {
        return
      }
      for (let file of e.target.files) {
        this.addLayerFromFile(file)
        .forEach(layer => {
          layers.push(layer);
        });
      }
      filePicker.value = '';
    });
    filePicker.click();
  }

  addLayerFromFile(file) {
    const layers = this.layerLoader.addLayerFromFile(file);
    layers.forEach(layer => {
      layer.addLoadUpdateListener(this.#onLayerLoadUpdate.bind(this))
      this.loadingPopup.startLoading(layer.id, file.name);
    })
    return layers;
  }

  async loadLayersFromJson(uri) {
    if (!uri) {
      return;
    }
    const extension = uri.split(/[#?]/)[0].split('.').pop().trim();

    if (extension !== 'json') {
      console.error("File is not a json file");
      return
    }

    // Show loading popup for JSON loading
    this.loadingPopup.startLoading('json-load', 'Project JSON');
    this.loadingPopup.updateProgress('json-load', 50);

    let response = await fetch(uri);
    let layers = await response.json();
    await this.layerLoader.loadLayersFromJson(layers);

    // Complete JSON loading
    this.loadingPopup.updateProgress('json-load', 100);
  }

  #onLayerLoadUpdate(layer, progress, ctx, audioBuffer) {
    this.loadingPopup.updateProgress(layer.id || layer.name || 'unknown', progress);

    if (progress < 100) {
      this.layersSidebarView.updateLayerThumb(layer, ctx)
      return
    }
    if (audioBuffer) {
      this.transcriptionManager.startTranscription(audioBuffer);
    }
    console.log(`Layer ${layer.name} loading: ${progress}%`);
    this.layersSidebarView.updateLayerName(layer, layer.name);
  }

}

