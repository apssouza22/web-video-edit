import {createPlayer} from '../player/index';
import {createTimeline} from '../timeline/index';
import {createLayerService} from '../layer/index';
import {AudioLayer} from '@/audio/layer-audio';
import {LayerLoader} from './layer-loader';
import {createVideoMuxer} from '../muxer/index';
import {StudioControls} from './controls';
import {PinchHandler} from './pinch-handler';
import {DragItemHandler} from './drag-handler';
import {MediaEditor} from './media-edit';
import {createTranscriptionService} from "../transcription/index";
import {uploadSupportedType} from './utils';
import {LoadingPopup} from './loading-popup';
import {AspectRatioSelector} from './aspect-ratio-selector';
import {SpeedControlInput} from "./speed-control-input";
import type { StandardLayer, LayerUpdateKind } from '../timeline/types';
import type { VideoPlayer } from '../player/types';

/**
 * Update data structure for layer transformations
 */
interface LayerUpdate {
  scale?: number;
  rotation?: number;
  x?: number;
  y?: number;
}

/**
 * Reorder data for layer repositioning
 */
interface LayerReorderData {
  fromIndex: number;
  toIndex: number;
}

/**
 * Timeline interface for VideoStudio integration
 */
interface Timeline {
  playerTime: number;
  selectedLayer: StandardLayer | null;
  addTimeUpdateListener(listener: (newTime: number, oldTime: number) => void): void;
  addLayerUpdateListener(listener: (action: LayerUpdateKind, layer: StandardLayer, oldLayer?: StandardLayer, reorderData?: LayerReorderData) => void): void;
  setSelectedLayer(layer: StandardLayer): void;
  addLayers(layers: StandardLayer[]): void;
  render(): void;
  resize(): void;
}

/**
 * Video Muxer interface for export functionality
 */
interface VideoMuxer {
  init(): void;
}

/**
 * Transcription Manager interface
 */
interface TranscriptionManager {
  transcriptionView?: {
    highlightChunksByTime(time: number): void;
  };
  loadModel(): void;
  startTranscription(audioBuffer: AudioBuffer): void;
  addRemoveIntervalListener(listener: (startTime: number, endTime: number) => void): void;
  addSeekListener(listener: (timestamp: number) => void): void;
}

/**
 * Layer Operations Service interface
 */
interface LayerOperations {
  clone(layer: StandardLayer): StandardLayer;
}

export class VideoStudio {
  update: LayerUpdate | null;
  mainSection: HTMLElement | null;
  aspectRatioSelector: AspectRatioSelector;
  layers: StandardLayer[];
  player: VideoPlayer;
  timeline: Timeline;
  layerLoader: LayerLoader;
  videoExporter: VideoMuxer;
  controls: StudioControls;
  transcriptionManager: TranscriptionManager;
  mediaEditor: MediaEditor;
  layerOperations: LayerOperations;
  loadingPopup: LoadingPopup;
  speedControlManager: SpeedControlInput;
  pinchHandler?: PinchHandler;

  constructor() {
    this.update = null;
    this.mainSection = document.getElementById('video-canvas');
    this.aspectRatioSelector = new AspectRatioSelector();
    this.layers = [];
    this.player = createPlayer()
    if (this.mainSection) {
      this.player.mount(this.mainSection);
    }

    this.timeline = createTimeline(this);
    this.layerLoader = new LayerLoader(this);
    this.videoExporter = createVideoMuxer(this);
    this.controls = new StudioControls(this);
    this.transcriptionManager = createTranscriptionService();
    this.mediaEditor = new MediaEditor(this);
    this.layerOperations = createLayerService(this.#onLayerLoadUpdate.bind(this));
    this.loadingPopup = new LoadingPopup();
    this.speedControlManager = new SpeedControlInput();

    window.requestAnimationFrame(this.#loop.bind(this));

    this.#setUpComponentListeners();
    this.#setupPinchHandler();
    this.#setupDragHandler();
    this.#setupAspectRatioSelector();
    this.resize();
  }

  init(): void {
    this.videoExporter.init();
    this.controls.init();
    this.transcriptionManager.loadModel();
    this.speedControlManager.init();
  }

  #setUpComponentListeners(): void {
    this.player.addTimeUpdateListener((newTime: number, oldTime: number) => {
      this.timeline.playerTime = newTime;

      if (this.transcriptionManager && this.transcriptionManager.transcriptionView) {
        this.transcriptionManager.transcriptionView.highlightChunksByTime(newTime / 1000);
      }
    });

    this.timeline.addTimeUpdateListener((newTime: number, oldTime: number) => {
      if (!this.player.playing) {
        this.player.setTime(newTime);
      }
    });

    this.timeline.addLayerUpdateListener((action: LayerUpdateKind, layer: StandardLayer, oldLayer?: StandardLayer, reorderData?: LayerReorderData) => {
      if (action === 'select') {
        this.setSelectedLayer(layer);
      } else if (action === 'delete') {
        this.remove(layer);
      } else if (action === 'clone') {
        this.cloneLayer(layer);
      } else if (action === 'split') {
        this.mediaEditor.split();
      } else if (action === 'reorder') {
        if (reorderData) {
          this.#handleLayerReorder(layer, reorderData);
        }
      }
    });

    this.transcriptionManager.addRemoveIntervalListener((startTime: number, endTime: number) => {
      console.log(`TranscriptionManager: Removing interval from ${startTime} to ${endTime}`);
      this.mediaEditor.removeInterval(startTime, endTime);
    });

    this.transcriptionManager.addSeekListener((timestamp: number) => {
      this.player.pause()
      this.player.setTime(timestamp * 1000);
      this.player.play();
    });

    this.player.addLayerTransformedListener((layer: StandardLayer) => {
      this.#onLayerTransformed(layer);
    });

    this.speedControlManager.onSpeedChange((speed: number) => {
      console.log(`Speed changed to: ${speed}`);
    })
  }

  dumpToJson(): string {
    const out: any[] = [];
    for (const layer of this.getLayers()) {
      out.push(layer.dump());
    }
    return JSON.stringify(out);
  }

  #setupPinchHandler(): void {
    const callback = ((scale: number, rotation: number) => {
      this.update = {
        scale: scale,
        rotation: rotation
      };
    }).bind(this);
    this.pinchHandler = new PinchHandler(
        this.mainSection,
        callback,
        this
    );
    this.pinchHandler.setupEventListeners();
  }

  #setupDragHandler(): void {
    const callback = ((x: number, y: number) => {
      this.update = {x: x, y: y};
    }).bind(this);

    const dragHandler = new DragItemHandler(this.mainSection, callback, this);
    dragHandler.setupEventListeners()
  }

  #setupAspectRatioSelector(): void {
    const header = document.getElementById('header');
    if (header) {
      this.aspectRatioSelector.mount(header);
    }

    this.aspectRatioSelector.onRatioChange((newRatio: string) => {
      this.resize(newRatio);
    });
  }

  /**
   * Gets the currently selected layer
   */
  getSelectedLayer(): StandardLayer | null {
    return this.timeline.selectedLayer;
  }

  /**
   * Get all layers in the studio
   */
  getLayers(): StandardLayer[] {
    return this.layers;
  }

  /**
   * Remove a layer from the studio
   */
  remove(layer: StandardLayer): void {
    const idx = this.getLayers().indexOf(layer);
    const len = this.getLayers().length;
    if (idx > -1) {
      this.getLayers().splice(idx, 1);
      const layer_picker = document.getElementById('layers');
      if (layer_picker) {
        // divs are reversed
        const childToRemove = layer_picker.children[len - idx - 1];
        if (childToRemove) {
          childToRemove.remove();
        }
      }
    }
    if (layer instanceof AudioLayer) {
      layer.disconnect();
    }
    this.player.total_time = 0;
    for (const layer of this.getLayers()) {
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
   */
  cloneLayer(layer: StandardLayer): StandardLayer {
    const clonedLayer = this.layerOperations.clone(layer);
    this.addLayer(clonedLayer);
    this.setSelectedLayer(clonedLayer);
    console.log(`Successfully cloned layer: ${layer.name}`);
    return clonedLayer;
  }

  addLayer(layer: StandardLayer): StandardLayer {
    layer.start_time = this.player.time;
    layer.init(this.player.width, this.player.height, this.player.audioContext);
    this.layers.push(layer);
    return layer;
  }

  play(): void {
    this.player.play();
  }

  pause(): void {
    this.player.pause();
  }

  resize(newRatio?: string | null): void {
    this.player.resize(newRatio);
    this.timeline.resize();
    this.getLayers().forEach(layer => {
      layer.resize(this.player.width, this.player.height);
    })
  }

  #loop(realtime: number): void {
    // Process updates for selected layer
    const selectedLayer = this.getSelectedLayer();
    if (selectedLayer && this.update) {
      selectedLayer.update(this.update, this.player.time);
      this.update = null;
    }
    if (this.layers.length !== this.player.layers.length) {
      this.player.addLayers(this.getLayers());
      this.timeline.addLayers(this.getLayers());
    }

    this.player.render(realtime)
    this.timeline.render();

    window.requestAnimationFrame(this.#loop.bind(this));
  }

  upload(): void {
    const layers: StandardLayer[] = []
    const filePicker = document.getElementById('filepicker') as HTMLInputElement;
    if (!filePicker) return;
    
    filePicker.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || !uploadSupportedType(target.files)) {
        return
      }
      for (const file of target.files) {
        this.addLayerFromFile(file)
        .forEach(layer => {
          layers.push(layer);
        });
      }
      filePicker.value = '';
    });
    filePicker.click();
  }

  addLayerFromFile(file: File, useHtmlDemux: boolean = false): StandardLayer[] {
    const layers = this.layerLoader.addLayerFromFile(file, useHtmlDemux);
    layers.forEach(layer => {
      layer.addLoadUpdateListener(this.#onLayerLoadUpdate.bind(this))
      this.loadingPopup.startLoading(layer.id.toString(), file.name);
    })
    return layers;
  }

  async loadLayersFromJson(uri: string): Promise<void> {
    if (!uri) {
      return;
    }
    const extension = uri.split(/[#?]/)[0].split('.').pop()?.trim();

    if (extension !== 'json') {
      console.error("File is not a json file");
      return
    }

    // Show loading popup for JSON loading
    this.loadingPopup.startLoading('json-load', 'Project JSON');
    this.loadingPopup.updateProgress('json-load', 50);

    const response = await fetch(uri);
    const layers = await response.json();
    await this.layerLoader.loadLayersFromJson(layers);
    this.loadingPopup.updateProgress('json-load', 100);
  }

  #onLayerLoadUpdate(layer: StandardLayer, progress: number, ctx: CanvasRenderingContext2D | null, audioBuffer?: AudioBuffer): void {
    this.loadingPopup.updateProgress(layer.id?.toString() || layer.name || 'unknown', progress);
    if (progress === 100) {
      this.setSelectedLayer(layer);
    }
    if (audioBuffer) {
      this.transcriptionManager.startTranscription(audioBuffer);
    }
  }

  #handleLayerReorder(layer: StandardLayer, reorderData: LayerReorderData): void {
    console.log(`Layer "${layer.name}" reordered from index ${reorderData.fromIndex} to ${reorderData.toIndex}`);
  }

  setSelectedLayer(layer: StandardLayer): void {
    this.timeline.setSelectedLayer(layer);
    this.player.setSelectedLayer(layer);
    this.speedControlManager.setLayer(layer);
  }

  /**
   * Handle layer transformation from player
   */
  #onLayerTransformed(layer: StandardLayer): void {
    console.log(`Layer "${layer.name}" transformed`);
  }
}
