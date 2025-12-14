import {createVideoCanvas, VideoCanvas} from '@/canvas';
import {createTimeline, Timeline} from '@/timeline';
import {AbstractMedia, MediaService} from '@/mediaclip';
import {AudioMedia} from '@/mediaclip/audio/audio';
import {MediaLoader} from './media-loader';
import {createVideoMuxer} from '@/video/muxer';
import {PinchHandler} from '@/common';
import {createTranscriptionService, TranscriptionService} from "@/transcription";
import {exportToJson} from '@/common/utils';
import {LoadingPopup} from './loading-popup';
import {AspectRatioSelector} from './aspect-ratio-selector';
import {SpeedControlInput} from "./speed-control-input";
import {StudioState} from "@/common/studio-state";
import {VideoExportService} from "@/video/muxer/video-export-service";
import {MediaLibrary} from "@/medialibrary";
import {createSpeechService, SpeechService} from "@/speech";

/**
 * Update data structure for media transformations
 */
interface LayerUpdate {
  scale?: number;
  rotation?: number;
  x?: number;
  y?: number;
}


export class VideoStudio {
  update: LayerUpdate | null;
  videoCanvas: HTMLElement;
  aspectRatioSelector: AspectRatioSelector;
  medias: AbstractMedia[];
  player: VideoCanvas;
  timeline: Timeline;
  mediaLoader: MediaLoader;
  videoExporter: VideoExportService;
  transcriptionManager: TranscriptionService;
  mediaService: MediaService;
  loadingPopup: LoadingPopup;
  speedControlManager: SpeedControlInput;
  pinchHandler?: PinchHandler;
  studioState: StudioState;
  mediaLibrary: MediaLibrary;
  private speachService: SpeechService;

  constructor(mediaService: MediaService, mediaLibrary: MediaLibrary) {
    this.mediaService = mediaService;
    this.update = null;
    this.videoCanvas = document.getElementById('video-canvas')!;
    this.aspectRatioSelector = new AspectRatioSelector();
    this.medias = [];
    this.studioState = StudioState.getInstance();
    this.player = createVideoCanvas(this.studioState);
    this.player.mount(this.videoCanvas);
    this.timeline = createTimeline();
    this.mediaLoader = new MediaLoader(this);
    this.videoExporter = createVideoMuxer();
    this.transcriptionManager = createTranscriptionService();
    this.speachService = createSpeechService();
    this.loadingPopup = new LoadingPopup();
    this.speedControlManager = new SpeedControlInput();
    this.mediaLibrary = mediaLibrary;

    window.requestAnimationFrame(this.#loop.bind(this));

    this.#setupPinchHandler();
    this.#setupAspectRatioSelector();
    this.resize();
  }

  init(): void {
    this.setUpVideoExport();
    this.setUpJsonExport();
    this.transcriptionManager.loadModel();
    this.speachService.loadModel();
    this.speedControlManager.init();
  }

  private setUpVideoExport(): void {
    const exportVideoBtn = document.getElementById('export-video-btn');
    if (!exportVideoBtn) {
      return;
    }
    const exportId = 'video-export';

    exportVideoBtn.addEventListener('click', () => {
      if (this.getMedias().length === 0) {
        alert("Nothing to export.");
        return;
      }

      const progressContainer = document.getElementById('export-progress');
      const progressFill = document.getElementById('export-progress-fill');
      const progressText = document.getElementById('export-progress-text');

      if (progressContainer) {
        progressContainer.style.display = 'block';
      }

      exportVideoBtn.setAttribute('disabled', 'true');
      exportVideoBtn.classList.add('exporting');

      const progressCallback = (progress: number): void => {
        this.loadingPopup.updateProgress(exportId, progress);
        if (progressFill) {
          progressFill.style.width = `${progress}%`;
        }
        if (progressText) {
          progressText.textContent = `${Math.round(progress)}%`;
        }
      };

      const completionCallback = (): void => {
        exportVideoBtn.removeAttribute('disabled');
        exportVideoBtn.classList.remove('exporting');

        if (progressContainer) {
          setTimeout(() => {
            progressContainer.style.display = 'none';
            if (progressFill) progressFill.style.width = '0%';
            if (progressText) progressText.textContent = '0%';
          }, 2000);
        }
      };

      this.player.pause();
      this.videoExporter.export(progressCallback, completionCallback);
    });
  }

  private setUpJsonExport(): void {
    const exportJsonBtn = document.getElementById('export-json-btn');
    if (!exportJsonBtn) {
      return;
    }

    exportJsonBtn.addEventListener('click', () => {
      exportToJson();
    });
  }

  getMediaById(id: string): AbstractMedia | null {
    return this.studioState.getMediaById(id);
  }

  reorderLayer(fromIndex: number, toIndex: number) {
    this.studioState.reorderLayer(fromIndex, toIndex);
    this.player.addLayers(this.getMedias());
    this.timeline.addLayers(this.getMedias());
  }

  dumpToJson(): string {
    const out: any[] = [];
    for (const layer of this.getMedias()) {
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
    this.pinchHandler = new PinchHandler(this.videoCanvas, callback);
    this.pinchHandler.setupEventListeners();
  }

  #setupAspectRatioSelector(): void {
    const settingsTab = document.getElementById('settings');
    if (settingsTab) {
      const settingsForm = settingsTab.querySelector('.settings-form');
      if (settingsForm) {
        this.aspectRatioSelector.mount(settingsForm as HTMLElement);
      }
    }

    this.aspectRatioSelector.onRatioChange((newRatio: string) => {
      this.resize(newRatio);
    });
  }

  /**
   * Gets the currently selected media
   */
  getSelectedLayer(): AbstractMedia | null {
    if (!this.timeline.selectedLayer) {
      return null;
    }
    return this.getMediaById(this.timeline.selectedLayer.id);
  }

  /**
   * Get all medias in the studio
   */
  getMedias(): AbstractMedia[] {
    return this.studioState.getMedias();
  }

  /**
   * Remove a media from the studio
   */
  remove(media: AbstractMedia): void {
    console.log(`Removing media: ${this.getMedias().length} layers before removal.`);
    this.studioState.removeMedia(media);
    console.log(`Removed media: ${this.getMedias().length} layers after removal.`);
    if (media instanceof AudioMedia) {
      media.disconnect();
    }
    this.player.total_time = 0;
    for (const layer of this.getMedias()) {
      if (layer.startTime + layer.totalTimeInMilSeconds > this.player.total_time) {
        this.player.total_time = layer.startTime + layer.totalTimeInMilSeconds;
      }
    }
    if (this.player.time > this.player.total_time) {
      this.player.time = this.player.total_time;
    }
    this.timeline.addLayers(this.getMedias());
    this.player.addLayers(this.getMedias());
  }

  /**
   * Clone a media by creating a copy with slightly modified properties
   */
  cloneLayer(layer: AbstractMedia): void {
    const clonedLayer = layer.clone();
    this.addLayer(clonedLayer);
  }

  addLayer(layer: AbstractMedia, skipInit: boolean = false): AbstractMedia {
    if (!skipInit) {
      layer.startTime = this.player.time;
      layer.init(layer.width, layer.height, this.player.audioContext);
    }
    this.medias.push(layer);
    this.studioState.addMedia(layer);
    this.setSelectedLayer(layer);
    console.log(`Added media: ${this.getMedias().length} layers now in studio.`);
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
  }

  async #loop(realtime: number): Promise<void> {
    // Process updates for selected media
    const selectedLayer = this.getSelectedLayer();
    if (selectedLayer && this.update) {
      selectedLayer.update(this.update, this.player.time);
      this.update = null;
    }
    if (this.medias.length !== this.player.layers.length) {
      this.player.addLayers(this.getMedias());
      this.timeline.addLayers(this.getMedias());
    }

    await this.player.render(realtime);
    this.timeline.render();
    window.requestAnimationFrame(this.#loop.bind(this));
  }

  async createMediaFromLibrary(fileId: string): Promise<AbstractMedia[]> {
    const file = await this.mediaLibrary.getFile(fileId);
    if (!file) {
      console.error(`File not found in library: ${fileId}`);
      return [];
    }
    this.loadingPopup.startLoading(file.name, file.name);
    return await this.mediaLoader.addMediaFromFile(file);
  }

  onLayerLoadUpdate(
      layer: AbstractMedia,
      progress: number,
      audioBuffer?: AudioBuffer | null
  ): void {
    if (!layer?.id) {
      console.error('Layer has no id');
      return;
    }
    this.loadingPopup.updateProgress(layer.name, progress);
    if (progress === 100) {
      this.addLayer(layer);
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
