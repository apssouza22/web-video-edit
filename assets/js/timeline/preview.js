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
      if (layer.start_time > time) {
        continue;
      }
      if (layer.start_time + layer.totalTimeInMilSeconds < time) {
        continue;
      }
      layer.render(this.previewCtx, time);
    }
  }


  updatePreview(ev, rect, time, totalTime) {
    // Get the timeline container element
    const timelineContainer = document.getElementById('timeline_content');
    const timelineContainerRect = timelineContainer.getBoundingClientRect();
    
    // Calculate the cursor position relative to the timeline container, accounting for scroll
    let cursor_x = ev.clientX - timelineContainerRect.left + timelineContainer.scrollLeft - this.previewCanvas.clientWidth / 2;
    
    // Ensure the preview stays within the visible timeline container bounds
    const containerWidth = timelineContainer.clientWidth;
    cursor_x = Math.max(cursor_x, timelineContainer.scrollLeft);
    cursor_x = Math.min(cursor_x, timelineContainer.scrollLeft + containerWidth - this.previewCanvas.clientWidth);

    this.previewHolder.style.display = "block";
    this.previewHolder.style.left = cursor_x + "px";
    this.previewHolder.style.bottom = (rect.height) + "px";

    this.cursorText.textContent = time.toFixed(2) + "/" + totalTime.toFixed(2);
  }
}
