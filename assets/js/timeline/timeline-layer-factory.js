import { AudioTimelineLayer } from './layers/audio-timeline-layer.js';
import { VideoTimelineLayer } from './layers/video-timeline-layer.js';
import { ImageTimelineLayer } from './layers/image-timeline-layer.js';
import { TextTimelineLayer } from './layers/text-timeline-layer.js';

/**
 * Factory class for creating timeline layer renderers
 */
export class TimelineLayerFactory {
  /**
   * Create a timeline layer renderer based on the layer type
   * @param {CanvasRenderingContext2D} ctx - The canvas context to render on
   * @param {StandardLayer} layer - The layer data to render
   * @param {number} totalTime - The total time duration of the timeline
   * @param {number} canvasWidth - The width of the timeline canvas
   * @returns {TimelineLayer} - The appropriate timeline layer renderer
   */
  static createTimelineLayer(ctx, layer, totalTime, canvasWidth) {
    const layerType = layer.constructor.name;

    switch (layerType) {
      case 'AudioLayer':
        return new AudioTimelineLayer(ctx, layer, totalTime, canvasWidth);
      case 'VideoLayer':
        return new VideoTimelineLayer(ctx, layer, totalTime, canvasWidth);
      case 'ImageLayer':
        return new ImageTimelineLayer(ctx, layer, totalTime, canvasWidth);
      case 'TextLayer':
        return new TextTimelineLayer(ctx, layer, totalTime, canvasWidth);
      default:
        console.warn(`Unknown layer type: ${layerType}, defaulting to TextTimelineLayer`);
        return new TextTimelineLayer(ctx, layer, totalTime, canvasWidth);
    }
  }

  /**
   * Get all available timeline layer types
   * @returns {Array<string>} - Array of supported layer type names
   */
  static getSupportedLayerTypes() {
    return ['AudioLayer', 'VideoLayer', 'ImageLayer', 'TextLayer'];
  }
}
