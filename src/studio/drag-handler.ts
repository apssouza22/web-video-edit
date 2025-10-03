import {VideoStudio} from "@/studio/studio";

interface Frame {
  x: number;
  y: number;
}

interface Layer {
  getFrame(time: number): Frame | null;
}

interface Player {
  width: number;
  height: number;
  time: number;
}

interface PinchHandler {
  isGesturing(): boolean;
}

interface Studio {
  player: Player;
  pinchHandler?: PinchHandler;
  getSelectedLayer(): Layer | null;
}

type DragCallback = (x: number, y: number) => void;

/**
 * DragHandler class handles drag operations on moveable layers.
 * It provides unified handling for pointer events to enable dragging elements.
 */
export class DragItemHandler {
  private element: HTMLElement;
  private callback: DragCallback;
  private studio: VideoStudio;
  private dragging: boolean;
  private base_x: number;
  private base_y: number;

  /**
   * Creates a new DragHandler instance
   */
  constructor(element: HTMLElement, callback: DragCallback, studio: VideoStudio) {
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
   */
  get_ratio(elem: HTMLElement): number {
    const c_ratio = elem.clientWidth / elem.clientHeight;
    const target_ratio = this.studio.player.width / this.studio.player.height;
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
   */
  pointerdown(e: PointerEvent): void {
    if (!this.studio.getSelectedLayer()) {
      console.log('No layer selected');
      return;
    }

    e.preventDefault();
    const selectedLayer = this.studio.getSelectedLayer();
    if (!selectedLayer) {
      return;
    }
    
    const f = selectedLayer.getFrame(this.studio.player.time);
    if (!f) {
      return;
    }
    
    this.dragging = true;
    const target = e.target as HTMLElement;
    this.base_x = e.offsetX * this.get_ratio(target) - f.x;
    this.base_y = e.offsetY * this.get_ratio(target) - f.y;
    window.addEventListener('pointerup', this.pointerup, {
      once: true
    });
  }

  /**
   * Handles pointer move events
   */
  pointermove(e: PointerEvent): void {
    if (this.studio.pinchHandler && this.studio.pinchHandler.isGesturing()) {
      return; 
    }

    e.preventDefault();
    e.stopPropagation();
    if (this.dragging) {
      const target = e.target as HTMLElement;
      const dx = e.offsetX * this.get_ratio(target) - this.base_x;
      const dy = e.offsetY * this.get_ratio(target) - this.base_y;

      this.callback(dx, dy);
    }
  }

  /**
   * Handles pointer up events
   */
  pointerup(e: PointerEvent): void {
    this.dragging = false;
    e.preventDefault();
  }

  /**
   * Sets up all event listeners
   */
  setupEventListeners(): void {
    this.element.addEventListener('pointerdown', this.pointerdown);
    this.element.addEventListener('pointermove', this.pointermove, { passive: false });
  }
}
