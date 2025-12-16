import {TimelineLayer} from './timeline-layer';
import {AudioWaveformGenerator} from './audio-waveform-generator';
import type {AudioMedia} from '@/mediaclip/audio';

export class AudioTimelineLayer extends TimelineLayer {
  #waveformGenerator: AudioWaveformGenerator;
  #waveformInitialized: boolean = false;

  constructor(ctx: CanvasRenderingContext2D, media: AudioMedia, totalTime: number, canvasWidth: number) {
    super(ctx, media, totalTime, canvasWidth);
    this.#waveformGenerator = new AudioWaveformGenerator(media);
  }

  getLayerColors() {
    return {
      baseColor: 'rgb(255, 165, 0)',
      gradientColor: 'rgb(255, 140, 0)',
      selectedColor: 'rgb(255, 200, 50)',
      selectedGradient: 'rgb(255, 165, 0)'
    };
  }

  drawLayerSymbol() {
    // No icon for audio layers - waveform is displayed instead
  }

  render(yPos: number, height: number, selected = false) {
    if (!isFinite(yPos) || !isFinite(height) || height <= 0) {
      return;
    }

    const scale = this.canvasWidth / this.totalTime;
    const start = scale * this.media.startTime;
    const length = scale * this.media.totalTimeInMilSeconds;

    if (!isFinite(start) || !isFinite(length) || length <= 0) {
      return;
    }

    const trackY = yPos - height / 2;
    this.#drawTrack(start, length, trackY, height, selected);
    this.#drawResizeHandles(start, length, yPos, height, selected);

    const audioMedia = this.media as AudioMedia;
    if (!audioMedia.audioBuffer || length < height) {
      return;
    }

    this.#initializeWaveform();
    this.#drawWaveform(start, length, yPos, height);
  }

  #drawTrack(start: number, length: number, trackY: number, height: number, selected: boolean): void {
    const colors = this.getLayerColors();
    const fillColor = selected ? colors.selectedColor : colors.baseColor;
    const gradientColor = selected ? colors.selectedGradient : colors.gradientColor;
    const strokeColor = selected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.3)';

    const radius = height * 0.25;
    const gradient = this.ctx.createLinearGradient(start, trackY, start, trackY + height);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, gradientColor);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.roundRect(start + 2, trackY + 2, length, height, radius);
    this.ctx.fill();

    this.ctx.fillStyle = gradient;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = selected ? 3 : 1.5;

    this.ctx.beginPath();
    this.ctx.roundRect(start, trackY, length, height, radius);
    this.ctx.fill();
    this.ctx.stroke();
  }

  #drawResizeHandles(start: number, length: number, yPos: number, height: number, selected: boolean): void {
    const handleWidth = 6;
    const handleHeight = height * 1.4;
    const handleY = yPos - handleHeight / 2;
    const handleRadius = 2;

    this.ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.roundRect(start - handleWidth / 2, handleY, handleWidth, handleHeight, handleRadius);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.roundRect(start + length - handleWidth / 2, handleY, handleWidth, handleHeight, handleRadius);
    this.ctx.fill();
    this.ctx.stroke();
  }

  #initializeWaveform(): void {
    if (this.#waveformInitialized) {
      return;
    }

    this.#waveformGenerator.generateWaveform();
    this.#waveformInitialized = true;
  }

  #drawWaveform(start: number, length: number, yPos: number, height: number): void {
    if (!this.#waveformGenerator.isGenerated) {
      return;
    }

    const trackY = yPos - height / 2;
    const padding = 6;
    const waveformHeight = height * 0.9;
    const availableWidth = length - padding * 2;
    const barCount = Math.floor(availableWidth / 3);

    if (barCount <= 0) {
      return;
    }

    const waveformData = this.#waveformGenerator.getWaveformSegment(0, 1, barCount);
    const barWidth = 2;
    const barSpacing = (availableWidth - barCount * barWidth) / (barCount - 1);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(start, trackY, length, height);
    this.ctx.clip();

    let currentX = start + padding;

    for (let i = 0; i < barCount; i++) {
      const amplitude = waveformData[i];
      const barHeight = Math.max(2, amplitude * waveformHeight);
      const barY = yPos - barHeight / 2;

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
}
