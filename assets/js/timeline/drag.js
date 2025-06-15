/**
 * Handles layer dragging and scrubbing in the timeline
 */
export class DragLayerHandler {

  /**
   * @param {Timeline} timeline - The timeline instance
   */
  constructor(timeline) {
    this.dragging = null;
    this.time = timeline.time;
    this.timeline = timeline;
  }

  dragLayer(time, selectedLayer) {
    if (this.dragging) {
      this.dragging(time, selectedLayer);
    }
  }

  /**
   * Handle the layer drag operation based on current time position
   */
  startLayerDrag(selectedLayer, time) {
    const endTime = selectedLayer.start_time + selectedLayer.totalTimeInMilSeconds;
    // If the click is at the layer's end time, adjust the total time. Change the width of the layer
    if (this.timeline.intersectsTime(endTime, time)) {
      this.dragging = this.#getResizeLayerFn(selectedLayer);
      return;
    }

    // If the click is at the layer's start time, drag  the entire layer
    if (this.timeline.intersectsTime(selectedLayer.start_time, time)) {
      this.dragging = this.#getResizeLayerStartFn(selectedLayer);
      return;
    }

    // If the click is within the layer's time, drag the entire layer
    if (time < endTime && time > selectedLayer.start_time) {
      this.dragging = this.#getMoveEntireLayerFn(time);
    }
  }

  #getResizeLayerStartFn(selectedLayer) {
    let baseTime = selectedLayer.start_time;
    return (time, selectedLayer) => {
      let diff = time - baseTime;
      baseTime = time;
      selectedLayer.start_time += diff;
    };
  }

  #getMoveEntireLayerFn(time) {
    let baseTime = time;
    return  (t, l) => {
      let diff = t - baseTime;
      baseTime = t;
      l.start_time += diff;
    };
  }

  /**
   * Get the function to resize the layer based on the end time
   * @param {StandardLayer} selectedLayer
   * @returns {(function(*, *): void)|*}
   */
  #getResizeLayerFn(selectedLayer) {
    console.log("Resizing layer:", selectedLayer.name);
    let baseTime = selectedLayer.start_time + selectedLayer.totalTimeInMilSeconds;
    return (time, selectedLayer) => {
      let diff = time - baseTime;
      baseTime = time;
      selectedLayer.adjustTotalTime(diff);
    };
  }

}