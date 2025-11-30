import {AbstractMedia, FlexibleMedia} from './media-common';
import {LayerChange, LayerFile} from './types';
import {Canvas2DRender} from '@/common/render-2d';
import {dpr} from '@/constants';

export class TextMedia extends FlexibleMedia {
  private _color: string;
  private _shadow: boolean;
  private _fontSize = 30;

  constructor(text: string) {
    // @ts-ignore
    const fakeFile: LayerFile = {
      name: text
    };
    
    super(fakeFile);
    this._color = "#ffffff";
    this._shadow = true;
    this.ready = true;
    
    this.#drawText();
    
    setTimeout(() => {
      this.loadUpdateListener(this, 100);
    }, 10);
  }

  get color(): string {
    return this._color;
  }

  set color(value: string) {
    if (this._color !== value) {
      this._color = value;
      this.#drawText();
    }
  }

  get shadow(): boolean {
    return this._shadow;
  }

  set shadow(value: boolean) {
    if (this._shadow !== value) {
      this._shadow = value;
      this.#drawText();
    }
  }

  get fontSize(): number {
    return this._fontSize;
  }

  set fontSize(value: number) {
    if (this._fontSize !== value) {
      this._fontSize = value;
      this.#drawText();
    }
  }

  updateName(name: string): void {
    if (this.name !== name) {
      super.updateName(name);
      this.#drawText();
    }
  }

  #drawText(): void {
    this.ctx.font = `${this._fontSize}px sans-serif`;
    const rect = this.ctx.measureText(this.name);
    
    const textRectWidth = Math.max(rect.width, 100);
    const textRectHeight = Math.max(rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent, 30);

    const newWidth = textRectWidth * dpr;
    const newHeight = textRectHeight * dpr;
    
    if (this.width !== newWidth || this.height !== newHeight) {
      this.width = newWidth;
      this.height = newHeight;
      this.renderer.setSize(this.width, this.height);
    } else {
      this.renderer.clearRect();
    }

    this.#renderText();
  }

  #renderText(): void {
    if (this._shadow) {
      this.ctx.shadowColor = "black";
      this.ctx.shadowBlur = 7;
    } else {
      this.ctx.shadowColor = '';
      this.ctx.shadowBlur = 0;
    }

    this.ctx.font = `${this._fontSize}px sans-serif`;
    this.ctx.fillStyle = this._color;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const x = this.width / 2;
    const y = this.height / 2;
    this.ctx.fillText(this.name, x, y);
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
      this.renderer.clearRect();
      this.#renderText();
      this.updateRenderCache(refTime);
    }

    Canvas2DRender.drawTransformed(this.ctx, ctxOut, frame);
  }

  protected _createCloneInstance(): AbstractMedia {
    return new TextMedia(this.name) as AbstractMedia;
  }

  clone(): AbstractMedia {
    const cloned = super.clone();
    if (cloned) {
      (cloned as TextMedia).color = this._color;
      (cloned as TextMedia).shadow = this._shadow;
      (cloned as TextMedia).fontSize = this._fontSize;
    }
    return cloned;
  }
}
