
/**
 * Handles layer dragging and scrubbing in the timeline
 */
class DragLayerHandler {

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
    // If the click is at the layer's start time, drag  the entire layer
    if (this.timeline.intersectsTime(selectedLayer.start_time, time)) {
      this.dragging = this.#getMoveLayerFn(selectedLayer);
      return;
    }
    // If the click is at the layer's end time, adjust the total time. Change the width of the layer
    if (this.timeline.intersectsTime(selectedLayer.start_time + selectedLayer.total_time, time)) {
      this.dragging = this.#getResizeLayerFn(selectedLayer);
      return;
    }

    // If the click is within the layer's time, drag the entire layer
    if (time < selectedLayer.start_time + selectedLayer.total_time && time > selectedLayer.start_time) {
      this.dragging = this.#getMoveEntireLayerFn(time);
    }
  }

  #getMoveLayerFn(selectedLayer) {
    let base_t = selectedLayer.start_time;
    return (time, selectedLayer) => {
      let diff = time - base_t;
      base_t = time;
      selectedLayer.start_time += diff;
    };
  }

  #getMoveEntireLayerFn(time) {
    let base_t = time;
    return  (t, l) => {
      let diff = t - base_t;
      base_t = t;
      l.start_time += diff;
    };
  }

  #getResizeLayerFn(selectedLayer) {
    let base_t = selectedLayer.start_time + selectedLayer.total_time;
    return (time, selectedLayer) => {
      let diff = time - base_t;
      base_t = time;
      if (selectedLayer instanceof FlexibleLayer) {
        selectedLayer.adjustTotalTime(diff);
      } else {
        selectedLayer.start_time += diff;
      }
    };
  }

}