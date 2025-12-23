import {TimelineLayer} from './timeline-layer';
import {ComposedMedia} from "@/mediaclip";

export class ComposedTimelineLayer extends TimelineLayer {

  constructor(ctx: CanvasRenderingContext2D, media: ComposedMedia, totalTime: number, canvasWidth: number) {
    super(ctx, media, totalTime, canvasWidth);
    this.media = media
  }

  getLayerColors() {
    return {
      baseColor: 'rgb(30, 144, 255)',
      gradientColor: 'rgb(0, 123, 255)',
      selectedColor: 'rgb(70, 180, 255)',
      selectedGradient: 'rgb(30, 144, 255)'
    }
  }

  drawLayerSymbol(x: number, y: number, size: number) {
    // For video layers, we are drawing the thumbnails
  }

  render(yPos: number, height: number, selected = false) {
    super.render(yPos, height, selected);
    const videoMedia = this.media as ComposedMedia;
    if (!videoMedia.ready) {
      return;
    }

    const scale = this.canvasWidth / this.totalTime;
    const start = scale * this.media.startTime;
    const length = scale * this.media.totalTimeInMilSeconds;
    if (length < height) {
      return;
    }
    this.#drawThumbnails(start, length, yPos, height);
  }

  #drawThumbnails(start: number, length: number, yPos: number, height: number) {

  }

  #initializeThumbnails(thumbnailCount: number, totalFrames: number) {

  }
}
