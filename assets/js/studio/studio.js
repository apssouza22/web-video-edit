import { VideoPlayer } from '../player/player.js';
import { Timeline } from '../timeline/timeline.js';
import { LayersSidebarView } from '../layer/layer-view.js';
import { LayerLoader } from '../layer/layer-loader.js';
import { AudioLayer } from '../layer/layer-audio.js';
import { VideoLayer } from '../layer/layer-video.js';
import { ImageLayer } from '../layer/layer-image.js';
import { TextLayer } from '../layer/layer-text.js';
import { VideoExporter } from './video-export.js';
import { StudioControls } from './controls.js';
import { PinchHandler } from './pinch-handler.js';
import { DragItemHandler } from './drag-handler.js';
import { MediaEditor } from './media-edit.js';
import { TranscriptionManager } from "../transcription/transcription.js";
import { uploadSupportedType } from './utils.js';

export class VideoStudio {

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
    this.transcriptionManager = new TranscriptionManager();
    this.mediaEditor = new MediaEditor(this);

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

  /**
   * Clone a layer by creating a copy with slightly modified properties
   * @param {StandardLayer} layer - The layer to clone
   */
  cloneLayer(layer) {
    if (!layer) {
      console.error('No layer provided for cloning');
      return;
    }

    try {
      // Generate clone name and offset start time
      const cloneName = layer.name + ' (Clone)';
      const cloneStartTime = layer.start_time + 100; // 100ms offset
      
      let clonedLayer = null;
      
      // Create new layer based on type - direct copying approach
      if (layer instanceof TextLayer) {
        // Create new TextLayer with cloned text
        let nl = new TextLayer(cloneName);
        
        // Copy all text properties directly
        nl.color = layer.color;
        nl.shadow = layer.shadow;
        nl.start_time = cloneStartTime;
        nl.totalTimeInMilSeconds = layer.totalTimeInMilSeconds;
        nl.width = layer.width;
        nl.height = layer.height;
        nl.canvas.width = layer.canvas.width;
        nl.canvas.height = layer.canvas.height;
        
        // Copy frames directly
        if (layer.framesCollection && layer.framesCollection.frames) {
          nl.framesCollection.frames = [];
          for (let frame of layer.framesCollection.frames) {
            nl.framesCollection.frames.push(new Float32Array(frame));
          }
        }
        
        clonedLayer = this.layerLoader.insertLayer(nl);
        
      } else if (layer instanceof VideoLayer) {
        // For VideoLayer, use direct frame copying
        if (!layer.ready) {
          console.error('Cannot clone VideoLayer that is not ready');
          return;
        }
        
        // Create empty VideoLayer
        let nl = new VideoLayer({
          name: cloneName,
          _leave_empty: true
        });
        
        // Copy frames directly from original layer
        nl.framesCollection.frames = [...layer.framesCollection.frames];
        nl.start_time = cloneStartTime;
        nl.totalTimeInMilSeconds = layer.totalTimeInMilSeconds;
        nl.width = layer.width;
        nl.height = layer.height;
        nl.canvas.width = layer.canvas.width;
        nl.canvas.height = layer.canvas.height;
        nl.ready = true;
        
        clonedLayer = this.layerLoader.insertLayer(nl);
        clonedLayer.addLoadUpdateListener(this.onLayerLoadUpdate.bind(this));
        
      } else if (layer instanceof AudioLayer) {
        // For AudioLayer, copy the audio buffer directly
        if (!layer.ready || !layer.audioBuffer) {
          console.error('Cannot clone AudioLayer that is not ready or has no audio buffer');
          return;
        }
        
        // Create dummy file object for AudioLayer constructor
        let dummyFile = new File([''], cloneName, { type: 'audio/wav' });
        let nl = new AudioLayer(dummyFile);
        
        // Set properties directly from the original layer (override after construction)
        setTimeout(() => {
          nl.audioBuffer = layer.audioBuffer;
          nl.audioCtx = layer.audioCtx;
          nl.playerAudioContext = layer.playerAudioContext;
          nl.start_time = cloneStartTime;
          nl.totalTimeInMilSeconds = layer.totalTimeInMilSeconds;
          nl.width = layer.width;
          nl.height = layer.height;
          nl.ready = true;
        }, 0);
        
        clonedLayer = this.layerLoader.insertLayer(nl);
        clonedLayer.addLoadUpdateListener(this.onLayerLoadUpdate.bind(this));
        
      } else if (layer instanceof ImageLayer) {
        // For ImageLayer, copy the image directly
        if (!layer.ready || !layer.img) {
          console.error('Cannot clone ImageLayer that is not ready or has no image');
          return;
        }
        
        // Create dummy file object for ImageLayer constructor
        let dummyFile = new File([''], cloneName, { type: 'image/png' });
        let nl = new ImageLayer(dummyFile);
        
        // Set properties directly from the original layer (override after construction)
        setTimeout(() => {
          nl.img = layer.img.cloneNode();
          nl.start_time = cloneStartTime;
          nl.totalTimeInMilSeconds = layer.totalTimeInMilSeconds;
          nl.width = layer.width;
          nl.height = layer.height;
          nl.canvas.width = layer.canvas.width;
          nl.canvas.height = layer.canvas.height;
          nl.ready = true;
          
          // Copy frames directly
          if (layer.framesCollection && layer.framesCollection.frames) {
            nl.framesCollection.frames = [];
            for (let frame of layer.framesCollection.frames) {
              nl.framesCollection.frames.push(new Float32Array(frame));
            }
          }
        }, 0);
        
        clonedLayer = this.layerLoader.insertLayer(nl);
        clonedLayer.addLoadUpdateListener(this.onLayerLoadUpdate.bind(this));
      }
      
      if (!clonedLayer) {
        console.error('Failed to create cloned layer');
        return;
      }
      
      // Update layer name in UI
      this.layersSidebarView.updateLayerName(clonedLayer, clonedLayer.name);
      
      // Select the cloned layer
      this.layersSidebarView.setSelectedLayer(clonedLayer);
      
      console.log(`Successfully cloned layer: ${layer.name} -> ${clonedLayer.name}`);
      
    } catch (error) {
      console.error('Error cloning layer:', error);
    }
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
      console.log('Applying update to layer:', this.getSelectedLayer().name, 'Update:', this.update);
      this.getSelectedLayer().update(this.update, this.player.time);
      this.update = null;
    }

    this.player.addLayers(this.getLayers());
    this.player.render(realtime)
    this.timeline.render(this.getLayers());
    this.layersSidebarView.render(this.player.time);

    window.requestAnimationFrame(this.loop.bind(this));
  }

  upload() {
    const layers = []
    let filePicker = document.getElementById('filepicker');
    filePicker.addEventListener('input', (e) => {
      if (!uploadSupportedType(e.target.files)) { return }
      for (let file of e.target.files) {
        const l = this.layerLoader.addLayerFromFile(file);
        layers.push(...l);
      }
      filePicker.value = '';

      layers.forEach(layer => {
        if (layer instanceof AudioLayer) {
          layer.addLoadUpdateListener(this.onLayerLoadUpdate.bind(this))
        }
      })
    });
    filePicker.click();
  }

  async loadLayersFromJson(uri) {
    if (!uri) {
      return;
    }
    const extension = uri.split(/[#?]/)[0].split('.').pop().trim();

    if (extension !== 'json') {
      console.log("File is not a json file");
    }
    let response = await fetch(uri);
    let layers = await response.json();
    await this.layerLoader.loadLayersFromJson(layers);
  }

  onLayerLoadUpdate(layer, progress, ctx, audioBuffer) {
    if (progress < 100) {
      this.layersSidebarView.updateLayerName(layer, progress + " %");
      // this.viewHandler.updateLayerThumb(layer, ctx)
      return
    }
    if (audioBuffer) {
      this.transcriptionManager.startTranscription(audioBuffer);
    }

    this.layersSidebarView.updateLayerName(layer, layer.name);
  }

}

