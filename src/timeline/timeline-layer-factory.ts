import { AudioTimelineLayer } from './layers/audio-timeline-layer';
import { VideoTimelineLayer } from './layers/video-timeline-layer';
import { ImageTimelineLayer } from './layers/image-timeline-layer';
import { TextTimelineLayer } from './layers/text-timeline-layer';
import type { MediaInterface } from './types';
import type { TimelineLayer } from './timeline-layer';

/**
 * Factory class for creating timeline media renderers
 */
export class TimelineLayerFactory {
  /**
   * Create a timeline media renderer based on the media type
   * @param {CanvasRenderingContext2D} ctx - The canvas context to render on
   * @param {MediaInterface} layer - The media data to render
   * @param {number} totalTime - The total time duration of the timeline
   * @param {number} canvasWidth - The width of the timeline canvas
   * @returns {TimelineLayer} - The appropriate timeline media renderer
   */
  static createTimelineLayer(
    ctx: CanvasRenderingContext2D,
    layer: MediaInterface,
    totalTime: number,
    canvasWidth: number
  ): TimelineLayer {
    const layerType = layer.constructor.name;

    switch (layerType) {
      case 'AudioMedia':
        return new AudioTimelineLayer(ctx, layer, totalTime, canvasWidth);
      case 'VideoMedia':
        return new VideoTimelineLayer(ctx, layer, totalTime, canvasWidth);
      case 'ImageMedia':
        return new ImageTimelineLayer(ctx, layer, totalTime, canvasWidth);
      case 'TextMedia':
        return new TextTimelineLayer(ctx, layer, totalTime, canvasWidth);
      default:
        console.warn(`Unknown layer type: ${layerType}, defaulting to TextTimelineLayer`);
        return new TextTimelineLayer(ctx, layer, totalTime, canvasWidth);
    }
  }
}
