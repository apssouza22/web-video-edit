import {AudioTimelineLayer} from './audio-timeline-layer';
import {VideoTimelineLayer} from './video-timeline-layer';
import {ImageTimelineLayer} from './image-timeline-layer';
import {TextTimelineLayer} from './text-timeline-layer';
import {CaptionTimelineLayer} from './caption-timeline-layer';
import {ShapeTimelineLayer} from './shape-timeline-layer';
import type {TimelineLayer} from './timeline-layer';
import {ComposedMedia, ShapeMedia} from "@/mediaclip";
import {VideoMedia} from "@/mediaclip/video";
import {AudioMedia} from "@/mediaclip/audio";
import {ImageMedia} from "@/mediaclip/image";
import {CaptionMedia} from "@/mediaclip/caption";
import {ComposedTimelineLayer} from "@/timeline/layers/composed-timeline-layer";
import {IClipTl} from "@/timeline/types";

/**
 * Factory class for creating timeline media renderers
 */
export class TimelineLayerFactory {
  /**
   * Create a timeline media renderer based on the media type
   * @param {CanvasRenderingContext2D} ctx - The canvas context to render on
   * @param {IClipTl} layer - The media data to render
   * @param {number} totalTime - The total time duration of the timeline
   * @param {number} canvasWidth - The width of the timeline canvas
   * @returns {TimelineLayer} - The appropriate timeline media renderer
   */
  static createTimelineLayer(
    ctx: CanvasRenderingContext2D,
    layer: IClipTl,
    totalTime: number,
    canvasWidth: number
  ): TimelineLayer {
    if(layer instanceof AudioMedia) {
      return new AudioTimelineLayer(ctx, layer, totalTime, canvasWidth);
    }
    if(layer instanceof VideoMedia) {
      return new VideoTimelineLayer(ctx, layer, totalTime, canvasWidth);
    }
    if (layer instanceof ImageMedia) {
      return new ImageTimelineLayer(ctx, layer, totalTime, canvasWidth);
    }
    if (layer instanceof CaptionMedia) {
      return new CaptionTimelineLayer(ctx, layer, totalTime, canvasWidth);
    }
    if (layer instanceof ShapeMedia) {
      return new ShapeTimelineLayer(ctx, layer, totalTime, canvasWidth);
    }
    if (layer instanceof ComposedMedia) {
      return new ComposedTimelineLayer(ctx, layer, totalTime, canvasWidth);
    }
    return new TextTimelineLayer(ctx, layer, totalTime, canvasWidth);
  }
}
