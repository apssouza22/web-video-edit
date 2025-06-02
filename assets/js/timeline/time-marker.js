/**
 * Class representing timeline time markers
 * Handles rendering of time markers on the timeline
 */
class TimeMarker {
  /**
   * Create a new TimeMarker instance
   * @param {Object} config - Configuration object
   * @param {number} config.height - Height for the time markers at the top
   * @param {number} config.spacing - Pixels between time markers
   */
  constructor(config = {}) {
    this.height = config.height || 20;
    this.spacing = config.spacing || 60;
  }

  /**
   * Render time markers at the top of the timeline
   * Shows second markers along the timeline
   * @param {CanvasRenderingContext2D} ctx - Canvas context to render on
   * @param {number} width - Width of the canvas
   * @param {number} totalTime - Total timeline duration in milliseconds
   */
  render(ctx, width, totalTime) {
    ctx.fillStyle = 'rgb(30, 34, 38)';
    ctx.fillRect(0, 0, width, this.height);
    ctx.fillStyle = 'rgb(150, 150, 150)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    
    const secondsInterval = this.calculateTimeInterval(width, totalTime);
    for (let time = 0; time <= totalTime; time += secondsInterval) {
      const x = (time / totalTime) * width;
      ctx.fillRect(x, 0, 1, this.height);
      const seconds = time / 1000;
      ctx.fillText(seconds.toFixed(1) + 's', x, this.height - 5);
    }
    
    ctx.textAlign = 'left'; // Reset alignment for other text
  }

  /**
   * Calculate a readable time interval for markers based on the current scale
   * @param {number} availableWidth - Available width for rendering
   * @param {number} totalTime - Total timeline duration in milliseconds
   * @returns {number} Time interval in milliseconds
   */
  calculateTimeInterval(availableWidth, totalTime) {
    const pixelsPerSecond = availableWidth / (totalTime / 1000);
    
    // Choose an interval that will space the markers nicely
    if (pixelsPerSecond > 200) return 100; // 0.1 second intervals if zoomed way in
    if (pixelsPerSecond > 100) return 250; // 0.25 second intervals
    if (pixelsPerSecond > 50) return 500; // 0.5 second intervals
    if (pixelsPerSecond > 25) return 1000; // 1 second intervals
    if (pixelsPerSecond > 15) return 2000; // 2 second intervals
    if (pixelsPerSecond > 5) return 5000; // 5 second intervals
    
    return 10000; // 10 second intervals when zoomed out
  }
}
