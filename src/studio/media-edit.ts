import {AbstractMedia, isMediaAudio, isMediaVideo, MediaService} from "@/media";
import {VideoStudio} from "@/studio/studio";

export class MediaEditor {
  private studio: VideoStudio;
  private mediaService: MediaService;

  constructor(studio: VideoStudio, mediaService: MediaService) {
    this.studio = studio;
    this.mediaService = mediaService;
  }

  removeInterval(startTime: number, endTime: number): void {
    if (startTime < 0 || endTime <= startTime) {
      console.error('Invalid time interval provided:', startTime, endTime);
      return;
    }
    console.log(`Removing interval from ${startTime} to ${endTime} seconds`);
    this.mediaService.removeAudioInterval(startTime, endTime, this.#getAudioLayers());
    this.mediaService.removeVideoInterval(startTime, endTime, this.#getVideoLayers());
  }


  /**
   * Finds VideoLayers in the studio layers
   */
  #getVideoLayers(): AbstractMedia[] {
    const videoLayers: AbstractMedia[] = [];
    const layers = this.studio.getLayers();

    for (const layer of layers) {
      if (isMediaVideo(layer) && layer.framesCollection) {
        videoLayers.push(layer);
      }
    }
    return videoLayers;
  }

  /**
   * Finds AudioLayers in the studio layers
   */
  #getAudioLayers(): AbstractMedia[] {
    const audioLayers: AbstractMedia[] = [];
    const layers = this.studio.getLayers();

    for (const layer of layers) {
      if (isMediaAudio(layer) && layer.audioBuffer) {
        audioLayers.push(layer);
      }
    }
    return audioLayers;
  }

  split(): void {
    if (!this.studio.getSelectedLayer()) {
      return;
    }
    const layer = this.studio.getSelectedLayer()!;

    // Check if layer is VideoLayer or AudioLayer
    if (!(isMediaVideo(layer)) && !(isMediaAudio(layer))) {
      return;
    }
    if (!layer.ready) {
      return;
    }
    if (layer.start_time > this.studio.player.time) {
      return;
    }
    if (layer.start_time + layer.totalTimeInMilSeconds < this.studio.player.time) {
      return;
    }

    const newMedia = this.mediaService.splitMedia(layer, this.studio.player.time);
    this.studio.addLayer(newMedia, true);
  }

}
