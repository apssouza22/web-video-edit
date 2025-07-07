import {createPlayer} from '../player/index.js';
import {createTimeline} from '../timeline/index.js';
import {AudioLayer, createLayerService} from '../layer/index.js';
import {LayerLoader} from './layer-loader.js';
import {createVideoMuxer} from '../muxer/index.js';
import {StudioControls} from './controls.js';
import {PinchHandler} from './pinch-handler.js';
import {DragItemHandler} from './drag-handler.js';
import {MediaEditor} from './media-edit.js';
import {createTranscriptionService} from "../transcription/index.js";
import {uploadSupportedType} from './utils.js';
import {LoadingPopup} from './loading-popup.js';
import {AspectRatioSelector} from '../ui/aspect-ratio-selector.js';

export class VideoStudio {

  constructor() {
    this.update = null;
    this.mainSection = document.getElementById('video-canvas');
    this.aspectRatioSelector = new AspectRatioSelector();
    /**
     * @type {StandardLayer[]}
     */
    this.layers = [];
    this.player = createPlayer()
    this.player.mount(this.mainSection);

    this.timeline = createTimeline(this);
    this.layerLoader = new LayerLoader(this);
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
    this.#setupAspectRatioSelector();
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

    this.timeline.addLayerUpdateListener((action, layer, oldLayer, reorderData) => {
      if (action === 'select') {
        this.setSelectedLayer(layer);
      } else if (action === 'delete') {
        this.remove(layer);
      } else if (action === 'clone') {
        this.cloneLayer(layer);
      } else if (action === 'split') {
        this.mediaEditor.split();
      } else if (action === 'reorder') {
        this.#handleLayerReorder(layer, reorderData);
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

  #setupAspectRatioSelector() {
    const header = document.getElementById('header');
    if (header) {
      this.aspectRatioSelector.mount(header);
    }

    this.aspectRatioSelector.onRatioChange((newRatio) => {
      this.resize(newRatio);
    });
  }

  /**
   * Gets the currently selected layer
   * @returns {FlexibleLayer}
   */
  getSelectedLayer() {
    return this.timeline.selectedLayer;
  }

  /**
   * Get all layers in the studio
   * @returns {StandardLayer[]}
   */
  getLayers() {
    return this.layers;
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
    this.addLayer(clonedLayer);
    this.setSelectedLayer(clonedLayer);
    console.log(`Successfully cloned layer: ${layer.name}`);
    return clonedLayer;
  }

  addLayer(layer) {
    layer.start_time = this.player.time;
    layer.init(this.player.width, this.player.height, this.player.audioContext);
    this.layers.push(layer);
    return layer;
  }

  play() {
    this.player.play();
  }

  pause() {
    this.player.pause();
  }

  resize(newRatio = null) {
    this.player.resize(newRatio);
    this.timeline.resize();
    this.getLayers().forEach(layer => {
      layer.resize(this.player.width, this.player.height);
    })
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

  addLayerFromFile(file, useHtmlDemux = false) {
    const layers = this.layerLoader.addLayerFromFile(file, useHtmlDemux);
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
    this.loadingPopup.updateProgress('json-load', 100);
  }

  #onLayerLoadUpdate(layer, progress, ctx, audioBuffer) {
    this.loadingPopup.updateProgress(layer.id || layer.name || 'unknown', progress);

    if (audioBuffer) {
      this.transcriptionManager.startTranscription(audioBuffer);
    }
    console.log(`Layer ${layer.name} loading: ${progress}%`);
  }

  /**
   * Handle layer reordering from timeline
   * @param {StandardLayer} layer - The layer that was reordered
   * @param {Object} reorderData - Contains fromIndex and toIndex
   * @private
   */
  #handleLayerReorder(layer, reorderData) {
    console.log(`Layer "${layer.name}" reordered from index ${reorderData.fromIndex} to ${reorderData.toIndex}`);
  }

  setSelectedLayer(layer) {
    this.timeline.setSelectedLayer(layer);
  }
}
