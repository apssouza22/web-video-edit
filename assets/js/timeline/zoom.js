/**
 * Class to handle timeline zoom functionality using a slider
 */
export class TimelineZoomHandler {
  /**
   * Creates a new TimelineZoomHandler
   * 
   * @param {Timeline} timeline - The timeline instance to control
   */
  constructor(timeline) {
    this.timeline = timeline;
    this.slider = document.getElementById('timeline_zoom_slider');
    this.setupEventListeners();
  }

  /**
   * Sets up event listeners for the zoom slider
   */
  setupEventListeners() {
    if (!this.slider) {
      console.error('Timeline zoom slider not found');
      return;
    }

    this.slider.addEventListener('input', this.handleZoomChange.bind(this));
  }

  /**
   * Handle zoom slider change event
   * 
   * @param {Event} event - The slider input event
   */
  handleZoomChange(event) {
    const zoomLevel = parseFloat(event.target.value);
    
    // Get the current scroll position and center point
    const timelineHolder = this.timeline.timelineHolder;
    const currentCenterX = timelineHolder.scrollLeft + timelineHolder.clientWidth / 2;
    const oldWidth = timelineHolder.scrollWidth;
        
    // Apply the new zoom level
    this.timeline.scale = zoomLevel;
    this.timeline.resize();
    
    // Calculate the new scroll position to keep the same content centered
    const newWidth = timelineHolder.scrollWidth;
    const ratio = newWidth / oldWidth;
    const newCenterX = currentCenterX * ratio;
    const newScrollLeft = newCenterX - timelineHolder.clientWidth / 2;
    
    // Apply the new scroll position
    timelineHolder.scrollLeft = Math.max(0, newScrollLeft);
  }

  /**
   * Updates the slider value based on the current timeline scale
   */
  updateSliderValue() {
    if (this.slider) {
      this.slider.value = this.timeline.scale;
    }
  }
}
