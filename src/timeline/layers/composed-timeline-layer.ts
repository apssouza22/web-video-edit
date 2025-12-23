import {TimelineLayer} from './timeline-layer';
import {ComposedMedia} from "@/mediaclip";
import {ComposedMediaGenerator} from './composed-media-generator';

export class ComposedTimelineLayer extends TimelineLayer {
  #generator: ComposedMediaGenerator;
  #isInitialized: boolean = false;
  #thumbnailIndices: number[] = [];
  #lastTotalFrames: number = 0;

  constructor(ctx: CanvasRenderingContext2D, media: ComposedMedia, totalTime: number, canvasWidth: number) {
    super(ctx, media, totalTime, canvasWidth);
    this.#generator = new ComposedMediaGenerator(media);
  }

  getLayerColors() {
    return {
      baseColor: 'rgba(9,26,42,0.49)',
      gradientColor: 'rgb(0, 123, 255)',
      selectedColor: 'rgb(70, 180, 255)',
      selectedGradient: 'rgb(30, 144, 255)'
    }
  }

  drawLayerSymbol(x: number, y: number, size: number) {
    // For composed layers, we are drawing the thumbnails and waveform
  }

  render(yPos: number, height: number, selected = false) {
    super.render(yPos, height, selected);
    const composedMedia = this.media as ComposedMedia;
    if (!composedMedia.ready) {
      return;
    }

    const scale = this.canvasWidth / this.totalTime;
    const start = scale * this.media.startTime;
    const length = scale * this.media.totalTimeInMilSeconds;
    if (length < height) {
      return;
    }
    this.#drawContent(start, length, yPos, height);
  }

  #drawContent(start: number, length: number, yPos: number, height: number) {
    // Calculate split heights (70% thumbnails, 30% waveform)
    const thumbnailHeight = height * 0.70;
    const waveformHeight = height * 0.30;

    // Calculate thumbnail parameters
    const thumbnailWidth = thumbnailHeight * (16 / 9);
    const thumbnailSpacing = 2;
    const padding = 4;
    const availableWidth = length - padding * 2;
    const thumbnailCount = Math.floor(availableWidth / (thumbnailWidth + thumbnailSpacing));

    if (thumbnailCount <= 0) {
      return;
    }

    const composedMedia = this.media as ComposedMedia;
    const totalFrames = composedMedia.video.getTotalFrames();

    if (totalFrames === 0) {
      return;
    }

    // Initialize if needed or thumbnail count changed
    if (!this.#isInitialized || this.#lastTotalFrames !== totalFrames) {
      this.#initializeContent(thumbnailCount, totalFrames);
      this.#lastTotalFrames = totalFrames;
    }

    this.#drawThumbnails(start, length, yPos, height, thumbnailHeight);
    this.#drawWaveform(start, length, yPos, height, waveformHeight);
  }

  #drawThumbnails(start: number, length: number, yPos: number, height: number, thumbnailHeight: number) {
    const trackY = yPos - height / 2;
    const thumbnailWidth = thumbnailHeight * (16 / 9);
    const thumbnailSpacing = 2;
    const padding = 4;
    const availableWidth = length - padding * 2;
    const thumbnailCount = Math.floor(availableWidth / (thumbnailWidth + thumbnailSpacing));

    if (thumbnailCount <= 0 || !this.#generator.isThumbnailsGenerated) {
      return;
    }

    // Thumbnails start at the top of the track
    let currentX = start + padding;
    const thumbnailY = trackY + (height * 0.70 - thumbnailHeight) / 2; // Center within top 70%

    // Setup clipping region for thumbnails (top 70% only)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(start, trackY, length, height * 0.70);
    this.ctx.clip();

    // Draw each thumbnail
    for (let i = 0; i < Math.min(thumbnailCount, this.#thumbnailIndices.length); i++) {
      const frameIndex = this.#thumbnailIndices[i];
      const thumbnail = this.#generator.getThumbnail(frameIndex);
      if (thumbnail) {
        this.ctx.drawImage(thumbnail, currentX, thumbnailY, thumbnailWidth, thumbnailHeight);
        // Draw border
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(currentX, thumbnailY, thumbnailWidth, thumbnailHeight);
      }

      currentX += thumbnailWidth + thumbnailSpacing;
    }

    this.ctx.restore();
  }

  #drawWaveform(start: number, length: number, yPos: number, height: number, waveformHeight: number) {
    if (!this.#generator.isWaveformGenerated) {
      return;
    }

    const trackY = yPos - height / 2;
    const waveformStartY = trackY + height * 0.70; // Start at 70% mark

    const padding = 6;
    const effectiveWaveformHeight = waveformHeight * 0.9; // 90% of allocated space
    const availableWidth = length - padding * 2;
    const barCount = Math.floor(availableWidth / 3);

    if (barCount <= 0) {
      return;
    }

    // Get waveform data for this segment
    const waveformData = this.#generator.getWaveformSegment(0, 1, barCount);
    const barWidth = 2;
    const barSpacing = (availableWidth - barCount * barWidth) / (barCount - 1);

    // Setup clipping region for waveform (bottom 30% only)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(start, waveformStartY, length, waveformHeight);
    this.ctx.clip();

    let currentX = start + padding;
    const waveformCenterY = waveformStartY + waveformHeight / 2;

    // Draw waveform bars
    for (let i = 0; i < barCount; i++) {
      const amplitude = waveformData[i];
      const barHeight = Math.max(2, amplitude * effectiveWaveformHeight);
      const barY = waveformCenterY - barHeight / 2;

      // Create gradient for this bar
      const gradient = this.ctx.createLinearGradient(currentX, barY, currentX, barY + barHeight);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(currentX, barY, barWidth, barHeight);

      currentX += barWidth + barSpacing;
    }

    this.ctx.restore();
  }

  async #initializeContent(thumbnailCount: number, totalFrames: number): Promise<void> {
    this.#thumbnailIndices = [];
    const step = Math.max(1, Math.floor(totalFrames / thumbnailCount));

    for (let i = 0; i < thumbnailCount; i++) {
      const frameIndex = Math.min(i * step, totalFrames - 1);
      this.#thumbnailIndices.push(frameIndex);
    }
    await this.#generator.initializeGenerators(this.#thumbnailIndices);
    this.#isInitialized = true;
  }
}
