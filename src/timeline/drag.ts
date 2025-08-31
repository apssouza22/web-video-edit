import { LayerReorderHandler } from './layer-reorder-handler';

/**
 * Handles layer dragging and scrubbing in the timeline
 */
export class DragLayerHandler {

  /**
   * @param {Timeline} timeline - The timeline instance
   */
  constructor(timeline) {
    this.dragging = null;
    this.time = timeline.time;
    this.timeline = timeline;
    this.reorderHandler = new LayerReorderHandler(timeline);
    this.dragMode = 'none'; // 'horizontal', 'vertical', 'none'
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragThreshold = 10; // Pixels to move before determining drag direction
  }

  dragLayer(time, selectedLayer, currentX, currentY) {
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
  startLayerDrag(selectedLayer, time, startX, startY) {
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
  #determineDragMode(currentX, currentY) {
    const deltaX = Math.abs(currentX - this.dragStartX);
    const deltaY = Math.abs(currentY - this.dragStartY);
    
    if (deltaX < this.dragThreshold && deltaY < this.dragThreshold) {
      return;
    }
    
    if (deltaX > deltaY) {
      this.dragMode = 'horizontal';
      this.dragging = this.#getMoveEntireLayerFn(this.initialTime);
    } else {
      this.dragMode = 'vertical';
      this.reorderHandler.startReorder(this.selectedLayer, this.dragStartY);
    }
  }

  /**
   * Update drag operation with current coordinates
   * @param {number} time - Current time
   * @param {StandardLayer} selectedLayer - Selected layer
   * @param {number} currentX - Current X coordinate
   * @param {number} currentY - Current Y coordinate
   */
  updateDrag(time, selectedLayer, currentX, currentY) {
    if (this.dragMode === 'none' && this.selectedLayer) {
      this.#determineDragMode(currentX, currentY);
    }
    
    this.dragLayer(time, selectedLayer, currentX, currentY);
  }

  /**
   * Finish the current drag operation
   * @returns {boolean} - Whether a reorder operation was completed
   */
  finishDrag() {
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
  renderFeedback(ctx) {
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

  #getMoveLayerStartFn(selectedLayer) {
    let baseTime = selectedLayer.start_time;
    return (time, selectedLayer) => {
      let diff = time - baseTime;
      baseTime = time;
      selectedLayer.start_time += diff;
    };
  }

  #getMoveEntireLayerFn(time) {
    let baseTime = time;
    return  (t, l) => {
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
  #getResizeLayerEndFn(selectedLayer) {
    console.log("Resizing layer:", selectedLayer.name);
    let baseTime = selectedLayer.start_time + selectedLayer.totalTimeInMilSeconds;
    return (time, selectedLayer) => {
      let diff = time - baseTime;
      baseTime = time;
      selectedLayer.adjustTotalTime(diff);
    };
  }

}
