import {TimelineLayer} from '../timeline-layer';

/**
 * Timeline media renderer for audio medias
 */
export class AudioTimelineLayer extends TimelineLayer {
  /**
   * Get the color scheme for audio medias
   * @returns {Object} - Object containing baseColor, gradientColor, selectedColor, selectedGradient
   */
  getLayerColors() {
    return {
      baseColor: 'rgb(255, 165, 0)', // Orange
      gradientColor: 'rgb(255, 140, 0)',
      selectedColor: 'rgb(255, 200, 50)',
      selectedGradient: 'rgb(255, 165, 0)'
    };
  }

  /**
   * Draw audio waveform symbol
   * @param {number} x - X coordinate for symbol center
   * @param {number} y - Y coordinate for symbol center
   * @param {number} size - Size of the symbol
   */
  drawLayerSymbol(x: number, y: number, size: number) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1.5;

    // Draw waveform pattern
    const waveWidth = size * 0.8;
    const waveHeight = size * 0.6;
    const waveX = x - waveWidth / 2;
    const waveY = y;

    this.ctx.beginPath();
    this.ctx.moveTo(waveX, waveY);

    // Create a simple waveform pattern
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const segmentX = waveX + (waveWidth * i) / segments;
      const amplitude = Math.sin((i / segments) * Math.PI * 4) * (waveHeight / 2);
      this.ctx.lineTo(segmentX, waveY + amplitude);
    }

    this.ctx.lineTo(waveX + waveWidth, waveY);
    this.ctx.stroke();
  }
}
