import { TimelineLayer } from '../timeline-layer';

/**
 * Timeline layer renderer for video layers
 */
export class VideoTimelineLayer extends TimelineLayer {
  /**
   * Get the color scheme for video layers
   * @returns {Object} - Object containing baseColor, gradientColor, selectedColor, selectedGradient
   */
  getLayerColors() {
    return {
      baseColor: 'rgb(30, 144, 255)', // Dodger Blue
      gradientColor: 'rgb(0, 123, 255)',
      selectedColor: 'rgb(70, 180, 255)',
      selectedGradient: 'rgb(30, 144, 255)'
    };
  }

  /**
   * Draw video play button symbol
   * @param {number} x - X coordinate for symbol center
   * @param {number} y - Y coordinate for symbol center
   * @param {number} size - Size of the symbol
   */
  drawLayerSymbol(x: number, y: number, size: number) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1.5;

    // Draw enhanced play button triangle
    this.ctx.beginPath();
    const triangleSize = size * 0.8;
    const triangleX = x - triangleSize * 0.3;
    const triangleY = y;

    this.ctx.moveTo(triangleX, triangleY - triangleSize * 0.5);
    this.ctx.lineTo(triangleX, triangleY + triangleSize * 0.5);
    this.ctx.lineTo(triangleX + triangleSize * 0.8, triangleY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }
}
