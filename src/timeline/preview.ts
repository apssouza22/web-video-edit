/**
 * Class to handle the preview display for the timeline
 */
import type { MediaInterface } from './types';

export class PreviewHandler {
  previewHolder: HTMLElement;
  previewCanvas: HTMLCanvasElement;
  previewCtx: CanvasRenderingContext2D;
  cursorText: HTMLElement;

  constructor() {
    this.previewHolder = document.getElementById('cursor_preview') as HTMLElement;
    this.previewCanvas = this.previewHolder.querySelector('canvas') as HTMLCanvasElement;
    this.previewCtx = this.previewCanvas.getContext('2d') as CanvasRenderingContext2D;
    this.cursorText = this.previewHolder.querySelector('div') as HTMLElement;
  }

  async render(time: number, layers: MediaInterface[]) {
    this.previewCtx.clearRect(0, 0, this.previewCtx.canvas.width, this.previewCtx.canvas.height);
    for (let layer of layers) {
      await layer.render(this.previewCtx, time);
    }
  }


  updatePreview(ev: PointerEvent, timelineHolder: HTMLElement, time: number, totalTime: number) {
    let cursor_x = Math.max(ev.clientX - this.previewCanvas.clientWidth / 2, 0);
    cursor_x = Math.min(cursor_x, timelineHolder.clientWidth - this.previewCanvas.clientWidth);

    this.previewHolder.style.display = "block";
    this.previewHolder.style.left = cursor_x + "px";
    this.previewHolder.style.bottom = (timelineHolder.clientHeight) + "px";

    this.cursorText.textContent = time.toFixed(2) + "/" + totalTime.toFixed(2);
  }
}
