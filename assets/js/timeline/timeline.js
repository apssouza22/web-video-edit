import { TimeMarker } from './time-marker.js';
import { TimelineZoomHandler } from './zoom.js';
import { PreviewHandler } from './preview.js';
import { DragLayerHandler } from './drag.js';
import { PinchHandler } from '../studio/pinch-handler.js';
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
   * @returns {Object} - Object containing fillColor and strokeColor
   */
  getLayerColors(layer, selected) {
    const layerType = layer.constructor.name;
    let baseColor, selectedColor;
    
    switch (layerType) {
      case 'AudioLayer':
        baseColor = 'rgb(255, 165, 0)'; // Orange
        selectedColor = 'rgb(255, 140, 0)';
        break;
      case 'VideoLayer':
        baseColor = 'rgb(30, 144, 255)'; // Dodger Blue
        selectedColor = 'rgb(0, 123, 255)';
        break;
      case 'ImageLayer':
        baseColor = 'rgb(138, 43, 226)'; // Blue Violet
        selectedColor = 'rgb(123, 28, 211)';
        break;
      default: // Text or other layers
        baseColor = 'rgb(34, 197, 94)'; // Green
        selectedColor = 'rgb(22, 163, 74)';
    }
    
    return {
      fillColor: selected ? selectedColor : baseColor,
      strokeColor: selected ? 'rgb(255, 255, 255)' : 'rgb(100, 100, 100)'
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
    this.ctx.fillStyle = 'white';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.lineWidth = 1;
    
    switch (layerType) {
      case 'AudioLayer':
        // Draw audio wave symbol
        this.ctx.beginPath();
        const waveWidth = size * 0.8;
        const waveHeight = size * 0.4;
        const waveX = x - waveWidth / 2;
        const waveY = y;
        
        // Draw simplified audio wave
        this.ctx.moveTo(waveX, waveY);
        this.ctx.lineTo(waveX + waveWidth * 0.2, waveY - waveHeight);
        this.ctx.lineTo(waveX + waveWidth * 0.4, waveY + waveHeight);
        this.ctx.lineTo(waveX + waveWidth * 0.6, waveY - waveHeight * 0.5);
        this.ctx.lineTo(waveX + waveWidth * 0.8, waveY + waveHeight * 0.7);
        this.ctx.lineTo(waveX + waveWidth, waveY);
        this.ctx.stroke();
        break;
        
      case 'VideoLayer':
        // Draw play button triangle
        this.ctx.beginPath();
        const triangleSize = size * 0.6;
        this.ctx.moveTo(x - triangleSize / 3, y - triangleSize / 2);
        this.ctx.lineTo(x - triangleSize / 3, y + triangleSize / 2);
        this.ctx.lineTo(x + triangleSize / 2, y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        break;
        
      case 'ImageLayer':
        // Draw image/picture symbol
        const imgSize = size * 0.7;
        const imgX = x - imgSize / 2;
        const imgY = y - imgSize / 2;
        
        // Draw rectangle frame
        this.ctx.fillRect(imgX, imgY, imgSize, imgSize);
        this.ctx.strokeRect(imgX, imgY, imgSize, imgSize);
        
        // Draw small circle and line to represent a simple image
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(imgX + imgSize * 0.3, imgY + imgSize * 0.3, imgSize * 0.1, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw mountain-like shape
        this.ctx.beginPath();
        this.ctx.moveTo(imgX + imgSize * 0.1, imgY + imgSize * 0.8);
        this.ctx.lineTo(imgX + imgSize * 0.4, imgY + imgSize * 0.5);
        this.ctx.lineTo(imgX + imgSize * 0.7, imgY + imgSize * 0.6);
        this.ctx.lineTo(imgX + imgSize * 0.9, imgY + imgSize * 0.8);
        this.ctx.stroke();
        break;
        
      default: // Text or other layers
        // Draw "T" for text
        const textSize = size * 0.6;
        this.ctx.font = `bold ${textSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = 'white';
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
    let scale = this.canvasWidth / this.totalTime;
    let start = scale * layer.start_time;
    let length = scale * layer.totalTimeInMilSeconds;
    
    const colors = this.getLayerColors(layer, selected);
    
    // Draw the main layer track with rounded corners
    this.ctx.fillStyle = colors.fillColor;
    this.ctx.strokeStyle = colors.strokeColor;
    this.ctx.lineWidth = selected ? 2 : 1;
    
    const radius = height * 0.2;
    const trackY = y_coord - height / 2;
    
    // Draw rounded rectangle for the main track
    this.ctx.beginPath();
    this.ctx.roundRect(start, trackY, length, height, radius);
    this.ctx.fill();
    this.ctx.stroke();

    // Draw resize handles at start and end
    const handleWidth = 4;
    const handleHeight = height * 1.2;
    const handleY = y_coord - handleHeight / 2;
    
    this.ctx.fillStyle = selected ? 'rgb(255, 255, 255)' : colors.strokeColor;
    
    // Handles for resizing the layer
    this.ctx.fillRect(start, handleY, handleWidth, handleHeight);
    this.ctx.fillRect(start + length - handleWidth, handleY, handleWidth, handleHeight);
    
    // Draw layer type symbol if the layer is wide enough
    if (length > height * 2) {
      const symbolX = start + height;
      const symbolY = y_coord;
      const symbolSize = height * 0.6;
      this.drawLayerSymbol(layer.constructor.name, symbolX, symbolY, symbolSize);
    }
    
    // Draw layer name if there's enough space
    if (length > height * 4) {
      this.ctx.fillStyle = 'white';
      this.ctx.font = `${Math.min(10, height * 0.4)}px Arial`;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      
      const textX = start + height * 2;
      const maxTextWidth = length - height * 3;
      
      // Truncate text if it's too long
      let displayName = layer.name;
      const textWidth = this.ctx.measureText(displayName).width;
      if (textWidth > maxTextWidth) {
        while (this.ctx.measureText(displayName + '...').width > maxTextWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      
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
    this.layerHeight = 30; // Height per layer
    this.minLayerSpacing = 10; // Minimum space between layers
    this.contentPadding = 10; // Padding around content
    
    // Create time marker handler
    this.timeMarker = new TimeMarker({
      height: 20,
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
   * @param {string} action - The action that occurred ('select', 'delete', 'clone', 'split')
   * @param {StandardLayer} layer - The layer that was affected
   * @param {StandardLayer|null} [oldLayer] - The previous layer (for 'select' action)
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
      if (this.intersectsTime(this.selectedLayer.start_time + this.selectedLayer.totalTimeInMilSeconds, time)) {
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
    this.timelineCtx.clearRect(0, 0, this.timelineCanvas.clientWidth, this.timelineCanvas.clientWidth);
    this.#updateTotalTime(layers);
    
    // Update layer renderer properties
    this.layerRenderer.updateProperties(this.totalTime, this.timelineCanvas.clientWidth);
    
    // Calculate the available height for layers (excluding the time marker height)
    const availableHeight = this.timelineCanvas.clientHeight - this.timeMarker.height;
    
    // Calculate vertical positions based on available height (below time marker)
    let verticalPositionSpace = availableHeight / (layers.length + 1);
    let verticalPosition = this.timelineCanvas.clientHeight - verticalPositionSpace;

    for (let layer of layers) {
      let selected = this.selectedLayer === layer;
      // Use the layer renderer to render each layer
      this.layerRenderer.renderLayer(layer, verticalPosition, 20, selected);
      verticalPosition -= verticalPositionSpace;
    }

    this.timeMarker.render(this.timelineCtx, this.timelineCanvas.clientWidth, this.totalTime);

    // Render line markers on top of all other elements
    this.#renderLineMarker(this.playerTime);

    if (this.isHover) {
      this.#renderLineMarker(this.time);
      this.previewHandler.render(this.time, layers);
    }
  }


  #renderLineMarker(time) {
    let x = this.timelineCanvas.clientWidth * time / this.totalTime;
    this.timelineCtx.fillStyle = `rgb(192,200,213)`;
    this.timelineCtx.fillRect(x, 0, 2, this.timelineCanvas.clientHeight);
    this.timelineCtx.font = "10px sans-serif";
    
    // Position the text in a way that doesn't overlap with the time marker
    this.timelineCtx.fillText(time.toFixed(2), x + 5, this.timeMarker.height + 15);
    this.timelineCtx.fillText(this.totalTime.toFixed(2), x + 5, this.timeMarker.height + 30);
  }



  /**
   * Select a layer based on the event position
   * @param {Event} ev - The pointer event
   * @returns {boolean} - Whether a layer was selected
   */
  #selectLayer(ev) {
    const availableHeight = this.timelineCanvas.clientHeight - this.timeMarker.height;
    
    let verticalSpacing = availableHeight / (this.layers.length + 1);
    let verticalPosition = this.timelineCanvas.clientHeight;

    for (let layer of this.layers) {
      verticalPosition -= verticalSpacing;
      if (!this.#canSelectLayer(layer)) {
        continue;
      }
      //checks if ev.offsetY is within 5% of the height of the timeline canvas
      if (Math.abs(ev.offsetY - verticalPosition) < (0.05 * this.timelineCanvas.clientHeight)) {
        this.setSelectedLayer(layer);
        return true;
      }
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

  /**
   * Update the total time of the player based on the layers
   * 
   * @param {StandardLayer[]} layers - The layers to check
   */
  #updateTotalTime(layers) {
    for (let layer of layers) {
      if (layer.start_time + layer.totalTimeInMilSeconds > this.totalTime) {
        this.totalTime = layer.start_time + layer.totalTimeInMilSeconds;
      }
    }
  }
}

