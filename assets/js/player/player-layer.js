import { StandardLayer } from '../layer/index.js';
import {createUserMediaRecordingService} from "../record/index.js";

export class PlayerLayer {
  #layer;
  #selected = false;
  #canvas;
  #ctx;
  #transforming = false;
  #transformType = null; // 'move', 'resize', 'rotate'
  #dragStart = { x: 0, y: 0 };
  #initialTransform = null;
  #handles = [];
  #rotationHandle = null;
  #onTransformCallback = null;
  #currentTime = 0;
  #contentScaleFactor = 0.9; // Match the scale factor from VideoPlayer

  // Handle types and positions
  static HANDLE_TYPES = {
    RESIZE_NW: 'resize-nw',
    RESIZE_N: 'resize-n', 
    RESIZE_NE: 'resize-ne',
    RESIZE_E: 'resize-e',
    RESIZE_SE: 'resize-se',
    RESIZE_S: 'resize-s',
    RESIZE_SW: 'resize-sw',
    RESIZE_W: 'resize-w',
    ROTATE: 'rotate'
  };

  /**
   * Class to handle transformations of a layer in the player.
   * @param {StandardLayer} layer
   * @param {HTMLCanvasElement} canvas - The player canvas
   */
  constructor(layer, canvas) {
    this.#layer = layer;
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#initializeHandles();
    this.#setupEventListeners();
  }

  /**
   * Returns the layer associated with this PlayerLayer instance.
   * @returns {StandardLayer}
   */
  get layer() {
    return this.#layer;
  }

  set selected(value) {
    this.#selected = value;
  }

  /**
   * Set transformation callback
   * @param {Function} callback - Called when layer is transformed
   */
  setTransformCallback(callback) {
    this.#onTransformCallback = callback;
  }

  /**
   * Initialize transformation handles
   */
  #initializeHandles() {
    this.#handles = [
      { type: PlayerLayer.HANDLE_TYPES.RESIZE_NW, cursor: 'nw-resize' },
      { type: PlayerLayer.HANDLE_TYPES.RESIZE_N, cursor: 'n-resize' },
      { type: PlayerLayer.HANDLE_TYPES.RESIZE_NE, cursor: 'ne-resize' },
      { type: PlayerLayer.HANDLE_TYPES.RESIZE_E, cursor: 'e-resize' },
      { type: PlayerLayer.HANDLE_TYPES.RESIZE_SE, cursor: 'se-resize' },
      { type: PlayerLayer.HANDLE_TYPES.RESIZE_S, cursor: 's-resize' },
      { type: PlayerLayer.HANDLE_TYPES.RESIZE_SW, cursor: 'sw-resize' },
      { type: PlayerLayer.HANDLE_TYPES.RESIZE_W, cursor: 'w-resize' }
    ];

    this.#rotationHandle = {
      type: PlayerLayer.HANDLE_TYPES.ROTATE,
      cursor: 'grab'
    };
  }

  /**
   * Setup event listeners for transformation
   */
  #setupEventListeners() {
    this.#canvas.addEventListener('pointerdown', this.#onPointerDown.bind(this));
    this.#canvas.addEventListener('pointermove', this.#onPointerMove.bind(this));
    this.#canvas.addEventListener('pointerup', this.#onPointerUp.bind(this));
    this.#canvas.addEventListener('pointerleave', this.#onPointerUp.bind(this));
  }

  /**
   * Handle pointer down events
   * @param {PointerEvent} event
   */
  #onPointerDown(event) {
    if (!this.#selected) return;
    const {canvasX, canvasY} = this.#getPosition(event);

    const hitResult = this.#hitTest(canvasX, canvasY);
    
    if (hitResult) {
      this.#transforming = true;
      this.#transformType = hitResult.type;
      this.#dragStart = { x: canvasX, y: canvasY };
      this.#initialTransform = this.#getCurrentTransform();
      
      // Set cursor
      this.#canvas.style.cursor = hitResult.cursor;
      event.preventDefault();
    }
  }

  #getPosition(event) {
    const rect = this.#canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to canvas coordinates
    const canvasX = x * (this.#canvas.width / rect.width);
    const canvasY = y * (this.#canvas.height / rect.height);
    
    // The layer is scaled down 10%, // so we need to adjust the coordinates accordingly
    const offsetX = (this.#canvas.width * (1 - this.#contentScaleFactor)) / 2;
    const offsetY = (this.#canvas.height * (1 - this.#contentScaleFactor)) / 2;
    
    const scaledX = (canvasX - offsetX) / this.#contentScaleFactor;
    const scaledY = (canvasY - offsetY) / this.#contentScaleFactor;
    
    return {canvasX: scaledX, canvasY: scaledY};
  }

  /**
   * Handle pointer move events
   * @param {PointerEvent} event
   */
  #onPointerMove(event) {
    const {canvasX, canvasY} = this.#getPosition(event);
    if (this.#transforming) {
      this.#performTransformation(canvasX, canvasY);
      return;
    }

    if (this.#selected) {
      const hitResult = this.#hitTest(canvasX, canvasY);
      this.#canvas.style.cursor = hitResult ? hitResult.cursor : 'default';
    }
  }

  /**
   * Handle pointer up events
   */
  #onPointerUp() {
    if (this.#transforming) {
      this.#transforming = false;
      this.#transformType = null;
      this.#canvas.style.cursor = 'default';
      
      // Notify callback of transformation completion
      if (this.#onTransformCallback) {
        this.#onTransformCallback(this.#layer);
      }
    }
  }

  /**
   * Perform transformation based on current drag
   * @param {number} currentX
   * @param {number} currentY
   */
  #performTransformation(currentX, currentY) {
    const dx = currentX - this.#dragStart.x;
    const dy = currentY - this.#dragStart.y;

    switch (this.#transformType) {
      case 'move':
        this.#performMove(dx, dy);
        break;
      case PlayerLayer.HANDLE_TYPES.ROTATE:
        this.#performRotation(currentX, currentY);
        break;
      default:
        if (this.#transformType.startsWith('resize-')) {
          this.#performResize(dx, dy, this.#transformType);
        }
        break;
    }
  }

  /**
   * Perform move transformation
   * @param {number} dx
   * @param {number} dy
   */
  #performMove(dx, dy) {
    const frame = this.#layer.getFrame(this.#currentTime);
    if (frame) {
      this.#layer.update({
        x: this.#initialTransform.x + dx,
        y: this.#initialTransform.y + dy
      }, this.#currentTime);
    }
  }

  /**
   * Perform resize transformation
   * @param {number} dx
   * @param {number} dy
   * @param {string} handleType
   */
  #performResize(dx, dy, handleType) {
    const bounds = this.#getLayerBounds();
    if (!bounds) return;

    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;

    // Calculate scale based on handle type
    switch (handleType) {
      case PlayerLayer.HANDLE_TYPES.RESIZE_SE:
        scaleX = Math.max(0.1, (bounds.width + dx) / bounds.width);
        scaleY = Math.max(0.1, (bounds.height + dy) / bounds.height);
        break;
      case PlayerLayer.HANDLE_TYPES.RESIZE_NW:
        scaleX = Math.max(0.1, (bounds.width - dx) / bounds.width);
        scaleY = Math.max(0.1, (bounds.height - dy) / bounds.height);
        offsetX = dx * scaleX;
        offsetY = dy * scaleY;
        break;
      case PlayerLayer.HANDLE_TYPES.RESIZE_NE:
        scaleX = Math.max(0.1, (bounds.width + dx) / bounds.width);
        scaleY = Math.max(0.1, (bounds.height - dy) / bounds.height);
        offsetY = dy * scaleY;
        break;
      case PlayerLayer.HANDLE_TYPES.RESIZE_SW:
        scaleX = Math.max(0.1, (bounds.width - dx) / bounds.width);
        scaleY = Math.max(0.1, (bounds.height + dy) / bounds.height);
        offsetX = dx * scaleX;
        break;
      case PlayerLayer.HANDLE_TYPES.RESIZE_E:
        scaleX = Math.max(0.1, (bounds.width + dx) / bounds.width);
        break;
      case PlayerLayer.HANDLE_TYPES.RESIZE_W:
        scaleX = Math.max(0.1, (bounds.width - dx) / bounds.width);
        offsetX = dx * scaleX;
        break;
      case PlayerLayer.HANDLE_TYPES.RESIZE_N:
        scaleY = Math.max(0.1, (bounds.height - dy) / bounds.height);
        offsetY = dy * scaleY;
        break;
      case PlayerLayer.HANDLE_TYPES.RESIZE_S:
        scaleY = Math.max(0.1, (bounds.height + dy) / bounds.height);
        break;
    }

    // Apply uniform scaling (maintain aspect ratio)
    const scale = Math.min(scaleX, scaleY);
    
    this.#layer.update({
      scale: this.#initialTransform.scale * scale,
      x: this.#initialTransform.x + offsetX,
      y: this.#initialTransform.y + offsetY
    }, this.#currentTime);
  }

  /**
   * Perform rotation transformation
   * @param {number} currentX
   * @param {number} currentY
   */
  #performRotation(currentX, currentY) {
    const bounds = this.#getLayerBounds();
    if (!bounds) return;

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const startAngle = Math.atan2(this.#dragStart.y - centerY, this.#dragStart.x - centerX);
    const currentAngle = Math.atan2(currentY - centerY, currentX - centerX);
    const deltaAngle = currentAngle - startAngle;

    this.#layer.update({
      rotation: deltaAngle * (180 / Math.PI) // Convert to degrees
    }, this.#currentTime);
  }

  /**
   * Hit test for transformation handles and layer area
   * @param {number} x
   * @param {number} y
   * @returns {Object|null}
   */
  #hitTest(x, y) {
    if (!this.#selected) return null;

    const bounds = this.#getLayerBounds();
    if (!bounds) return null;

    const handleSize = 8;
    const rotationHandleOffset = 20;

    // Test rotation handle first
    const rotationX = bounds.x + bounds.width / 2;
    const rotationY = bounds.y - rotationHandleOffset;
    
    if (this.#pointInRect(x, y, rotationX - handleSize/2, rotationY - handleSize/2, handleSize, handleSize)) {
      return { type: PlayerLayer.HANDLE_TYPES.ROTATE, cursor: 'grab' };
    }

    // Test resize handles
    const handlePositions = this.#getHandlePositions(bounds, handleSize);
    
    for (let i = 0; i < this.#handles.length; i++) {
      const handle = this.#handles[i];
      const pos = handlePositions[i];
      
      if (this.#pointInRect(x, y, pos.x, pos.y, handleSize, handleSize)) {
        return { type: handle.type, cursor: handle.cursor };
      }
    }

    // Test layer content area for move
    if (this.#pointInRect(x, y, bounds.x, bounds.y, bounds.width, bounds.height)) {
      return { type: 'move', cursor: 'move' };
    }

    return null;
  }

  /**
   * Get handle positions for current layer bounds
   * @param {Object} bounds
   * @param {number} handleSize
   * @returns {Array}
   */
  #getHandlePositions(bounds, handleSize) {
    const half = handleSize / 2;
    return [
      { x: bounds.x - half, y: bounds.y - half }, // NW
      { x: bounds.x + bounds.width/2 - half, y: bounds.y - half }, // N
      { x: bounds.x + bounds.width - half, y: bounds.y - half }, // NE
      { x: bounds.x + bounds.width - half, y: bounds.y + bounds.height/2 - half }, // E
      { x: bounds.x + bounds.width - half, y: bounds.y + bounds.height - half }, // SE
      { x: bounds.x + bounds.width/2 - half, y: bounds.y + bounds.height - half }, // S
      { x: bounds.x - half, y: bounds.y + bounds.height - half }, // SW
      { x: bounds.x - half, y: bounds.y + bounds.height/2 - half } // W
    ];
  }

  /**
   * Check if point is within rectangle
   * @param {number} px
   * @param {number} py
   * @param {number} rx
   * @param {number} ry
   * @param {number} rw
   * @param {number} rh
   * @returns {boolean}
   */
  #pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  /**
   * Get current transformation values
   * @returns {Object}
   */
  #getCurrentTransform() {
    const frame = this.#layer.getFrame(this.#currentTime);
    return frame ? {
      x: frame.x || 0,
      y: frame.y || 0,
      scale: frame.scale || 1,
      rotation: frame.rotation || 0
    } : { x: 0, y: 0, scale: 1, rotation: 0 };
  }

  /**
   * Get layer bounds in canvas coordinates
   * @returns {{ x, y, width, height }}
   */
  #getLayerBounds() {
    const frame = this.#layer.getFrame(this.#currentTime);
    if (!frame) return null;

    // Calculate position using the same logic as layer rendering
    const x = frame.x + this.#canvas.width / 2 - this.#layer.width / 2;
    const y = frame.y + this.#canvas.height / 2 - this.#layer.height / 2;
    
    // Apply scale to get final dimensions
    const width = this.#layer.width * frame.scale;
    const height = this.#layer.height * frame.scale;

    return { x, y, width, height };
  }

  /**
   * Mark the layer area with visual boundaries and handles
   * @param {CanvasRenderingContext2D} ctx
   */
  #markLayerArea(ctx) {
    if (!this.#selected) return;
    const bounds = this.#getLayerBounds();
    if (!bounds) return;

    ctx.save();

    // Draw selection boundary
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw resize handles
    ctx.fillStyle = '#00aaff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    const handleSize = 8;
    const handlePositions = this.#getHandlePositions(bounds, handleSize);

    handlePositions.forEach(pos => {
      ctx.fillRect(pos.x, pos.y, handleSize, handleSize);
      ctx.strokeRect(pos.x, pos.y, handleSize, handleSize);
    });

    // Draw rotation handle
    const rotationX = bounds.x + bounds.width / 2 - handleSize / 2;
    const rotationY = bounds.y - 20 - handleSize / 2;
    
    ctx.beginPath();
    ctx.arc(rotationX + handleSize/2, rotationY + handleSize/2, handleSize/2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw line connecting rotation handle to layer
    ctx.beginPath();
    ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
    ctx.lineTo(rotationX + handleSize/2, rotationY + handleSize);
    ctx.stroke();

    // Restore context state
    ctx.restore();
  }

  /**
   * Render the layer content
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} time
   * @param {boolean} playing
   */
  render(ctx, time, playing) {
    this.#currentTime = time;
    this.#layer.render(ctx, time, playing);
    this.#markLayerArea(ctx);
  }

  /**
   * Cleanup event listeners and resources
   */
  destroy() {
    this.#canvas.removeEventListener('pointerdown', this.#onPointerDown.bind(this));
    this.#canvas.removeEventListener('pointermove', this.#onPointerMove.bind(this));
    this.#canvas.removeEventListener('pointerup', this.#onPointerUp.bind(this));
    this.#canvas.removeEventListener('pointerleave', this.#onPointerUp.bind(this));
  }
}