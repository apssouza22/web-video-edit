import {isMediaAudio, isMediaVideo, MediaService} from "@/media";
import {VideoStudio} from "@/studio/studio";
import {StudioState} from "@/common/studio-state";

export class MediaEditor {
  private studioState: StudioState;
  private studio: VideoStudio;
  private mediaService: MediaService;

  constructor(studio: VideoStudio, mediaService: MediaService, studioState: StudioState) {
    this.studioState = studioState;
    this.studio = studio;
    this.mediaService = mediaService;
  }

  removeInterval(startTime: number, endTime: number): void {
    if (startTime < 0 || endTime <= startTime) {
      console.error('Invalid time interval provided:', startTime, endTime);
      return;
    }
    console.log(`Removing interval from ${startTime} to ${endTime} seconds`);
    this.mediaService.removeAudioInterval(startTime, endTime, this.studioState.getMediaAudio());
    this.mediaService.removeVideoInterval(startTime, endTime, this.studioState.getMediaVideo());
  }


  split(): void {
    if (!this.studioState.getSelectedMedia()) {
      return;
    }
    const layer = this.studioState.getSelectedMedia()!;

    // Check if layer is VideoLayer or AudioLayer
    if (!(isMediaVideo(layer)) && !(isMediaAudio(layer))) {
      return;
    }
    if (!layer.ready) {
      return;
    }
    if (layer.start_time > this.studioState.getPlayingTime()) {
      return;
    }
    if (layer.start_time + layer.totalTimeInMilSeconds < this.studioState.getPlayingTime()) {
      return;
    }

    const newMedia = this.mediaService.splitMedia(layer, this.studioState.getPlayingTime());
    this.studio.addLayer(newMedia, true);
  }

}
