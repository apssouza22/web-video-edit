import {LayerReorderHandler} from './layer-reorder-handler';
import type {CursorState, IClipTl} from './types';
import {Timeline} from "./timeline";
import {ResizableClip} from "@/mediaclip/media-common";

/**
 * Handles media dragging and scrubbing in the timeline.
 */
export class DragLayerHandler {
  dragging: null | ((time: number, selectedLayer: IClipTl) => void);
  reorderHandler: LayerReorderHandler;
  private dragStartY: number;

  /**
   * @param {Timeline} timeline - The timeline instance
   */
  constructor(timeline: Timeline) {
    this.dragging = null;
    this.reorderHandler = new LayerReorderHandler(timeline);
    this.dragStartY = 0;
  }

  dragLayer(time: number, selectedLayer: IClipTl, currentY: number, cursorState: CursorState) {
    if (cursorState.dragMode === 'horizontal' && this.dragging) {
      this.dragging(time, selectedLayer);
      return;
    }
    if (cursorState.dragMode === 'vertical') {
      this.reorderHandler.updateDrag(currentY);
    }
  }

  /**
   * Handle the media drag operation based on current time position
   */
  startLayerDrag(selectedLayer: IClipTl, time: number, startY: number, cursorState: CursorState) {
    this.dragStartY = startY;
    this.dragging = null;
    if (cursorState.isOverRightHandle) {
      this.dragging = this.#getResizeLayerEndFn(selectedLayer);
      return;
    }

    // If clicking on left handle, move start time
    if (cursorState.isOverLeftHandle) {
      this.dragging = this.#getMoveLayerStartFn(selectedLayer);
      return;
    }

    // If clicking within the layer body, prepare to move entire layer or reorder
    if (cursorState.isOverSelectedLayer) {
      this.dragging = this.#getMoveEntireLayerFn(time);
    }
  }

  /**
   * Update drag operation with current coordinates
   * @param {number} time - Current time
   * @param {IClipTl} selectedLayer - Selected media
   * @param {number} currentY - Current Y coordinate
   * @param {CursorState} cursorState - Current cursor state from TimelineCursor
   */
  updateDrag(time: number, selectedLayer: IClipTl, currentY: number, cursorState: CursorState) {
    if (cursorState.dragMode === 'vertical' && cursorState.dragStatus === 'started') {
      if (!this.reorderHandler.isDragging) {
        this.reorderHandler.startReorder(selectedLayer, this.dragStartY);
      }
    }

    this.dragLayer(time, selectedLayer, currentY, cursorState);
  }

  /**
   * Finish the current drag operation
   * @param {CursorState} cursorState - Current cursor state
   * @returns {boolean} - Whether a reorder operation was completed
   */
  finishDrag(cursorState: CursorState): boolean {
    let reorderOccurred = false;

    if (cursorState.dragMode === 'vertical') {
      reorderOccurred = this.reorderHandler.finishReorder();
    }

    this.#resetDrag();
    return reorderOccurred;
  }

  /**
   * Render drag feedback
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {CursorState} cursorState - Current cursor state
   */
  renderFeedback(ctx: CanvasRenderingContext2D, cursorState: CursorState) {
    if (cursorState.dragMode === 'vertical') {
      this.reorderHandler.renderFeedback(ctx);
    }
  }

  /**
   * Reset drag state
   * @private
   */
  #resetDrag() {
    this.dragging = null;
    this.dragStartY = 0;
  }

  #getMoveLayerStartFn(selectedLayer: IClipTl) {
    let baseTime = selectedLayer.startTime;
    return (time: number, selectedLayer: IClipTl) => {
      let diff = time - baseTime;
      baseTime = time;
      selectedLayer.startTime += diff;
    };
  }

  #getMoveEntireLayerFn(time: number) {
    let baseTime = time;
    return  (t: number, l: IClipTl) => {
      let diff = t - baseTime;
      baseTime = t;
      l.startTime += diff;
    };
  }

  /**
   * Get the function to resize the media based on the end time
   * @param {IClipTl} selectedLayer
   * @returns {(function(*, *): void)|*}
   */
  #getResizeLayerEndFn(selectedLayer: IClipTl) {
    if (!(selectedLayer instanceof ResizableClip)) {
      console.log("Media is not resizable:", selectedLayer.name);
      return () => {};
    }
    console.log("Resizing media:", selectedLayer.name);
    let baseTime = selectedLayer.startTime + selectedLayer.totalTimeInMilSeconds;
    return (time: number, selectedLayer: IClipTl) => {
      let diff = time - baseTime;
      baseTime = time;
      selectedLayer.adjustTotalTime(diff);
    };
  }

}
