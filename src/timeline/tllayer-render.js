import { TimelineLayerFactory } from './timeline-layer-factory.js';

/**
 * Class responsible for managing timeline layer rendering using the new TimelineLayer system
 */
export class TimelineLayerRender {
  #layerRenderers;

  /**
   * @param {CanvasRenderingContext2D} ctx - The canvas context to render on
   * @param {number} totalTime - The total time duration of the timeline
   * @param {number} canvasWidth - The width of the timeline canvas
   */
  constructor(ctx, totalTime, canvasWidth) {
    this.ctx = ctx;
    this.totalTime = totalTime;
    this.canvasWidth = canvasWidth;
    this.#layerRenderers = new Map(); // Cache for layer renderers
  }


  /**
   * Update the timeline properties for rendering
   * @param {number} totalTime - The total time duration
   * @param {number} canvasWidth - The canvas width
   */
  updateProperties(totalTime, canvasWidth) {
    this.totalTime = totalTime;
    this.canvasWidth = canvasWidth;
    
    // Update all cached renderers
    for (const renderer of this.#layerRenderers.values()) {
      renderer.updateProperties(totalTime, canvasWidth);
    }
  }

  /**
   * Get or create a timeline layer renderer for the given layer
   * @param {StandardLayer} layer - The layer to get renderer for
   */
  #getLayerRenderer(layer) {
    const layerId = layer.id;
    
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
   * Render a single layer in the timeline
   * @param {StandardLayer} layer - The layer to render
   * @param {number} yPos - The y coordinate to render at
   * @param {number} height - The height of the layer track
   * @param {boolean} selected - Whether the layer is selected
   */
  renderLayer(layer, yPos, height, selected = false) {
    const renderer = this.#getLayerRenderer(layer);
    renderer.render(yPos, height, selected);
  }
}
