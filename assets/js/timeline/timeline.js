import { TimeMarker } from './time-marker.js';
import { TimelineZoomHandler } from './zoom.js';
import { PreviewHandler } from './preview.js';
import { DragLayerHandler } from './drag.js';
import { PinchHandler } from '../studio/index.js';
import { dpr } from '../constants.js';

/**
 * Class responsible for rendering timeline layers with different visual styles
 */
export class TimelineLayerRender {
  /**
   * @param {CanvasRenderingContext2D} ctx - The canvas context to render on
   * @param {number} totalTime - The total time duration of the timeline
   * @param {number} canvasWidth - The width of the timeline canvas
   */
  constructor(ctx, totalTime, canvasWidth) {
    this.ctx = ctx;
    this.totalTime = totalTime;
    this.canvasWidth = canvasWidth;
  }

  /**
   * Update the timeline properties for rendering
   * @param {number} totalTime - The total time duration
   * @param {number} canvasWidth - The canvas width
   */
  updateProperties(totalTime, canvasWidth) {
    this.totalTime = totalTime;
    this.canvasWidth = canvasWidth;
  }

  /**
   * Get the color scheme for a layer based on its type
   * @param {StandardLayer} layer - The layer to get colors for
   * @param {boolean} selected - Whether the layer is selected
   * @returns {Object} - Object containing fillColor, gradientColor, strokeColor, and shadowColor
   */
  getLayerColors(layer, selected) {
    const layerType = layer.constructor.name;
    let baseColor, gradientColor, selectedColor, selectedGradient;
    
    switch (layerType) {
      case 'AudioLayer':
        baseColor = 'rgb(255, 165, 0)'; // Orange
        gradientColor = 'rgb(255, 140, 0)';
        selectedColor = 'rgb(255, 200, 50)';
        selectedGradient = 'rgb(255, 165, 0)';
        break;
      case 'VideoLayer':
        baseColor = 'rgb(30, 144, 255)'; // Dodger Blue
        gradientColor = 'rgb(0, 123, 255)';
        selectedColor = 'rgb(70, 180, 255)';
        selectedGradient = 'rgb(30, 144, 255)';
        break;
      case 'ImageLayer':
        baseColor = 'rgb(138, 43, 226)'; // Blue Violet
        gradientColor = 'rgb(123, 28, 211)';
        selectedColor = 'rgb(170, 80, 255)';
        selectedGradient = 'rgb(138, 43, 226)';
        break;
      default: // Text or other layers
        baseColor = 'rgb(34, 197, 94)'; // Green
        gradientColor = 'rgb(22, 163, 74)';
        selectedColor = 'rgb(70, 220, 120)';
        selectedGradient = 'rgb(34, 197, 94)';
    }
    
    return {
      fillColor: selected ? selectedColor : baseColor,
      gradientColor: selected ? selectedGradient : gradientColor,
      strokeColor: selected ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.3)',
      shadowColor: 'rgba(0, 0, 0, 0.3)'
    };
  }

  /**
   * Draw a symbol for the layer type
   * @param {string} layerType - The type of the layer
   * @param {number} x - X position for the symbol
   * @param {number} y - Y position for the symbol
   * @param {number} size - Size of the symbol
   */
  drawLayerSymbol(layerType, x, y, size) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = 1.5;
    
    switch (layerType) {
      case 'AudioLayer':
        // Draw audio wave symbol
        this.ctx.beginPath();
        const waveWidth = size;
        const waveHeight = size * 0.5;
        const waveX = x - waveWidth / 2;
        const waveY = y;
        
        // Draw  audio wave
        this.ctx.moveTo(waveX, waveY);
        this.ctx.lineTo(waveX + waveWidth * 0.15, waveY - waveHeight * 0.8);
        this.ctx.lineTo(waveX + waveWidth * 0.3, waveY + waveHeight * 0.6);
        this.ctx.lineTo(waveX + waveWidth * 0.45, waveY - waveHeight * 1.0);
        this.ctx.lineTo(waveX + waveWidth * 0.6, waveY + waveHeight * 0.9);
        this.ctx.lineTo(waveX + waveWidth * 0.75, waveY - waveHeight * 0.7);
        this.ctx.lineTo(waveX + waveWidth * 0.9, waveY + waveHeight * 0.4);
        this.ctx.lineTo(waveX + waveWidth, waveY);
        this.ctx.stroke();
        break;
        
      case 'VideoLayer':
        // Draw enhanced play button triangle
        this.ctx.beginPath();
        const triangleSize = size * 0.8;
        const triangleX = x - triangleSize * 0.3;
        const triangleY = y;
        
        this.ctx.moveTo(triangleX, triangleY - triangleSize * 0.5);
        this.ctx.lineTo(triangleX, triangleY + triangleSize * 0.5);
        this.ctx.lineTo(triangleX + triangleSize * 0.8, triangleY);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        break;
        
      case 'ImageLayer':
        // Draw image/picture symbol
        const imgSize = size * 0.9;
        const imgX = x - imgSize / 2;
        const imgY = y - imgSize / 2;
        
        // Draw image frame
        this.ctx.strokeRect(imgX, imgY, imgSize, imgSize * 0.75);
        
        // Draw mountain/landscape inside
        this.ctx.beginPath();
        this.ctx.moveTo(imgX + imgSize * 0.1, imgY + imgSize * 0.6);
        this.ctx.lineTo(imgX + imgSize * 0.3, imgY + imgSize * 0.3);
        this.ctx.lineTo(imgX + imgSize * 0.5, imgY + imgSize * 0.45);
        this.ctx.lineTo(imgX + imgSize * 0.7, imgY + imgSize * 0.25);
        this.ctx.lineTo(imgX + imgSize * 0.9, imgY + imgSize * 0.6);
        this.ctx.stroke();
        
        // Draw sun/circle
        this.ctx.beginPath();
        this.ctx.arc(imgX + imgSize * 0.75, imgY + imgSize * 0.25, imgSize * 0.08, 0, 2 * Math.PI);
        this.ctx.fill();
        break;
        
      default: // Text or other layers
        // Draw "T" for text
        const textSize = size * 0.7;
        this.ctx.font = `bold ${textSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillText('T', x, y);
        this.ctx.strokeText('T', x, y);
    }
  }

  /**
   * Render a single layer in the timeline
   * @param {StandardLayer} layer - The layer to render
   * @param {number} y_coord - The y coordinate to render at
   * @param {number} height - The height of the layer track
   * @param {boolean} selected - Whether the layer is selected
   */
  renderLayer(layer, y_coord, height, selected) {
    if (!isFinite(y_coord) || !isFinite(height) || height <= 0) {
      console.warn("Invalid layer coordinates")
      return;
    }
    
    let scale = this.canvasWidth / this.totalTime;
    let start = scale * layer.start_time;
    let length = scale * layer.totalTimeInMilSeconds;

    if (!isFinite(start) || !isFinite(length) || length <= 0) {
      console.warn("Invalid layer position details")
      return;
    }
    
    const colors = this.getLayerColors(layer, selected);
    const gradientStartY = y_coord - height/2;
    const gradientEndY = y_coord + height/2;
    const gradient = this.ctx.createLinearGradient(start, gradientStartY, start, gradientEndY);
    gradient.addColorStop(0, colors.fillColor);
    gradient.addColorStop(1, colors.gradientColor);
    
    const radius = height * 0.25;
    const trackY = y_coord - height / 2;
    
    // Draw shadow first
    this.ctx.fillStyle = colors.shadowColor;
    this.ctx.beginPath();
    this.ctx.roundRect(start + 2, trackY + 2, length, height, radius);
    this.ctx.fill();
    
    // Draw the main layer track with gradient
    this.ctx.fillStyle = gradient;
    this.ctx.strokeStyle = colors.strokeColor;
    this.ctx.lineWidth = selected ? 3 : 1.5;
    
    this.ctx.beginPath();
    this.ctx.roundRect(start, trackY, length, height, radius);
    this.ctx.fill();
    this.ctx.stroke();

    // Draw resize handles
    const handleWidth = 6;
    const handleHeight = height * 1.4;
    const handleY = y_coord - handleHeight / 2;
    const handleRadius = 2;
    
    this.ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    
    // Left handle
    this.ctx.beginPath();
    this.ctx.roundRect(start - handleWidth/2, handleY, handleWidth, handleHeight, handleRadius);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Right handle
    this.ctx.beginPath();
    this.ctx.roundRect(start + length - handleWidth/2, handleY, handleWidth, handleHeight, handleRadius);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw layer type symbol if the layer is wide enough
    if (length > height * 2.5) {
      const symbolX = start + height * 0.8;
      const symbolY = y_coord;
      const symbolSize = height * 0.7;
      this.drawLayerSymbol(layer.constructor.name, symbolX, symbolY, symbolSize);
    }
    
    // Draw layer name with improved typography
    if (length > height * 4) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.lineWidth = 0.5;
      this.ctx.font = `${Math.min(12, height * 0.45)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      
      const textX = start + height * 2.2;
      const maxTextWidth = length - height * 3;
      
      // Truncate text if it's too long
      let displayName = layer.name || 'Unnamed Layer';
      const textWidth = this.ctx.measureText(displayName).width;
      if (textWidth > maxTextWidth) {
        while (this.ctx.measureText(displayName + '...').width > maxTextWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      
      // Draw text with subtle stroke for better readability
      this.ctx.strokeText(displayName, textX, y_coord);
      this.ctx.fillText(displayName, textX, y_coord);
    }
  }
}

/**
 * Class representing a timeline for a video player
 */
export class Timeline {

  /**
   *
   * @param {VideoStudio} studio
   */
  constructor(studio) {
    this.studio = studio;
    this.selectedLayer = null;
    this.isHover = false;
    this.time = 0;
    this.playerTime = 0;
    this.layers = [];
    this.scale = 2.0;
    this.totalTime = 0;
    this.timelineCanvas = document.createElement('canvas');
    this.timelineCtx = this.timelineCanvas.getContext('2d');

    this.timelineHolder = document.getElementById('timeline_content');
    this.timelineHolder.appendChild(this.timelineCanvas);

    // Configuration for timeline elements
    this.layerHeight = 35; // Height per layer
    this.minLayerSpacing = 15; // Minimum space between layers
    this.contentPadding = 15; // Padding around content
    
    // Create time marker handler
    this.timeMarker = new TimeMarker({
      height: 25,
      spacing: 60
    });

    // Initialize layer renderer
    this.layerRenderer = new TimelineLayerRender(
      this.timelineCtx, 
      this.totalTime, 
      this.timelineCanvas.clientWidth
    );

    this.previewHandler = new PreviewHandler();
    this.dragHandler = new DragLayerHandler(this);
    this.timeUpdateListener = null;
    this.layerUpdateListener = null;

    this.#addEventListeners();
    this.#setupPinchHandler();
  }

  /**
   * Setter for time property that notifies listeners when time changes
   */
  setTime(newTime) {
    const oldTime = this.time;
    this.time = newTime;
    if (oldTime !== newTime) {
      this.timeUpdateListener(newTime, oldTime)
    }
  }

  /**
   * Add a listener for layer updates
   * @param {Function} listener - Function to call when layer updates occur
   */
  addLayerUpdateListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Layer update listener must be a function');
    }
    this.layerUpdateListener = listener;
  }

  /**
   * Setter for selectedLayer property that notifies listeners when selectedLayer changes
   * @param {StandardLayer|null} newSelectedLayer - The new selected layer
   */
  setSelectedLayer(newSelectedLayer) {
    const oldSelectedLayer = this.selectedLayer;
    this.selectedLayer = newSelectedLayer;
    if (oldSelectedLayer !== newSelectedLayer && this.layerUpdateListener) {
      this.layerUpdateListener('select', newSelectedLayer, oldSelectedLayer);
    }
  }

  /**
   * Delete the currently selected layer and notify listeners
   */
  deleteSelectedLayer() {
    if (this.selectedLayer && this.layerUpdateListener) {
      const layerToDelete = this.selectedLayer;
      this.selectedLayer = null;
      this.layerUpdateListener('delete', layerToDelete, null);
    }
  }

  addTimeUpdateListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Time update listener must be a function');
    }
    this.timeUpdateListener = listener
  }

  #setupPinchHandler() {
    const callback = (function (scale, rotation) {
      let new_x = (this.timelineHolder.clientWidth * scale - this.timelineHolder.clientWidth);
      let old_x = this.timelineHolder.scrollLeft;
      this.scale = Math.max(1, this.scale * scale);
      this.resize();
      this.timelineHolder.scroll(Math.round(old_x + new_x), 0);
      
      // Update the zoom slider to match the current scale
      if (this.zoomHandler) {
        this.zoomHandler.updateSliderValue();
      }
    }).bind(this)

    const pinch = new PinchHandler(this.timelineHolder, callback, this.studio);
    pinch.setupEventListeners();
    
    this.zoomHandler = new TimelineZoomHandler(this);
  }

  #addEventListeners() {
    this.timelineCanvas.addEventListener('pointerdown', this.#onPointerDown.bind(this));
    this.timelineCanvas.addEventListener('pointermove', this.#onPointerMove.bind(this), { passive: false });
    this.timelineCanvas.addEventListener('pointerleave', this.#onPointerLeave.bind(this));
    this.timelineCanvas.addEventListener('pointerup', this.#onPointerLeave.bind(this));
    
    this.#setupTimelineHeaderButtons();
  }

  /**
   * Set up click event listeners for timeline header buttons
   * @private
   */
  #setupTimelineHeaderButtons() {
    // Get buttons by their specific IDs
    const deleteButton = document.getElementById('delete-button');
    const splitButton = document.getElementById('split-button');
    const cloneButton = document.getElementById('clone-button');
    
    deleteButton.addEventListener('click', () => {
      if (!this.selectedLayer) {
        console.log('No layer selected. Please select a layer first.');
        return;
      }
      this.layerUpdateListener('delete', this.selectedLayer, null);
    });
    
    splitButton.addEventListener('click', () => {
      if (!this.selectedLayer) {
        console.log('No layer selected. Please select a layer first.');
        return;
      }
      this.layerUpdateListener('split', this.selectedLayer, null);
    });
    
    cloneButton.addEventListener('click', () => {
      if (!this.selectedLayer) {
        console.log('No layer selected. Please select a layer first.');
        return;
      }
      this.layerUpdateListener('clone', this.selectedLayer, null);
    });
  }

  /**
   * Resize the timeline canvas based on the scale factor and number of layers
   */
  resize() {
    this.timelineCanvas.style.width = this.timelineHolder.clientWidth * this.scale;
    this.timelineCanvas.style.height = this.timelineHolder.clientHeight * this.scale;
    this.timelineCanvas.width = this.timelineCanvas.clientWidth * dpr;
    this.timelineCanvas.height = this.timelineCanvas.clientHeight * dpr;
    this.timelineCtx.scale(dpr, dpr);
  }

  /**
   * Start scrubbing at a specific event position
   * @param {Event} ev - The pointer event
   * @returns {boolean} - Whether a layer was selected
   */
  #onPointerDown(ev) {
    window.addEventListener('pointerup', this.#onPointerLeave.bind(this), {
      once: true
    });
    let rect = this.timelineCanvas.getBoundingClientRect();
    this.time = ev.offsetX / rect.width * this.totalTime;

    let mouseover = this.#selectLayer(ev);

    // can't drag unselected
    if (!this.selectedLayer || !mouseover) {
      return false;
    }

    this.dragHandler.startLayerDrag(this.selectedLayer, this.time);
  }

  /**
   * Handle scrubbing movement
   * @param {Event} ev - The pointer event
   * @returns {number} - The current time position
   */
  #onPointerMove(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    this.isHover = true;
    let rect = this.timelineCanvas.getBoundingClientRect();
    let time = ev.offsetX / rect.width * this.totalTime;

    document.body.style.cursor = "default";

    if (this.selectedLayer) {
      if (this.intersectsTime(this.selectedLayer.start_time, time)) {
        document.body.style.cursor = "col-resize";
      }
      const endTime = this.selectedLayer.start_time + this.selectedLayer.totalTimeInMilSeconds;
      if (this.intersectsTime(endTime, time)) {
        document.body.style.cursor = "col-resize";
      }
    }

    this.previewHandler.updatePreview(ev, this.timelineHolder, time, this.totalTime);
    this.dragHandler.dragLayer(time, this.selectedLayer);
    this.setTime(time);
  }

  intersectsTime(time, query) {
    return Math.abs(query - time) / this.totalTime < 0.01;
  }

  /**
   * End the scrubbing operation
   */
  #onPointerLeave() {
    document.body.style.cursor = "default";
    this.previewHandler.previewHolder.style.display = "none";

    this.dragHandler.dragging = null;
    this.isHover = false;
  }

  /**
   * Render all layers in the timeline
   * @param {FlexibleLayer[]} layers - The layers to render
   */
  render(layers) {
    this.layers = layers;
    this.timelineCtx.clearRect(0, 0, this.timelineCanvas.clientWidth, this.timelineCanvas.clientHeight);
    this.#updateTotalTime(layers);
    
    // Update layer renderer properties
    this.layerRenderer.updateProperties(this.totalTime, this.timelineCanvas.clientWidth);
    
    // Skip rendering if no layers or invalid canvas dimensions
    if (layers.length === 0 || this.timelineCanvas.clientHeight <= 0 || this.timelineCanvas.clientWidth <= 0) {
      this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
      return;
    }
    
    // Calculate the available height for layers (excluding the time marker height)
    const availableHeight = this.timelineCanvas.clientHeight - this.timeMarker.height - this.contentPadding;
    
    // Ensure we have positive available height
    if (availableHeight <= 0) {
      this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);
      return;
    }
    
    // Calculate vertical positions starting from top (below time marker)
    const layerSpacing = Math.max(
      this.minLayerSpacing,
      availableHeight / Math.max(layers.length, 1)
    );
    
    let verticalPosition = this.timeMarker.height + this.contentPadding + (layerSpacing / 2);

    for (let layer of layers) {
      let selected = this.selectedLayer === layer;
      // Use the layer renderer to render each layer
      this.layerRenderer.renderLayer(layer, verticalPosition, this.layerHeight, selected);
      verticalPosition += layerSpacing;
    }

    this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);

    // Render line markers on top of all other elements
    this.#renderLineMarker(this.playerTime);

    if (this.isHover) {
      this.#renderLineMarker(this.time);
      this.previewHandler.render(this.time, layers);
    }
  }

  /**
   * Select a layer based on the event position with updated top-down positioning
   * @param {Event} ev - The pointer event
   * @returns {boolean} - Whether a layer was selected
   */
  #selectLayer(ev) {
    const availableHeight = this.timelineCanvas.clientHeight - this.timeMarker.height - this.contentPadding;
    
    const layerSpacing = Math.max(
      this.minLayerSpacing,
      availableHeight / Math.max(this.layers.length, 1)
    );
    
    let verticalPosition = this.timeMarker.height + this.contentPadding + (layerSpacing / 2);

    for (let layer of this.layers) {
      if (!this.#canSelectLayer(layer)) {
        verticalPosition += layerSpacing;
        continue;
      }
      
      // Check if click is within the layer's vertical bounds
      const layerTop = verticalPosition - this.layerHeight / 2;
      const layerBottom = verticalPosition + this.layerHeight / 2;
      
      if (ev.offsetY >= layerTop && ev.offsetY <= layerBottom) {
        this.setSelectedLayer(layer);
        return true;
      }
      
      verticalPosition += layerSpacing;
    }
    return false;
  }


  /**
   * Ensures that only layers overlapping or near the current time (with a small margin of 1%)
   * are considered for further processing. Layers outside this range are ignored.
   * @param {StandardLayer} layer - The layer to check
   * @returns {boolean} - Whether the layer can be selected
   */
  #canSelectLayer(layer) {
    if (layer.start_time > (1.01 * this.time)) {
      return false;
    }

    if (layer.start_time + layer.totalTimeInMilSeconds < (0.99 * this.time)) {
      return false;
    }
    return true;
  }

  #updateTotalTime(layers) {
    if (layers.length === 0) {
      this.totalTime = 0;
      return;
    }
    
    this.totalTime = 0;
    for (let layer of layers) {
      const layerEndTime = layer.start_time + layer.totalTimeInMilSeconds;
      if (layerEndTime > this.totalTime) {
        this.totalTime = layerEndTime;
      }
    }
  }

  #renderLineMarker(time) {
    if (this.totalTime === 0) return;
    
    const scale = this.timelineCanvas.clientWidth / this.totalTime;
    const markerX = time * scale;
    
    // Draw the main line marker
    this.timelineCtx.beginPath();
    this.timelineCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.timelineCtx.lineWidth = 2;
    this.timelineCtx.moveTo(markerX, 0);
    this.timelineCtx.lineTo(markerX, this.timelineCanvas.clientHeight);
    this.timelineCtx.stroke();
    
    // Draw time display
    this.timelineCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.timelineCtx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    this.timelineCtx.textAlign = 'left';
    this.timelineCtx.textBaseline = 'top';
    
    // Position text to avoid overlapping with time marker
    const textX = markerX + 5;
    const textY = this.timeMarker.height + 5;
    
    // Draw background for better readability
    const timeText = time.toFixed(2) + 's';
    const textMetrics = this.timelineCtx.measureText(timeText);
    const textWidth = textMetrics.width + 6;
    const textHeight = 16;
    
    this.timelineCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.timelineCtx.fillRect(textX - 3, textY - 2, textWidth, textHeight);
    
    this.timelineCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.timelineCtx.fillText(timeText, textX, textY);
  }
}
