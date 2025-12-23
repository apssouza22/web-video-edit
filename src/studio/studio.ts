import {createVideoCanvas, VideoCanvas} from '@/canvas';
import {createTimeline, Timeline} from '@/timeline';
import {AbstractMedia, MediaService} from '@/mediaclip';
import {AudioMedia} from '@/mediaclip/audio/audio';
import {MediaLoader} from './media-loader';
import {createTranscriptionService, TranscriptionService} from "@/transcription";
import {exportToJson} from '@/common/utils';
import {LoadingPopup} from './loading-popup';
import {AspectRatioSelector} from './aspect-ratio-selector';
import {SpeedControlInput} from "./speed-control-input";
import {StudioState} from "@/common/studio-state";
import {MediaLibrary} from "@/medialibrary";
import {createSpeechService, SpeechService} from "@/speech";
import {VideoExportHandler} from '@/video/mux/video-export-handler';

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
  aspectRatioSelector: AspectRatioSelector;
  player: VideoCanvas;
  timeline: Timeline;
  mediaLoader: MediaLoader;
  transcriptionManager: TranscriptionService;
  mediaService: MediaService;
  loadingPopup: LoadingPopup;
  speedControlManager: SpeedControlInput;
  studioState: StudioState;
  mediaLibrary: MediaLibrary;
  private speechService: SpeechService;
  private videoExportHandler: VideoExportHandler;

  constructor(mediaService: MediaService, mediaLibrary: MediaLibrary) {
    this.mediaService = mediaService;
    this.aspectRatioSelector = new AspectRatioSelector();
    this.studioState = StudioState.getInstance();
    this.studioState.setAspectRatio('16:9');
    this.player = createVideoCanvas(this.studioState);
    this.player.mount(document.getElementById('video-canvas')!);
    this.timeline = createTimeline();
    this.mediaLoader = new MediaLoader(this);

    this.transcriptionManager = createTranscriptionService();
    this.speechService = createSpeechService();
    this.loadingPopup = new LoadingPopup();
    this.speedControlManager = new SpeedControlInput();
    this.mediaLibrary = mediaLibrary;

    this.videoExportHandler = new VideoExportHandler(() =>{this.player.pause()});

    window.requestAnimationFrame(this.#loop.bind(this));

    this.#setupAspectRatioSelector();
    this.resize();
  }

  init(): void {
    this.videoExportHandler.init();
    this.setUpJsonExport();
    this.transcriptionManager.loadModel();
    this.speedControlManager.init();
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


  #setupAspectRatioSelector(): void {
    const settingsTab = document.getElementById('settings');
    if (settingsTab) {
      const settingsForm = settingsTab.querySelector('.settings-form');
      if (settingsForm) {
        this.aspectRatioSelector.mount(settingsForm as HTMLElement);
      }
    }

    this.aspectRatioSelector.onRatioChange((newRatio: string) => {
      this.studioState.setAspectRatio(newRatio);
      this.resize(newRatio);
    });
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
      layer.startTime = this.studioState.getPlayingTime() -1;
      layer.init(layer.width, layer.height, this.player.getCanvasAudioContext());
    }
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
    if (this.getMedias().length !== this.player.getLayersLength()) {
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
      progress: number,
      layerName: string,
      layer?: AbstractMedia,
      audioBuffer?: AudioBuffer | null
  ): void {
    this.loadingPopup.updateProgress(layerName, progress);
    if (progress === 100 && layer?.id) {
      this.addLayer(layer);
    }
    if (audioBuffer && layer?.id) {
      this.transcriptionManager.startTranscription(audioBuffer, layer?.id);
    }
  }

  setSelectedLayer(layer: AbstractMedia): void {
    this.timeline.setSelectedLayer(layer);
    this.player.setSelectedLayer(layer);
    this.studioState.setSelectedMedia(layer);
    this.speedControlManager.setLayer(layer);
  }
}
