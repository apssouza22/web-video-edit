import { TimelineLayer } from '../timeline-layer';

/**
 * Timeline layer renderer for image layers
 */
export class ImageTimelineLayer extends TimelineLayer {
  /**
   * Get the color scheme for image layers
   * @returns {Object} - Object containing baseColor, gradientColor, selectedColor, selectedGradient
   */
  getLayerColors() {
    return {
      baseColor: 'rgb(34, 139, 34)', // Forest Green
      gradientColor: 'rgb(0, 128, 0)',
      selectedColor: 'rgb(60, 179, 113)',
      selectedGradient: 'rgb(34, 139, 34)'
    };
  }

  /**
   * Draw image/picture symbol
   * @param {number} x - X coordinate for symbol center
   * @param {number} y - Y coordinate for symbol center
   * @param {number} size - Size of the symbol
   */
  drawLayerSymbol(x: number, y: number, size: number) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1.5;

    // Draw image/picture symbol
    const imgSize = size * 0.9;
    const imgX = x - imgSize / 2;
    const imgY = y - imgSize / 2;

    // Draw image frame
    this.ctx.strokeRect(imgX, imgY, imgSize, imgSize * 0.75);

    // Draw mountain/landscape inside
    this.ctx.beginPath();
    this.ctx.moveTo(imgX + imgSize * 0.1, imgY + imgSize * 0.6);
    this.ctx.lineTo(imgX + imgSize * 0.3, imgY + imgSize * 0.3);
    this.ctx.lineTo(imgX + imgSize * 0.5, imgY + imgSize * 0.45);
    this.ctx.lineTo(imgX + imgSize * 0.7, imgY + imgSize * 0.25);
    this.ctx.lineTo(imgX + imgSize * 0.9, imgY + imgSize * 0.6);
    this.ctx.stroke();

    // Draw sun/circle
    this.ctx.beginPath();
    this.ctx.arc(imgX + imgSize * 0.75, imgY + imgSize * 0.25, imgSize * 0.08, 0, 2 * Math.PI);
    this.ctx.fill();
  }
}
