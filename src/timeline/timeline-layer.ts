/**
 * Base class for timeline media rendering
 * Encapsulates all rendering logic for timeline medias
 */
import type { MediaInterface } from './types';

export class TimelineLayer {
  /**
   * @param {CanvasRenderingContext2D} ctx - The canvas context to render on
   * @param {MediaInterface} media - The media data to render
   * @param {number} totalTime - The total time duration of the timeline
   * @param {number} canvasWidth - The width of the timeline canvas
   */
  ctx: CanvasRenderingContext2D;
  media: MediaInterface;
  totalTime: number;
  canvasWidth: number;

  constructor(ctx: CanvasRenderingContext2D, media: MediaInterface, totalTime: number, canvasWidth: number) {
    this.ctx = ctx;
    this.media = media;
    this.totalTime = totalTime;
    this.canvasWidth = canvasWidth;
  }

  /**
   * Update the timeline properties for rendering
   * @param {number} totalTime - The total time duration
   * @param {number} canvasWidth - The canvas width
   */
  updateProperties(totalTime: number, canvasWidth: number) {
    this.totalTime = totalTime;
    this.canvasWidth = canvasWidth;
  }

  /**
   * Get the color scheme for this media type
   * @param {boolean} selected - Whether the media is selected
   * @returns {Object} - Object containing fillColor, gradientColor, strokeColor, and shadowColor
   */
  #getColors(selected: boolean) {
    const colors = this.getLayerColors();
    return {
      fillColor: selected ? colors.selectedColor : colors.baseColor,
      gradientColor: selected ? colors.selectedGradient : colors.gradientColor,
      strokeColor: selected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.3)',
      shadowColor: 'rgba(0, 0, 0, 0.2)'
    };
  }

  /**
   * Abstract method to get media-specific colors
   * Must be implemented by subclasses
   * @returns {Object} - Object containing baseColor, gradientColor, selectedColor, selectedGradient
   */
  getLayerColors(): { baseColor: string; gradientColor: string; selectedColor: string; selectedGradient: string } {
    throw new Error('getLayerColors must be implemented by subclasses');
  }

  /**
   * Abstract method to draw media-specific symbol
   * Must be implemented by subclasses
   * @param {number} x - X coordinate for symbol center
   * @param {number} y - Y coordinate for symbol center
   * @param {number} size - Size of the symbol
   */
  #drawSymbol(x: number, y: number, size: number) {
    this.drawLayerSymbol(x, y, size);
  }

  /**
   * Abstract method for drawing media symbol
   * Must be implemented by subclasses
   * @param {number} x - X coordinate for symbol center
   * @param {number} y - Y coordinate for symbol center
   * @param {number} size - Size of the symbol
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drawLayerSymbol(x: number, y: number, size: number) {
    throw new Error('drawLayerSymbol must be implemented by subclasses');
  }

  /**
   * Calculate media position and dimensions
   * @returns {Object} - Object containing start, length, scale
   */
  #calculateDimensions() {
    const scale = this.canvasWidth / this.totalTime;
    const start = scale * this.media.startTime;
    const length = scale * this.media.totalTimeInMilSeconds;
    
    return { start, length, scale };
  }

  /**
   * Draw the main media track with gradient and styling
   * @param {number} start - Start x position
   * @param {number} length - Width of the media
   * @param {number} trackY - Y position of track
   * @param {number} height - Height of the track
   * @param {Object} colors - Color scheme object
   * @param {boolean} selected - Whether media is selected
   */
  #drawTrack(start: number, length: number, trackY: number, height: number, colors: { fillColor: string; gradientColor: string; strokeColor: string; shadowColor: string }, selected: boolean) {
    const radius = height * 0.25;
    const gradientStartY = trackY;
    const gradientEndY = trackY + height;
    const gradient = this.ctx.createLinearGradient(start, gradientStartY, start, gradientEndY);
    gradient.addColorStop(0, colors.fillColor);
    gradient.addColorStop(1, colors.gradientColor);

    // Draw shadow first
    this.ctx.fillStyle = colors.shadowColor;
    this.ctx.beginPath();
    this.ctx.roundRect(start + 2, trackY + 2, length, height, radius);
    this.ctx.fill();

    // Draw the main media track with gradient
    this.ctx.fillStyle = gradient;
    this.ctx.strokeStyle = colors.strokeColor;
    this.ctx.lineWidth = selected ? 3 : 1.5;

    this.ctx.beginPath();
    this.ctx.roundRect(start, trackY, length, height, radius);
    this.ctx.fill();
    this.ctx.stroke();
  }

  /**
   * Draw resize handles on the media
   * @param {number} start - Start x position
   * @param {number} length - Width of the media
   * @param {number} y_coord - Y coordinate center
   * @param {number} height - Height of the track
   * @param {boolean} selected - Whether media is selected
   */
  #drawResizeHandles(start: number, length: number, y_coord: number, height: number, selected: boolean) {
    const handleWidth = 6;
    const handleHeight = height * 1.4;
    const handleY = y_coord - handleHeight / 2;
    const handleRadius = 2;

    this.ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;

    // Left handle
    this.ctx.beginPath();
    this.ctx.roundRect(start - handleWidth/2, handleY, handleWidth, handleHeight, handleRadius);
    this.ctx.fill();
    this.ctx.stroke();

    // Right handle
    this.ctx.beginPath();
    this.ctx.roundRect(start + length - handleWidth/2, handleY, handleWidth, handleHeight, handleRadius);
    this.ctx.fill();
    this.ctx.stroke();
  }

  /**
   * Draw media name text
   * @param {number} start - Start x position
   * @param {number} length - Width of the media
   * @param {number} y_coord - Y coordinate center
   * @param {number} height - Height of the track
   */
  #drawLayerName(start: number, length: number, y_coord: number, height: number) {
    if (length <= height * 4) return;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = 0.5;
    this.ctx.font = `${Math.min(12, height * 0.45)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    const textX = start + height * 2.2;
    const maxTextWidth = length - height * 3;

    // Truncate text if it's too long
    let displayName = this.media.name || 'Unnamed Layer';
    const textWidth = this.ctx.measureText(displayName).width;
    if (textWidth > maxTextWidth) {
      while (this.ctx.measureText(displayName + '...').width > maxTextWidth && displayName.length > 0) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '...';
    }

    // Draw text with subtle stroke for better readability
    this.ctx.strokeText(displayName, textX, y_coord);
    this.ctx.fillText(displayName, textX, y_coord);
  }

  /**
   * Main render method for the timeline media
   * @param {number} yPos - The y coordinate to render at
   * @param {number} height - The height of the media track
   * @param {boolean} selected - Whether the media is selected
   */
  render(yPos: number, height: number, selected = false) {
    if (!isFinite(yPos) || !isFinite(height) || height <= 0) {
      console.warn("Invalid media coordinates");
      return;
    }

    const { start, length } = this.#calculateDimensions();

    if (!isFinite(start) || !isFinite(length) || length <= 0) {
      console.warn("Invalid media position details");
      return;
    }

    const colors = this.#getColors(selected);
    const trackY = yPos - height / 2;
    this.#drawTrack(start, length, trackY, height, colors, selected);
    this.#drawResizeHandles(start, length, yPos, height, selected);

    // Draw media type symbol if the media is wide enough
    if (length > height * 2.5) {
      const symbolX = start + height * 0.8;
      const symbolY = yPos;
      const symbolSize = height * 0.7;
      this.#drawSymbol(symbolX, symbolY, symbolSize);
    }
    this.#drawLayerName(start, length, yPos, height);
  }
}
