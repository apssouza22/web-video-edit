import {AbstractMedia, isMediaAudio, isMediaVideo} from "@/media";

class StudioState {
  private static instance: StudioState | null = null;

  private medias: AbstractMedia[] = [];
  private selectedMedia: AbstractMedia | null = null;
  private isPlaying: boolean = false;
  private playingTime: number = 0;
  private minWidth: number = Number.POSITIVE_INFINITY;
  private minHeight: number = Number.POSITIVE_INFINITY;

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

  getMediaById(id: string): AbstractMedia | null {
    const media = this.medias.find(media => media.id === id);
    return media ? media : null;
  }

  setMinVideoSizes(width: number, height: number) {
    this.minWidth = width > this.minWidth ? this.minWidth : width;
    this.minHeight = height > this.minHeight ? this.minHeight : height;
  }

  getMinVideoSizes(): { width: number, height: number } {
    return {width: this.minWidth, height: this.minHeight};
  }

  reorderLayer(fromIndex: number, toIndex: number) {
    // Adjust target index if we removed an element before it
    const adjustedToIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
    const layer = this.medias.splice(fromIndex, 1)[0];
    this.medias.splice(adjustedToIndex, 0, layer);
  }
}

export const studioState = StudioState.getInstance();
export { StudioState };