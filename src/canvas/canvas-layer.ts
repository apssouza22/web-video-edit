import {
  Bounds,
  CanvasContext2D,
  CanvasElement,
  CanvasPosition,
  HandleType,
  HitTestResult,
  LayerTransformedListener,
  Point2D,
  TransformHandle
} from './types';
import type {FrameTransform} from '@/frame';
import {AbstractMedia} from "@/media";
import {getBoundingBox} from "@/common/render-2d";

export class CanvasLayer {
  private readonly _media: AbstractMedia;
  #selected = false;
  #canvas: CanvasElement;
  #transforming = false;
  #transformType: HandleType | null = null;
  #dragStart: Point2D = { x: 0, y: 0 };
  #initialTransform: FrameTransform | null = null;
  #handles: TransformHandle[] = [];
  #rotationHandle: TransformHandle | null = null;
  #onTransformCallback: LayerTransformedListener = (media: AbstractMedia) => {};
  #currentTime = 0;

  /**
   * Class to handle transformations of a media in the player.
   */
  constructor(media: AbstractMedia, canvas: CanvasElement) {
    this._media = media;
    this.#canvas = canvas;
    this.#initializeHandles();
  }

  /**
   * Returns the media associated with this PlayerLayer instance.
   */
  get media(): AbstractMedia {
    return this._media;
  }

  set selected(value: boolean) {
    this.#selected = value;
  }

  get selected(): boolean {
    return this.#selected;
  }

  /**
   * Set transformation callback
   */
  setTransformCallback(callback: LayerTransformedListener): void {
    this.#onTransformCallback = callback;
  }

  /**
   * Initialize transformation handles
   */
  #initializeHandles(): void {
    this.#handles = [
      { type: HandleType.RESIZE_NW, cursor: 'nw-resize' },
      { type: HandleType.RESIZE_N, cursor: 'n-resize' },
      { type: HandleType.RESIZE_NE, cursor: 'ne-resize' },
      { type: HandleType.RESIZE_E, cursor: 'e-resize' },
      { type: HandleType.RESIZE_SE, cursor: 'se-resize' },
      { type: HandleType.RESIZE_S, cursor: 's-resize' },
      { type: HandleType.RESIZE_SW, cursor: 'sw-resize' },
      { type: HandleType.RESIZE_W, cursor: 'w-resize' }
    ];

    this.#rotationHandle = {
      type: HandleType.ROTATE,
      cursor: 'grab'
    };
  }

  /**
   * Handle pointer down events
   */
  onPointerDown(event: PointerEvent): void {
    if (!this.#selected) return;
    const { canvasX, canvasY } = this.#getPosition(event);

    this.#hitTest(canvasX, canvasY).then(async hitResult => {
      if (hitResult) {
        this.#transforming = true;
        this.#transformType = hitResult.type;
        this.#dragStart = { x: canvasX, y: canvasY };
        this.#initialTransform = await this.#getCurrentTransform();
        
        // Set cursor
        this.#canvas.style.cursor = hitResult.cursor;
        event.preventDefault();
      }
    });
  }

  #getPosition(event: PointerEvent): CanvasPosition {
    const rect = this.#canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { canvasX: x, canvasY: y };
  }

  /**
   * Handle pointer move events
   */
  onPointerMove(event: PointerEvent): void {
    const { canvasX, canvasY } = this.#getPosition(event);
    if (this.#transforming) {
      this.#performTransformation(canvasX, canvasY);
      return;
    }

    if (this.#selected) {
      this.#hitTest(canvasX, canvasY).then(hitResult => {
        this.#canvas.style.cursor = hitResult ? hitResult.cursor : 'default';
      });
    }
  }

  /**
   * Handle pointer up events
   */
  onPointerUp(): void {
    if (this.#transforming) {
      this.#transforming = false;
      this.#transformType = null;
      this.#canvas.style.cursor = 'default';
      this.#onTransformCallback(this._media);
    }
  }

  /**
   * Perform transformation based on current drag
   */
  async #performTransformation(currentX: number, currentY: number): Promise<void> {
    const dx = currentX - this.#dragStart.x;
    const dy = currentY - this.#dragStart.y;

    switch (this.#transformType) {
      case HandleType.MOVE:
        await this.#performMove(dx, dy);
        break;
      case HandleType.ROTATE:
        await this.#performRotation(currentX, currentY);
        break;
      default:
        if (this.#transformType && this.#transformType.startsWith('resize-')) {
          await this.#performResize(dx, dy, this.#transformType);
        }
        break;
    }
  }

  /**
   * Perform move transformation
   */
  async #performMove(dx: number, dy: number): Promise<void> {
    const frame = await this._media.getFrame(this.#currentTime);
    if (frame && this.#initialTransform) {
      const bounding = getBoundingBox(this._media.width, this._media.height, this.#canvas);
      const transformScale = bounding.ratio * bounding.scaleFactor;
      
      const frameDx = dx / transformScale;
      const frameDy = dy / transformScale;

      await this._media.update({
        x: this.#initialTransform.x + frameDx,
        y: this.#initialTransform.y + frameDy
      }, this.#currentTime);
    }
  }

  /**
   * Perform resize transformation
   */
  async #performResize(dx: number, dy: number, handleType: HandleType): Promise<void> {
    const bounds = await this.#getLayerBounds();
    if (!bounds || !this.#initialTransform) return;
    const dragDistance = Math.sqrt(dx * dx + dy * dy);
    
    // Determine scale direction based on handle type and drag direction
    let scaleDirection = 1;
    let offsetX = 0;
    let offsetY = 0;

    switch (handleType) {
      case HandleType.RESIZE_SE:
        // Southeast: positive drag increases size
        scaleDirection = (dx + dy) > 0 ? 1 : -1;
        break;
      case HandleType.RESIZE_NW:
        // Northwest: negative drag increases size
        scaleDirection = (dx + dy) < 0 ? 1 : -1;
        offsetX = dx * 0.5;
        offsetY = dy * 0.5;
        break;
      case HandleType.RESIZE_NE:
        // Northeast: mixed direction (dx positive, dy negative increases size)
        scaleDirection = (dx - dy) > 0 ? 1 : -1;
        offsetY = dy * 0.5;
        break;
      case HandleType.RESIZE_SW:
        // Southwest: mixed direction (dx negative, dy positive increases size)
        scaleDirection = (-dx + dy) > 0 ? 1 : -1;
        offsetX = dx * 0.5;
        break;
      case HandleType.RESIZE_E:
        // East: positive dx increases size
        scaleDirection = dx > 0 ? 1 : -1;
        break;
      case HandleType.RESIZE_W:
        // West: negative dx increases size
        scaleDirection = dx < 0 ? 1 : -1;
        offsetX = dx * 0.5;
        break;
      case HandleType.RESIZE_N:
        // North: negative dy increases size
        scaleDirection = dy < 0 ? 1 : -1;
        offsetY = dy * 0.5;
        break;
      case HandleType.RESIZE_S:
        // South: positive dy increases size
        scaleDirection = dy > 0 ? 1 : -1;
        break;
    }
    const scaleFactor = 1 + (scaleDirection * dragDistance * 0.00005);
    const maxScale = scaleFactor > 1 ? Math.min(1.1, scaleFactor) : Math.max(0.9, scaleFactor);

    const bounding = getBoundingBox(this._media.width, this._media.height, this.#canvas);
    const transformScale = bounding.ratio * bounding.scaleFactor;
    
    const frameOffsetX = offsetX / transformScale;
    const frameOffsetY = offsetY / transformScale;

    await this._media.update({
      scale: maxScale,
      x: this.#initialTransform.x + frameOffsetX,
      y: this.#initialTransform.y + frameOffsetY
    }, this.#currentTime);
  }

  /**
   * Perform rotation transformation
   */
  async #performRotation(currentX: number, currentY: number): Promise<void> {
    const bounds = await this.#getLayerBounds();
    if (!bounds || !this.#initialTransform) return;

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const startAngle = Math.atan2(this.#dragStart.y - centerY, this.#dragStart.x - centerX);
    const currentAngle = Math.atan2(currentY - centerY, currentX - centerX);
    const deltaAngle = (currentAngle - startAngle) / 5;

    const rotation = deltaAngle * (180 / Math.PI);
    this.#initialTransform.rotation += deltaAngle * (180 / Math.PI)

    await this._media.update({
      rotation: rotation // Convert to degrees
    }, this.#currentTime);
  }

  /**
   * Hit test for transformation handles and media area
   */
  async #hitTest(x: number, y: number): Promise<HitTestResult | null> {
    if (!this.#selected) return null;

    const bounds = await this.#getLayerBounds();
    if (!bounds) return null;

    const frame = await this._media.getFrame(this.#currentTime);
    if (!frame) return null;

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const rotation = (frame.rotation || 0) * (Math.PI / 180);

    const rotatedPoint = this.#rotatePoint(x, y, centerX, centerY, -rotation);

    const handleSize = 8;
    const rotationHandleOffset = 20;

    // Test rotation handle first
    const rotationX = bounds.x + bounds.width / 2;
    const rotationY = bounds.y - rotationHandleOffset;
    
    if (this.#pointInRect(rotatedPoint.x, rotatedPoint.y, rotationX - handleSize/2, rotationY - handleSize/2, handleSize, handleSize)) {
      return { type: HandleType.ROTATE, cursor: 'grab' };
    }

    // Test resize handles
    const handlePositions = this.#getHandlePositions(bounds, handleSize);
    
    for (let i = 0; i < this.#handles.length; i++) {
      const handle = this.#handles[i];
      const pos = handlePositions[i];
      
      if (this.#pointInRect(rotatedPoint.x, rotatedPoint.y, pos.x, pos.y, handleSize, handleSize)) {
        return { type: handle.type, cursor: handle.cursor };
      }
    }

    // Test media content area for move
    if (this.#pointInRect(rotatedPoint.x, rotatedPoint.y, bounds.x, bounds.y, bounds.width, bounds.height)) {
      return { type: HandleType.MOVE, cursor: 'move' };
    }

    return null;
  }

  /**
   * Rotate a point around a center
   */
  #rotatePoint(x: number, y: number, centerX: number, centerY: number, angle: number): Point2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = x - centerX;
    const dy = y - centerY;
    
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos
    };
  }

  /**
   * Get handle positions for current media bounds
   */
  #getHandlePositions(bounds: Bounds, handleSize: number): Point2D[] {
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
   */
  #pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  /**
   * Get current transformation values
   */
  async #getCurrentTransform(): Promise<FrameTransform> {
    const frame = await this._media.getFrame(this.#currentTime);
    return frame ? {
      x: frame.x || 0,
      y: frame.y || 0,
      scale: frame.scale || 1,
      rotation: frame.rotation || 0,
      anchor: frame.anchor || false
    } : { x: 0, y: 0, scale: 1, rotation: 0, anchor: false };
  }

  /**
   * Get media bounds in client coordinates (CSS pixels)
   */
  async #getLayerBounds(): Promise<Bounds | null> {
    const frame = await this._media.getFrame(this.#currentTime);
    if (!frame) return null;
    
    const bounding = getBoundingBox(this._media.width, this._media.height, this.#canvas);
    
    const baseWidth = bounding.width * bounding.scaleFactor;
    const baseHeight = bounding.height * bounding.scaleFactor;
    
    const transformedCenterX = bounding.centerX + frame.x * bounding.ratio * bounding.scaleFactor;
    const transformedCenterY = bounding.centerY + frame.y * bounding.ratio * bounding.scaleFactor;
    
    const scaledWidth = baseWidth * frame.scale;
    const scaledHeight = baseHeight * frame.scale;
    
    const x = transformedCenterX - scaledWidth / 2;
    const y = transformedCenterY - scaledHeight / 2;

    return { x, y, width: scaledWidth, height: scaledHeight };
  }

  /**
   * Mark the media area with visual boundaries and handles
   */
  async #markLayerArea(ctx: CanvasContext2D): Promise<void> {
    if (!this.#selected) return;
    const bounds = await this.#getLayerBounds();
    if (!bounds) return;

    const frame = await this._media.getFrame(this.#currentTime);
    if (!frame) return;

    ctx.save();

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const rotation = (frame.rotation || 0) * (Math.PI / 180);

    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.translate(-centerX, -centerY);

    // Draw selection boundary (bounds are in client coordinates, context is already scaled by dpr)
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

    // Draw line connecting rotation handle to media
    ctx.beginPath();
    ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
    ctx.lineTo(rotationX + handleSize/2, rotationY + handleSize);
    ctx.stroke();

    // Restore context state
    ctx.restore();
  }

  /**
   * Render the media content
   */
  async render(ctx: CanvasContext2D, time: number, playing: boolean): Promise<void> {
    this.#currentTime = time;
    await this._media.render(ctx, time, playing);
    await this.#markLayerArea(ctx);
  }
}
