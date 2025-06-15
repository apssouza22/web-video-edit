import { FlexibleLayer } from '../layer';

/**
 * DragHandler class handles drag operations on moveable layers.
 * It provides unified handling for pointer events to enable dragging elements.
 */
export class DragItemHandler {
  /**
   * Creates a new DragHandler instance
   * 
   * @param {HTMLElement} element - The DOM element to attach the handler to
   * @param {Function} callback - Callback function that receives x and y movement values
   * @param {VideoStudio} studio - The studio in which the callback will be executed
   */
  constructor(element, callback, studio) {
    this.element = element;
    this.callback = callback;
    this.studio = studio;
    this.dragging = false;
    this.base_x = 0;
    this.base_y = 0;

    // Bind event handlers to maintain studio
    this.pointerdown = this.pointerdown.bind(this);
    this.pointermove = this.pointermove.bind(this);
    this.pointerup = this.pointerup.bind(this);
  }

  /**
   * Gets the ratio of player pixels to client pixels
   * 
   * @param {HTMLElement} elem - The element to calculate ratio for
   * @returns {number} The ratio value
   */
  get_ratio(elem) {
    let c_ratio = elem.clientWidth / elem.clientHeight;
    let target_ratio = this.studio.player.width / this.studio.player.height;
    // how many player pixels per client pixels
    let ratio = 1;
    if (c_ratio > target_ratio) { // client is wider than player
      ratio = this.studio.player.height / elem.clientHeight;
    } else {
      ratio = this.studio.player.width / elem.clientWidth;
    }
    return ratio;
  }

  /**
   * Handles pointer down events
   * 
   * @param {PointerEvent} e - The pointer event
   */
  pointerdown(e) {
    if (!this.studio.getSelectedLayer()) {
      console.log('No layer selected');
      return;
    }
    if (!(this.studio.getSelectedLayer() instanceof FlexibleLayer)) {
      console.log('Selected layer is not a FlexibleLayer');
      return;
    }
    e.preventDefault();
    let f = this.studio.getSelectedLayer().getFrame(this.studio.player.time);
    if (!f) {
      return;
    }
    this.dragging = true;
    this.base_x = e.offsetX * this.get_ratio(e.target) - f[0];
    this.base_y = e.offsetY * this.get_ratio(e.target) - f[1];
    window.addEventListener('pointerup', this.pointerup, {
      once: true
    });
  }

  /**
   * Handles pointer move events
   * 
   * @param {PointerEvent} e - The pointer event
   */
  pointermove(e) {
    // Check if any pinch handler is currently gesturing
    if (this.studio.pinchHandler && this.studio.pinchHandler.isGesturing()) {
      return; 
    }

    e.preventDefault();
    e.stopPropagation();
    if (this.dragging) {
      let dx = e.offsetX * this.get_ratio(e.target) - this.base_x;
      let dy = e.offsetY * this.get_ratio(e.target) - this.base_y;
      this.callback(dx, dy);
    }
  }

  /**
   * Handles pointer up events
   * 
   * @param {PointerEvent} e - The pointer event
   */
  pointerup(e) {
    this.dragging = false;
    e.preventDefault();
  }

  /**
   * Sets up all event listeners
   */
  setupEventListeners() {
    this.element.addEventListener('pointerdown', this.pointerdown);
    this.element.addEventListener('pointermove', this.pointermove, { passive: false });
  }

  /**
   * Removes all event listeners
   */
  destroy() {
    this.element.removeEventListener('pointerdown', this.pointerdown);
    this.element.removeEventListener('pointermove', this.pointermove);
    window.removeEventListener('pointerup', this.pointerup);
  }

  /**
   * Checks if the handler is currently dragging
   * 
   * @returns {boolean} True if dragging is in progress
   */
  isDragging() {
    return this.dragging;
  }
}
