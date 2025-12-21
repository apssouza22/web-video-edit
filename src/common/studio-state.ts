import {AbstractMedia} from "@/mediaclip";

class StudioState {
  private static instance: StudioState | null = null;

  private medias: AbstractMedia[] = [];
  private selectedMedia: AbstractMedia | null = null;
  private _isPlaying: boolean = false;
  private playingTime: number = 0;
  private maxWidth: number = 0;
  private maxHeight: number = 0;
  private currentAspectRatio: string = '16:9';

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

  setAspectRatio(ratio: string): void {
    this.currentAspectRatio = ratio;
  }

  setMaxVideoSizes(width: number, height: number): void {
    this.maxWidth = Math.max(width, this.maxWidth);
    this.maxHeight = Math.max(height, this.maxHeight);
  }

  getMaxVideoSizes(): { width: number; height: number } {
    return { width: this.maxWidth, height: this.maxHeight };
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

  getCurrentAspectRatio(): string {
    return this.currentAspectRatio;
  }
}

export const studioState = StudioState.getInstance();
export { StudioState };