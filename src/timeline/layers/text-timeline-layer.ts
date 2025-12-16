import { TimelineLayer } from './timeline-layer';

/**
 * Timeline media renderer for text medias
 */
export class TextTimelineLayer extends TimelineLayer {
  /**
   * Get the color scheme for text medias
   * @returns {Object} - Object containing baseColor, gradientColor, selectedColor, selectedGradient
   */
  getLayerColors() {
    return {
      baseColor: 'rgb(138, 43, 226)', // Blue Violet
      gradientColor: 'rgb(106, 90, 205)',
      selectedColor: 'rgb(186, 85, 211)',
      selectedGradient: 'rgb(138, 43, 226)'
    };
  }

  /**
   * Draw text "T" symbol
   * @param {number} x - X coordinate for symbol center
   * @param {number} y - Y coordinate for symbol center
   * @param {number} size - Size of the symbol
   */
  drawLayerSymbol(x: number, y: number, size: number) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1.5;

    // Draw "T" for text
    const textSize = size * 0.7;
    this.ctx.font = `bold ${textSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillText('T', x, y);
    this.ctx.strokeText('T', x, y);
  }
}
