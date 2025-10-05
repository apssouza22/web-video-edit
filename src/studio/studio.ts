import {createPlayer, VideoPlayer} from '@/player';
import {createTimeline} from '@/timeline';
import {AbstractMedia, createMediaService, MediaService} from '@/media';
import {AudioLayer} from '@/media/audio';
import {LayerLoader} from './layer-loader';
import {createVideoMuxer} from '@/video/muxer';
import {StudioControls} from './controls';
import {PinchHandler} from './pinch-handler';
import {DragItemHandler} from './drag-handler';
import {ControlsHandler} from './control-handler';
import {createTranscriptionService, TranscriptionService} from "@/transcription";
import {exportToJson, uploadSupportedType} from './utils';
import {LoadingPopup} from './loading-popup';
import {AspectRatioSelector} from './aspect-ratio-selector';
import {SpeedControlInput} from "./speed-control-input";
import {ESRenderingContext2D} from "@/common/render-2d";
import {Timeline} from "@/timeline/timeline";
import {StudioState} from "@/common/studio-state";
import {VideoExportService} from "@/video/muxer/video-export-service";

/**
 * Update data structure for layer transformations
 */
interface LayerUpdate {
  scale?: number;
  rotation?: number;
  x?: number;
  y?: number;
}


export class VideoStudio {
  update: LayerUpdate | null;
  mainSection: HTMLElement;
  aspectRatioSelector: AspectRatioSelector;
  layers: AbstractMedia[];
  player: VideoPlayer;
  timeline: Timeline;
  layerLoader: LayerLoader;
  videoExporter: VideoExportService;
  controls: StudioControls;
  transcriptionManager: TranscriptionService;
  mediaEditor: ControlsHandler;
  mediaService: MediaService;
  loadingPopup: LoadingPopup;
  speedControlManager: SpeedControlInput;
  pinchHandler?: PinchHandler;
  studioState: StudioState;

  constructor() {
    this.update = null;
    this.mainSection = document.getElementById('video-canvas')!;
    this.aspectRatioSelector = new AspectRatioSelector();
    this.layers = [];
    this.studioState = StudioState.getInstance();
    this.player = createPlayer(this.studioState);
    if (this.mainSection) {
      this.player.mount(this.mainSection);
    }

    this.timeline = createTimeline(this);
    this.mediaService = createMediaService(this.#onLayerLoadUpdate.bind(this));
    this.layerLoader = new LayerLoader(this, this.mediaService);
    this.videoExporter = createVideoMuxer(this);
    this.controls = new StudioControls(this);
    this.transcriptionManager = createTranscriptionService();
    this.mediaEditor = new ControlsHandler(this, this.mediaService, this.studioState);
    this.loadingPopup = new LoadingPopup();
    this.speedControlManager = new SpeedControlInput();

    window.requestAnimationFrame(this.#loop.bind(this));

    this.#setupPinchHandler();
    this.#setupDragHandler();
    this.#setupAspectRatioSelector();
    this.resize();
  }

  init(): void {
    this.setUpVideoExport()
    this.controls.init();
    this.transcriptionManager.loadModel();
    this.speedControlManager.init();
  }

  private setUpVideoExport() {
    const exportButton = document.getElementById('export');
    if (!exportButton) {
      return;
    }
    const exportId = 'video-export';
    exportButton.addEventListener('click', (ev: MouseEvent) => {
      if (ev.shiftKey) {
        exportToJson();
        return;
      }
      if (this.getLayers().length === 0) {
        alert("Nothing to export.");
        return;
      }

      this.loadingPopup.startLoading(exportId, '', 'Exporting Video...');

      const exportButton = document.getElementById('export') as HTMLButtonElement;
      if (!exportButton) {
        console.error('Export button not found');
        return;
      }

      const tempText = exportButton.textContent || 'Export';
      exportButton.textContent = "Exporting...";

      const progressCallback = (progress: number): void => {
        this.loadingPopup.updateProgress(exportId, progress);
      };

      const completionCallback = (): void => {
        exportButton.textContent = tempText;
        this.loadingPopup.updateProgress(exportId, 100);
      };

      this.videoExporter.export(progressCallback, completionCallback);
    });
  }

  getMediaById(id: string): AbstractMedia | null {
    return this.studioState.getMediaById(id);
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
  getSelectedLayer(): AbstractMedia | null {
    if (!this.timeline.selectedLayer) {
      return null;
    }
    return this.getMediaById(this.timeline.selectedLayer.id);
  }

  /**
   * Get all layers in the studio
   */
  getLayers(): AbstractMedia[] {
    return this.layers;
  }

  /**
   * Remove a layer from the studio
   */
  remove(layer: AbstractMedia): void {
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
  cloneLayer(layer: AbstractMedia): AbstractMedia {
    const clonedLayer = this.mediaService.clone(layer);
    this.addLayer(clonedLayer);
    this.setSelectedLayer(clonedLayer);
    return clonedLayer;
  }

  addLayer(layer: AbstractMedia, skipInit: boolean = false): AbstractMedia {
    if (!skipInit) {
      layer.start_time = this.player.time;
      layer.init(this.player.width, this.player.height, this.player.audioContext);
    }
    this.layers.push(layer);
    this.studioState.addMedia(layer);
    return layer;
  }

  play(): void {
    this.player.play();
  }

  pause(): void {
    this.player.pause();
  }

  resize(newRatio?: string): void {
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
    const layers: AbstractMedia[] = []
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

  private addLayerFromFile(file: File, useHtmlDemux: boolean = false): AbstractMedia[] {
    const layers = this.layerLoader.addLayerFromFile(file, this.#onLayerLoadUpdate.bind(this));

    layers.forEach(layer => {
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

  #onLayerLoadUpdate(
      layer: AbstractMedia,
      progress: number,
      ctx: ESRenderingContext2D | null,
      audioBuffer?: AudioBuffer
  ): void {
    this.loadingPopup.updateProgress(layer.id?.toString() || layer.name || 'unknown', progress);
    if (progress === 100) {
      this.setSelectedLayer(layer);
    }
    if (audioBuffer) {
      this.transcriptionManager.startTranscription(audioBuffer);
    }
  }

  setSelectedLayer(layer: AbstractMedia): void {
    this.timeline.setSelectedLayer(layer);
    this.player.setSelectedLayer(layer);
    this.studioState.setSelectedMedia(layer);
    this.speedControlManager.setLayer(layer);
  }
}
