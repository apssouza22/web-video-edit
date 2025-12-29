import type {CursorState, IClipTl} from "./types";

type DragStatus = 'started' | 'finished' | 'none';
type DragMode = "horizontal" | "vertical" | "none";

/**
 * Centralizes cursor state management for the timeline.
 * Works alongside DragLayerHandler to provide a unified API for cursor queries.
 */
export class TimelineCursor {
  private currentTime: number;
  private dragStatus: DragStatus;
  private selectedLayer: IClipTl | null;
  private dragStartX: number;
  private dragStartY: number;
  private dragThreshold: number;
  private currentX: number = 0;
  private currentY: number = 0;

  constructor() {
    this.currentTime = 0;
    this.dragStatus = 'none';
    this.selectedLayer = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragThreshold = 10; // Pixels to move before determining drag direction
  }

  /**
   * Start drag operation - determines initial drag mode based on click position
   */
  startDrag(startX: number, startY: number): void {
    if (!this.selectedLayer) {
      return;
    }
    this.dragStartX = startX;
    this.dragStartY = startY;
    this.dragStatus = 'started';
  }

  /**
   * Update drag position and determine drag mode if not yet determined
   */
  updateData(time: number, selectedClip:IClipTl, currentX: number, currentY: number): void {
    this.currentTime = time;
    this.selectedLayer = selectedClip;
    this.currentX = currentX;
    this.currentY = currentY;
  }

  /**
   * Determine drag mode based on initial movement
   */
  #determineDragMode(currentX: number, currentY: number): DragMode {
    const deltaX = Math.abs(currentX - this.dragStartX);
    const deltaY = Math.abs(currentY - this.dragStartY);

    if (deltaX < this.dragThreshold && deltaY < this.dragThreshold) {
      return "none";
    }

    if (this.dragStatus !== 'started') {
      return "none";
    }

    if (deltaX > deltaY) {
      return 'horizontal';
    } else {
      return 'vertical';
    }
  }

  /**
   * Notify cursor that drag has finished
   */
  notifyDragFinished(): void {
    this.dragStatus = 'finished';
    // Reset to 'none' after a brief moment to allow consumers to read the finished state
    setTimeout(() => {
      if (this.dragStatus === 'finished') {
        this.dragStatus = 'none';
      }
    }, 1);
  }

  /**
   * Check if query time intersects with time (1% threshold)
   */
  private intersectsTime(time: number, query: number): boolean {
    return Math.abs(query - time) / this.selectedLayer!.totalTimeInMilSeconds < 0.01;
  }

  /**
   * Check if cursor is over left handle
   */
  private isOverLeftHandle(): boolean {
    if (!this.selectedLayer) {
      return false;
    }
    return this.intersectsTime(this.selectedLayer.startTime, this.currentTime);
  }

  /**
   * Check if cursor is over right handle
   */
  private isOverRightHandle(): boolean {
    if (!this.selectedLayer) {
      return false;
    }
    const endTime = this.selectedLayer.startTime + this.selectedLayer.totalTimeInMilSeconds;
    return this.intersectsTime(endTime, this.currentTime);
  }

  /**
   * Check if cursor is over layer body (not on handles)
   */
  private isOverSelectedLayerBody(): boolean {
    if (!this.selectedLayer) {
      return false;
    }

    const startTime = this.selectedLayer.startTime;
    const endTime = startTime + this.selectedLayer.totalTimeInMilSeconds;

    return this.currentTime > startTime &&
           this.currentTime < endTime &&
           !this.isOverLeftHandle() &&
           !this.isOverRightHandle();
  }

  /**
   * Get the current cursor state
   * @returns {CursorState} Complete cursor state object
   */
  getCursorState(): CursorState {
    const dragMode = this.#determineDragMode(this.currentX, this.currentY);
    return {
      dragMode: dragMode,
      dragStatus: this.dragStatus,
      isOverLeftHandle: this.isOverLeftHandle(),
      isOverRightHandle: this.isOverRightHandle(),
      isOverSelectedLayer: this.isOverSelectedLayerBody(),
      cssCursor: this.getCSSCursor(dragMode)
    };
  }

  /**
   * Get the appropriate CSS cursor string based on current state
   * @returns {string} CSS cursor value
   */
  private getCSSCursor(dragMode: string): string {
    // Priority 1: Active drag operations
    if (dragMode === 'vertical') {
      return 'ns-resize';
    }
    if (dragMode === 'horizontal') {
      return 'ew-resize';
    }

    if (this.isOverRightHandle()) {
      return 'col-resize';
    }

    if (this.isOverLeftHandle()) {
      return 'grab';
    }

    // Priority 3: Layer hover state
    if (this.isOverSelectedLayerBody()) {
      return 'grab';
    }

    // Default
    return 'default';
  }

  /**
   * Finish drag operation
   */
  finishDrag(): void {
    this.notifyDragFinished();
    this.selectedLayer = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
  }
}
