/**
 * Class to handle the preview display for the timeline
 */
export class PreviewHandler {

  constructor() {
    this.previewHolder = document.getElementById('cursor_preview');
    this.previewCanvas = this.previewHolder.querySelector('canvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.cursorText = this.previewHolder.querySelector('div');
  }

  render(time, layers) {
    this.previewCtx.clearRect(0, 0, this.previewCtx.canvas.width, this.previewCtx.canvas.height);
    for (let layer of layers) {
      layer.render(this.previewCtx, time);
    }
  }


  updatePreview(ev, timelineHolder, time, totalTime) {
    let cursor_x = Math.max(ev.clientX - this.previewCanvas.clientWidth / 2, 0);
    cursor_x = Math.min(cursor_x, timelineHolder.clientWidth - this.previewCanvas.clientWidth);

    this.previewHolder.style.display = "block";
    this.previewHolder.style.left = cursor_x + "px";
    this.previewHolder.style.bottom = (timelineHolder.clientHeight) + "px";

    this.cursorText.textContent = time.toFixed(2) + "/" + totalTime.toFixed(2);
  }
}
