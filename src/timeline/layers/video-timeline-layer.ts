import {TimelineLayer} from '../timeline-layer';
import {VideoThumbnailGenerator} from '../video-thumbnail-generator';
import type {VideoMedia} from '@/medialayer/video';

export class VideoTimelineLayer extends TimelineLayer {
  #thumbnailsInitialized: boolean = false;
  #thumbnailIndices: number[] = [];
  #lastThumbnailCount: number = 0;
  #thumbnailGenerator: VideoThumbnailGenerator;

  constructor(ctx: CanvasRenderingContext2D, media: VideoMedia, totalTime: number, canvasWidth: number) {
    super(ctx, media, totalTime, canvasWidth);
    this.#thumbnailGenerator = new VideoThumbnailGenerator(media);
  }

  getLayerColors() {
    return {
      baseColor: 'rgb(30, 144, 255)',
      gradientColor: 'rgb(0, 123, 255)',
      selectedColor: 'rgb(70, 180, 255)',
      selectedGradient: 'rgb(30, 144, 255)'
    };
  }

  drawLayerSymbol(x: number, y: number, size: number) {
    // For video layers, we are drawing the thumbnails
  }

  render(yPos: number, height: number, selected = false) {
    super.render(yPos, height, selected);
    const videoMedia = this.media as VideoMedia;
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
    const trackY = yPos - height / 2;
    const thumbnailHeight = height * 0.85;
    const thumbnailWidth = thumbnailHeight * (16 / 9);
    const thumbnailSpacing = 2;
    const padding = 4;
    const availableWidth = length - padding * 2;
    const thumbnailCount = Math.floor(availableWidth / (thumbnailWidth + thumbnailSpacing));
    if (thumbnailCount <= 0) {
      return;
    }

    const videoMedia = this.media as VideoMedia;
    const totalFrames = videoMedia.getTotalFrames();
    if (totalFrames === 0) {
      return;
    }

    if (!this.#thumbnailsInitialized || this.#lastThumbnailCount !== thumbnailCount) {
      this.#initializeThumbnails(thumbnailCount, totalFrames);
      this.#lastThumbnailCount = thumbnailCount;
    }

    let currentX = start + padding;
    const thumbnailY = trackY + (height - thumbnailHeight) / 2;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(start, trackY, length, height);
    this.ctx.clip();

    for (let i = 0; i < Math.min(thumbnailCount, this.#thumbnailIndices.length); i++) {
      const frameIndex = this.#thumbnailIndices[i];
      const thumbnail = this.#thumbnailGenerator.getThumbnail(frameIndex);
      if (thumbnail) {
        this.ctx.drawImage(thumbnail, currentX, thumbnailY, thumbnailWidth, thumbnailHeight);
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(currentX, thumbnailY, thumbnailWidth, thumbnailHeight);
      }
      currentX += thumbnailWidth + thumbnailSpacing;
    }
    this.ctx.restore();
  }

  #initializeThumbnails(thumbnailCount: number, totalFrames: number) {
    const step = Math.max(1, Math.floor(totalFrames / thumbnailCount));
    for (let i = 0; i < thumbnailCount; i++) {
      const frameIndex = Math.min(i * step, totalFrames - 1);
      this.#thumbnailIndices.push(frameIndex);
    }
    this.#thumbnailGenerator.generateThumbnails(this.#thumbnailIndices);
    this.#thumbnailsInitialized = true;
  }
}
