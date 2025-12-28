import {AbstractMedia, ResizableClip} from '../media-common';
import {Canvas2DRender} from '@/common/render-2d';
import {ShapeType, ShapeStyle, ShapeConfig, DEFAULT_SHAPE_STYLE, SHAPE_PRESETS} from './types';
import {dpr} from '@/constants';

export class ShapeMedia extends ResizableClip {
  #shapeType: ShapeType;
  #style: ShapeStyle;

  constructor(shapeType: ShapeType, config?: Partial<ShapeConfig>) {
    const preset = SHAPE_PRESETS[shapeType];
    const name = ShapeMedia.#getShapeName(shapeType);
    super(name);
    
    this.#shapeType = shapeType;
    this.#style = config?.style ? { ...config.style } : { ...preset.style };
    
    this._width = (config?.width ?? preset.width) * dpr;
    this._height = (config?.height ?? preset.height) * dpr;
    this._renderer.setSize(this._width, this._height);
    this._ready = true;
    
    this.#drawShape();
    
    setTimeout(() => {
      this._loadUpdateListener(100, this.name, this);
    }, 10);
  }

  get shapeType(): ShapeType {
    return this.#shapeType;
  }

  get style(): ShapeStyle {
    return { ...this.#style };
  }

  set fillColor(value: string) {
    if (this.#style.fillColor !== value) {
      this.#style.fillColor = value;
      this.#drawShape();
    }
  }

  set strokeColor(value: string) {
    if (this.#style.strokeColor !== value) {
      this.#style.strokeColor = value;
      this.#drawShape();
    }
  }

  set strokeWidth(value: number) {
    if (this.#style.strokeWidth !== value) {
      this.#style.strokeWidth = value;
      this.#drawShape();
    }
  }

  set opacity(value: number) {
    if (this.#style.opacity !== value) {
      this.#style.opacity = Math.max(0, Math.min(1, value));
      this.#drawShape();
    }
  }

  #drawShape(): void {
    this._renderer.clearRect();
    this.ctx.save();
    this.ctx.globalAlpha = this.#style.opacity;
    
    switch (this.#shapeType) {
      case ShapeType.ELLIPSE:
        this.#drawEllipse();
        break;
      case ShapeType.SQUARE:
        this.#drawSquare();
        break;
      case ShapeType.LINE:
        this.#drawLine();
        break;
      case ShapeType.ARROW:
        this.#drawArrow();
        break;
    }
    
    this.ctx.restore();
  }

  #drawEllipse(): void {
    const centerX = this._width / 2;
    const centerY = this._height / 2;
    const radiusX = (this._width - this.#style.strokeWidth * dpr) / 2;
    const radiusY = (this._height - this.#style.strokeWidth * dpr) / 2;
    
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    
    if (this.#style.fillColor !== 'transparent') {
      this.ctx.fillStyle = this.#style.fillColor;
      this.ctx.fill();
    }
    
    this.ctx.strokeStyle = this.#style.strokeColor;
    this.ctx.lineWidth = this.#style.strokeWidth * dpr;
    this.ctx.stroke();
  }

  #drawSquare(): void {
    const strokeOffset = this.#style.strokeWidth * dpr / 2;
    const x = strokeOffset;
    const y = strokeOffset;
    const width = this._width - this.#style.strokeWidth * dpr;
    const height = this._height - this.#style.strokeWidth * dpr;
    
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    
    if (this.#style.fillColor !== 'transparent') {
      this.ctx.fillStyle = this.#style.fillColor;
      this.ctx.fill();
    }
    
    this.ctx.strokeStyle = this.#style.strokeColor;
    this.ctx.lineWidth = this.#style.strokeWidth * dpr;
    this.ctx.stroke();
  }

  #drawLine(): void {
    const y = this._height / 2;
    const padding = this.#style.strokeWidth * dpr;
    
    this.ctx.beginPath();
    this.ctx.moveTo(padding, y);
    this.ctx.lineTo(this._width - padding, y);
    
    this.ctx.strokeStyle = this.#style.strokeColor;
    this.ctx.lineWidth = this.#style.strokeWidth * dpr;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
  }

  #drawArrow(): void {
    const padding = this.#style.strokeWidth * dpr * 2;
    const arrowHeadLength = Math.min(this._height * 0.8, this._width * 0.15);
    const arrowHeadWidth = this._height * 0.4;
    const y = this._height / 2;
    const endX = this._width - padding;
    const startX = padding;
    
    this.ctx.beginPath();
    this.ctx.moveTo(startX, y);
    this.ctx.lineTo(endX - arrowHeadLength, y);
    
    this.ctx.strokeStyle = this.#style.strokeColor;
    this.ctx.lineWidth = this.#style.strokeWidth * dpr;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.moveTo(endX, y);
    this.ctx.lineTo(endX - arrowHeadLength, y - arrowHeadWidth);
    this.ctx.lineTo(endX - arrowHeadLength, y + arrowHeadWidth);
    this.ctx.closePath();
    
    this.ctx.fillStyle = this.#style.strokeColor;
    this.ctx.fill();
  }

  async render(ctxOut: CanvasRenderingContext2D, refTime: number, playing: boolean = false): Promise<void> {
    if (!this.isLayerVisible(refTime)) {
      return;
    }

    const frame = await this.getFrame(refTime);
    if (!frame) {
      return;
    }

    if (this.shouldReRender(refTime)) {
      this.#drawShape();
      this.updateRenderCache(refTime);
    }

    Canvas2DRender.drawTransformed(this.ctx, ctxOut, frame);
  }

  protected _createCloneInstance(): AbstractMedia {
    const shape = new ShapeMedia(this.#shapeType, {
      style: { ...this.#style },
      width: this._width / dpr,
      height: this._height / dpr
    });
    return shape as AbstractMedia;
  }

  clone(): AbstractMedia {
    return super.clone();
  }

  static #getShapeName(type: ShapeType): string {
    const names: Record<ShapeType, string> = {
      [ShapeType.ELLIPSE]: 'Ellipse',
      [ShapeType.SQUARE]: 'Square',
      [ShapeType.LINE]: 'Line',
      [ShapeType.ARROW]: 'Arrow'
    };
    return names[type];
  }
}

