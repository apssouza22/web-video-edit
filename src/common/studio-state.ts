import {AbstractMedia} from "@/mediaclip";

class StudioState {
  private static instance: StudioState | null = null;

  private medias: AbstractMedia[] = [];
  private selectedMedia: AbstractMedia | null = null;
  private _isPlaying: boolean = false;
  private playingTime: number = 0;
  private minWidth: number = Number.POSITIVE_INFINITY;
  private minHeight: number = Number.POSITIVE_INFINITY;

  static getInstance(): StudioState {
    if (!StudioState.instance) {
      StudioState.instance = new StudioState();
    }
    return StudioState.instance;
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  setPlaying(isPlaying: boolean): void {
    this._isPlaying = isPlaying;
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
    return this.medias.slice();
  }

  getMediaVideo(): AbstractMedia[] {
    return this.medias.filter(media => media.isVideo());
  }

  getMediaAudio(): AbstractMedia[] {
    return this.medias.filter(media => media.isAudio());
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

  removeMedia(media: AbstractMedia) {
    const idx = this.medias.indexOf(media);
    if (idx > -1) {
      this.medias.splice(idx, 1);
    }
  }
}

export const studioState = StudioState.getInstance();
export { StudioState };