import {AbstractMedia, isMediaAudio, isMediaVideo} from "@/media";

class StudioState {
  private static instance: StudioState | null = null;

  private medias: AbstractMedia[] = [];
  private selectedMedia: AbstractMedia | null = null;
  private isPlaying: boolean = false;
  private playingTime: number = 0;

  private constructor() {}

  static getInstance(): StudioState {
    if (!StudioState.instance) {
      StudioState.instance = new StudioState();
    }
    return StudioState.instance;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setPlaying(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
  }

  getPlayingTime(): number {
    return this.playingTime;
  }

  setPlayingTime(currentTime: number): void {
    this.playingTime = currentTime;
  }

  addMedia(media: AbstractMedia): void {
    this.medias.push(media);
  }

  getMedias(): AbstractMedia[] {
    return this.medias;
  }

  getMediaVideo(): AbstractMedia[] {
    return this.medias.filter(media => isMediaVideo(media));
  }

  getMediaAudio(): AbstractMedia[] {
    return this.medias.filter(media => isMediaAudio(media));
  }

  getSelectedMedia(): AbstractMedia | null {
    return this.selectedMedia;
  }

  setSelectedMedia(media: AbstractMedia): void {
    this.selectedMedia = media;
  }
}

export const studioState = StudioState.getInstance();
export { StudioState };