import { TimelineLayerFactory } from './timeline-layer-factory';
import type { IClipTl } from '../types';
import type { TimelineLayer } from './timeline-layer';
import {AbstractMedia} from "@/mediaclip";

/**
 * Class responsible for managing timeline media rendering using the new TimelineLayer system
 */
export class TimelineLayerRender {
  ctx: CanvasRenderingContext2D;
  totalTime: number;
  canvasWidth: number;
  #layerRenderers: Map<string | number, TimelineLayer>;

  /**
   * @param {CanvasRenderingContext2D} ctx - The canvas context to render on
   * @param {number} totalTime - The total time duration of the timeline
   * @param {number} canvasWidth - The width of the timeline canvas
   */
  constructor(ctx: CanvasRenderingContext2D, totalTime: number, canvasWidth: number) {
    this.ctx = ctx;
    this.totalTime = totalTime;
    this.canvasWidth = canvasWidth;
    this.#layerRenderers = new Map(); // Cache for media renderers
  }


  /**
   * Update the timeline properties for rendering
   * @param {number} totalTime - The total time duration
   * @param {number} canvasWidth - The canvas width
   */
  updateProperties(totalTime: number, canvasWidth: number) {
    this.totalTime = totalTime;
    this.canvasWidth = canvasWidth;
    
    // Update all cached renderers
    for (const renderer of this.#layerRenderers.values()) {
      renderer.updateProperties(totalTime, canvasWidth);
    }
  }

  /**
   * Get or create a timeline media renderer for the given media
   * @param {IClipTl} layer - The media to get renderer for
   */
  #getLayerRenderer(layer: AbstractMedia) {
    const layerId = layer.id + '-' + layer.getTotalFrames();
    
    if (!this.#layerRenderers.has(layerId)) {
      const renderer = TimelineLayerFactory.createTimelineLayer(
        this.ctx, 
        layer, 
        this.totalTime, 
        this.canvasWidth
      );
      this.#layerRenderers.set(layerId, renderer);
    }
    
    return this.#layerRenderers.get(layerId);
  }

  /**
   * Render a single media in the timeline
   * @param {IClipTl} layer - The media to render
   * @param {number} yPos - The y coordinate to render at
   * @param {number} height - The height of the media track
   * @param {boolean} selected - Whether the media is selected
   */
  renderLayer(layer: AbstractMedia, yPos: number, height: number, selected: boolean = false) {
    if(layer.totalTimeInMilSeconds === 0) {
      return;
    }
    const renderer = this.#getLayerRenderer(layer);
    if(renderer) {
      renderer.render(yPos, height, selected);
    }
  }
}
