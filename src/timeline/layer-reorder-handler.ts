/**
 * Handles media reordering through vertical drag operations in the timeline
 */
import type { MediaInterface } from './types';
import {Timeline} from "./timeline";

export class LayerReorderHandler {
  timeline: any; // Uses properties from Timeline; avoid circular types
  isDragging: boolean;
  draggedLayer: MediaInterface | null;
  dragStartY: number;
  currentDropIndex: number;
  dropZones: Array<{ y: number; index: number; isTop: boolean }>;
  layerPreviewY: number;

  /**
   * @param {Timeline} timeline - The timeline instance
   */
  constructor(timeline: Timeline) {
    this.timeline = timeline;
    this.isDragging = false;
    this.draggedLayer = null;
    this.dragStartY = 0;
    this.currentDropIndex = -1;
    this.dropZones = [];
    this.layerPreviewY = 0;
  }

  /**
   * Start vertical media reordering drag operation
   * @param {MediaInterface} layer - The media being dragged
   * @param {number} startY - Initial Y coordinate
   */
  startReorder(layer: MediaInterface, startY: number) {
    this.isDragging = true;
    this.draggedLayer = layer;
    this.dragStartY = startY;
    this.layerPreviewY = startY;
    this.#calculateDropZones();
    this.currentDropIndex = this.#findCurrentLayerIndex(layer);
  }

  /**
   * Update drag position and calculate drop target
   * @param {number} currentY - Current Y coordinate
   */
  updateDrag(currentY: number) {
    if (!this.isDragging) return;

    this.layerPreviewY = currentY;
    this.currentDropIndex = this.#calculateDropIndex(currentY);
  }

  /**
   * Complete the reorder operation
   * @returns {boolean} - Whether reordering occurred
   */
  finishReorder(): boolean {
    if (!this.isDragging || this.currentDropIndex === -1) {
      this.#resetDrag();
      return false;
    }

    const originalIndex = this.#findCurrentLayerIndex(this.draggedLayer!);
    
    if (originalIndex !== this.currentDropIndex && this.currentDropIndex >= 0) {
      this.#reorderLayer(originalIndex, this.currentDropIndex);
      this.#resetDrag();
      return true;
    }

    this.#resetDrag();
    return false;
  }

  /**
   * Cancel the current drag operation
   */
  cancelReorder() {
    this.#resetDrag();
  }

  /**
   * Render visual feedback for the reorder operation
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderFeedback(ctx: CanvasRenderingContext2D) {
    if (!this.isDragging) return;

    this.#renderDropZones(ctx);
    this.#renderLayerPreview(ctx);
  }

  #calculateDropZones() {
    this.dropZones = [];
    const layers = this.timeline.layers;
    let yPos = this.timeline.timeMarker.height + this.timeline.contentPadding;

    // Add drop zone at the top
    this.dropZones.push({
      y: yPos,
      index: 0,
      isTop: true
    });

    // Add drop zones between medias
    for (let i = 0; i < layers.length; i++) {
      const layerHeight = this.timeline.getLayerHeight(layers[i]);
      const layerSpacing = this.timeline.minLayerSpacing + layerHeight;
      
      yPos += layerSpacing;
      if (i < layers.length - 1) {
        this.dropZones.push({
          y: yPos - layerSpacing / 2,
          index: i + 1,
          isTop: false
        });
      }
    }

    // Add drop zone at the bottom
    this.dropZones.push({
      y: yPos,
      index: layers.length,
      isTop: false
    });
  }

  /**
   * Calculate which drop index the current Y position corresponds to
   * @param {number} currentY - Current Y coordinate
   * @returns {number} - Drop index
   * @private
   */
  #calculateDropIndex(currentY: number) {
    let closestIndex = -1;
    let closestDistance = Infinity;

    for (let i = 0; i < this.dropZones.length; i++) {
      const distance = Math.abs(currentY - this.dropZones[i].y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = this.dropZones[i].index;
      }
    }

    // Don't allow dropping in the same position
    const originalIndex = this.#findCurrentLayerIndex(this.draggedLayer!);
    if (closestIndex === originalIndex || closestIndex === originalIndex + 1) {
      return -1;
    }

    return closestIndex;
  }

  /**
   * Find the current index of a media in the timeline
   * @param {MediaInterface} layer - The media to find
   * @returns {number} - Layer index
   * @private
   */
  #findCurrentLayerIndex(layer: MediaInterface) {
    return this.timeline.layers.indexOf(layer);
  }


  #reorderLayer(fromIndex: number, toIndex: number) {
    const layers = this.timeline.layers;
    const layer = layers.splice(fromIndex, 1)[0];
    
    // Adjust target index if we removed an element before it
    const adjustedToIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
    layers.splice(adjustedToIndex, 0, layer);

    // Notify the timeline about the reorder
    if (this.timeline.layerUpdateListener) {
      this.timeline.layerUpdateListener('reorder', layer, null, { 
        fromIndex, 
        toIndex: adjustedToIndex 
      });
    }
  }

  /**
   * Render drop zone indicators
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @private
   */
  #renderDropZones(ctx: CanvasRenderingContext2D) {
    const activeDropIndex = this.currentDropIndex;
    
    for (let i = 0; i < this.dropZones.length; i++) {
      const zone = this.dropZones[i];
      const isActive = zone.index === activeDropIndex;
      
      ctx.strokeStyle = isActive ? 'rgba(0, 150, 255, 0.8)' : 'rgba(100, 100, 100, 0.3)';
      ctx.lineWidth = isActive ? 3 : 1;
      ctx.setLineDash(isActive ? [] : [5, 5]);
      
      ctx.beginPath();
      ctx.moveTo(0, zone.y);
      ctx.lineTo(this.timeline.timelineCanvas.clientWidth, zone.y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]); // Reset line dash
  }

  /**
   * Render preview of the dragged media
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @private
   */
  #renderLayerPreview(ctx: CanvasRenderingContext2D) {
    if (!this.draggedLayer) return;

    const layerHeight = this.timeline.getLayerHeight(this.draggedLayer);
    const previewY = this.layerPreviewY;
    
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
    ctx.fillRect(0, previewY - layerHeight / 2, 
                this.timeline.timelineCanvas.clientWidth, layerHeight);
    
    // Border
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(0, previewY - layerHeight / 2, 
                  this.timeline.timelineCanvas.clientWidth, layerHeight);
    
    ctx.setLineDash([]); // Reset line dash
    
    // Layer name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(this.draggedLayer.name!, 10, previewY + 4);
  }

  /**
   * Reset drag state
   * @private
   */
  #resetDrag() {
    this.isDragging = false;
    this.draggedLayer = null;
    this.dragStartY = 0;
    this.currentDropIndex = -1;
    this.dropZones = [];
    this.layerPreviewY = 0;
  }
}
