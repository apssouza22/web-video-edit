import { LayerReorderHandler } from './layer-reorder-handler';
import type { StandardLayer } from './types';
import {Timeline} from "./timeline";

/**
 * Handles layer dragging and scrubbing in the timeline
 */
export class DragLayerHandler {
  dragging: null | ((time: number, selectedLayer: StandardLayer) => void);
  time: number;
  timeline: any; // Avoid circular type; must provide .intersectsTime(), .minLayerSpacing etc.
  reorderHandler: LayerReorderHandler;
  dragMode: 'horizontal' | 'vertical' | 'none';
  dragStartX: number;
  dragStartY: number;
  dragThreshold: number;
  selectedLayer?: StandardLayer | null;
  initialTime?: number;

  /**
   * @param {Timeline} timeline - The timeline instance
   */
  constructor(timeline: Timeline) {
    this.dragging = null;
    this.time = timeline.time;
    this.timeline = timeline;
    this.reorderHandler = new LayerReorderHandler(timeline);
    this.dragMode = 'none'; // 'horizontal', 'vertical', 'none'
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragThreshold = 10; // Pixels to move before determining drag direction
  }

  dragLayer(time: number, selectedLayer: StandardLayer, currentX: number, currentY: number) {
    if (this.dragMode === 'horizontal' && this.dragging) {
      this.dragging(time, selectedLayer);
      return;
    }
    if (this.dragMode === 'vertical') {
      this.reorderHandler.updateDrag(currentY);
    }
  }

  /**
   * Handle the layer drag operation based on current time position
   */
  startLayerDrag(selectedLayer: StandardLayer, time: number, startX: number, startY: number) {
    this.dragStartX = startX;
    this.dragStartY = startY;
    this.dragMode = 'none';
    
    const endTime = selectedLayer.start_time + selectedLayer.totalTimeInMilSeconds;
    
    // If the click is at the layer's end time, adjust the total time. Change the width of the layer
    if (this.timeline.intersectsTime(endTime, time)) {
      this.dragging = this.#getResizeLayerEndFn(selectedLayer);
      this.dragMode = 'horizontal';
      return;
    }

    // If the click is at the layer's start time, adjust the total time. Change the width of the layer
    if (this.timeline.intersectsTime(selectedLayer.start_time, time)) {
      this.dragging = this.#getMoveLayerStartFn(selectedLayer);
      this.dragMode = 'horizontal';
      return;
    }

    // If the click is within the layer's time, determine drag mode based on movement
    if (time < endTime && time > selectedLayer.start_time) {
      this.selectedLayer = selectedLayer;
      this.initialTime = time;
    }
  }

  /**
   * Determine drag mode based on initial movement
   * @param {number} currentX - Current X coordinate
   * @param {number} currentY - Current Y coordinate
   */
  #determineDragMode(currentX: number, currentY: number) {
    const deltaX = Math.abs(currentX - this.dragStartX);
    const deltaY = Math.abs(currentY - this.dragStartY);
    
    if (deltaX < this.dragThreshold && deltaY < this.dragThreshold) {
      return;
    }
    
    if (deltaX > deltaY) {
      this.dragMode = 'horizontal';
      this.dragging = this.#getMoveEntireLayerFn(this.initialTime!);
    } else {
      this.dragMode = 'vertical';
      this.reorderHandler.startReorder(this.selectedLayer!, this.dragStartY);
    }
  }

  /**
   * Update drag operation with current coordinates
   * @param {number} time - Current time
   * @param {StandardLayer} selectedLayer - Selected layer
   * @param {number} currentX - Current X coordinate
   * @param {number} currentY - Current Y coordinate
   */
  updateDrag(time: number, selectedLayer: StandardLayer, currentX: number, currentY: number) {
    if (this.dragMode === 'none' && this.selectedLayer) {
      this.#determineDragMode(currentX, currentY);
    }
    
    this.dragLayer(time, selectedLayer, currentX, currentY);
  }

  /**
   * Finish the current drag operation
   * @returns {boolean} - Whether a reorder operation was completed
   */
  finishDrag(): boolean {
    let reorderOccurred = false;
    
    if (this.dragMode === 'vertical') {
      reorderOccurred = this.reorderHandler.finishReorder();
    }
    
    this.#resetDrag();
    return reorderOccurred;
  }

  /**
   * Render drag feedback
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderFeedback(ctx: CanvasRenderingContext2D) {
    if (this.dragMode === 'vertical') {
      this.reorderHandler.renderFeedback(ctx);
    }
  }

  /**
   * Reset drag state
   * @private
   */
  #resetDrag() {
    this.dragging = null;
    this.dragMode = 'none';
    this.selectedLayer = null;
    this.initialTime = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
  }

  #getMoveLayerStartFn(selectedLayer: StandardLayer) {
    let baseTime = selectedLayer.start_time;
    return (time: number, selectedLayer: StandardLayer) => {
      let diff = time - baseTime;
      baseTime = time;
      selectedLayer.start_time += diff;
    };
  }

  #getMoveEntireLayerFn(time: number) {
    let baseTime = time;
    return  (t: number, l: StandardLayer) => {
      let diff = t - baseTime;
      baseTime = t;
      l.start_time += diff;
    };
  }

  /**
   * Get the function to resize the layer based on the end time
   * @param {StandardLayer} selectedLayer
   * @returns {(function(*, *): void)|*}
   */
  #getResizeLayerEndFn(selectedLayer: StandardLayer) {
    console.log("Resizing layer:", selectedLayer.name);
    let baseTime = selectedLayer.start_time + selectedLayer.totalTimeInMilSeconds;
    return (time: number, selectedLayer: StandardLayer) => {
      let diff = time - baseTime;
      baseTime = time;
      selectedLayer.adjustTotalTime(diff);
    };
  }

}
