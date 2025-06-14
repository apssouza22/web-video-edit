import { dpr } from '../constants.js';
import { drawScaled } from './layer-common.js';

/**
 * LayersSidebarView class responsible for managing the layer preview UI elements
 */
export class LayersSidebarView {
  /**
   * Constructor for LayerManagementViewHandler
   * @param {VideoStudio} studio - The studio instance that will own the layers
   */
  constructor(studio) {
    this.studio = studio;
    this.layersHolder = document.getElementById('layers');
    this.selectedLayer = null;
    this.layerUpdateListener = null;
    /**
     * @type {StandardLayer[]}
     */
    this.layers = [];
    this.layerItemsUI = {};
    this.layerUIItemDragging = null;
    this.layerDragging = null;
  }

  render(time) {
    for (let layer of this.layers) {
      let ctxOut = this.layerItemsUI[layer.id].ctx;
      let canvas = this.layerItemsUI[layer.id].canvas;
      if(this.layerItemsUI[layer.id].rendered) {
        continue;
      }
      this.layerItemsUI[layer.id].rendered = true;

      ctxOut.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      layer.render(ctxOut, time, false);
    }
  }

  /**
   *
   * @param {StandardLayer} layer - The layer to create UI for
   */
  #createLayerUIItem(layer) {
    let layerItemHolder = document.createElement('div');
    let thumb = document.createElement('canvas');
    layerItemHolder.classList.toggle('preview');

    layerItemHolder.setAttribute('draggable', true);
    this.#setupDragEvents(layerItemHolder, layer);
    this.#setupClickEvents(layerItemHolder, layer);

    thumb.classList.toggle('preview_thumb');
    // Set 16:9 aspect ratio for the canvas
    thumb.style.aspectRatio = '16 / 9';
    thumb.style.width = '100%';
    // Add title attribute for hover text
    thumb.title = layer.name;
    
    layerItemHolder.appendChild(thumb);
    this.layersHolder.prepend(layerItemHolder);

    return layerItemHolder;
  }

  /**
   * Setup drag-related events for a layer UI element
   *
   * @param {HTMLElement} layerItemHolder - The layer item holder element
   * @param {StandardLayer} layer - The associated layer
   */
  #setupDragEvents(layerItemHolder, layer) {
    layerItemHolder.addEventListener('dragstart', (ev) => {
      this.layerUIItemDragging = layerItemHolder;
      this.layerDragging = layer;
    });

    layerItemHolder.addEventListener('dragover', function (ev) {
      ev.preventDefault();
    });

    layerItemHolder.addEventListener('drop', (ev) => {
      layerItemHolder.before(this.layerUIItemDragging);
      let idx = this.layers.indexOf(this.layerDragging);
      if (idx > -1) {
        this.layers.splice(idx, 1);
      }
      let new_idx = this.layers.indexOf(layer);

      this.setSelectedLayer(this.layerDragging);
      this.layers.splice(new_idx + 1, 0, this.layerDragging);

      this.layerUIItemDragging = null;
      this.layerDragging = null;
    });
  }

  /**
   * Setup click events for a layer UI element
   *
   * @param {HTMLElement} layerItemHolder - The layer item holder element
   * @param {StandardLayer} layer - The associated layer
   */
  #setupClickEvents(layerItemHolder, layer) {
    layerItemHolder.addEventListener('click', () => {
      this.setSelectedLayer(layer);
    });
  }

  #deselect() {
    if (this.selectedLayer !== null) {
      this.layerItemsUI[this.selectedLayer.id].box.classList.toggle('selected');
    }
  }

  /**
   * Add a layer to the player and create its UI
   *
   * @param {StandardLayer} layer - The layer to add
   * @returns {StandardLayer} The added layer
   */
  addLayer(layer) {
    let layerItemHolder = this.#createLayerUIItem(layer);
    let canvas = layerItemHolder.querySelector('canvas');
    this.layerItemsUI[layer.id] = {
      "box": layerItemHolder,
      "canvas": canvas,
      "ctx": canvas.getContext('2d', {willReadFrequently: true})
    };

    this.#setupLayerUI(layer, layerItemHolder);
    this.layers.push(layer);
    this.setSelectedLayer(layer);

    return layer;
  }

  /**
   * Sets up the UI elements for a layer
   * @param {StandardLayer} layer - The layer to set up UI for
   * @param {HTMLElement} layerItemHolder - The layer's UI container
   */
  #setupLayerUI(layer, layerItemHolder) {
    const thumb_canvas = layerItemHolder.querySelector('canvas');
    const thumb_ctx = thumb_canvas.getContext('2d');
    thumb_ctx.scale(dpr, dpr);
    layer.thumb_ctx = thumb_ctx;
    
    // Add right-click context menu for layer operations
    this.#setupContextMenu(layer, layerItemHolder);
  }

  /**
   * Sets up context menu for layer operations (delete)
   * @param {StandardLayer} layer - The layer to set up context menu for
   * @param {HTMLElement} layerItemHolder - The layer's UI container
   */
  #setupContextMenu(layer, layerItemHolder) {
    layerItemHolder.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      const menu = document.createElement('div');
      menu.className = 'layer-context-menu';
      menu.style.left = e.pageX + 'px';
      menu.style.top = e.pageY + 'px';

      const cloneOption = document.createElement('div');
      cloneOption.className = 'layer-context-menu-item clone';
      cloneOption.textContent = 'Clone Layer';
      cloneOption.addEventListener('click', () => {
        if (this.layerUpdateListener) {
          this.layerUpdateListener('clone', layer, null);
        }
        document.body.removeChild(menu);
      });

      const deleteOption = document.createElement('div');
      deleteOption.className = 'layer-context-menu-item delete';
      deleteOption.textContent = 'Delete Layer';
      deleteOption.addEventListener('click', () => {
        if (confirm("Delete layer \"" + layer.name + "\"?")) {
          if (this.layerUpdateListener) {
            this.layerUpdateListener('delete', layer, null);
          } else {
            // Fallback to old method if no new listener
            this.studio.remove(layer);
          }
        }
        document.body.removeChild(menu);
      });

      menu.appendChild(cloneOption);
      menu.appendChild(deleteOption);
      document.body.appendChild(menu);

      // Remove menu when clicking elsewhere
      const removeMenu = (event) => {
        if (!menu.contains(event.target) && document.body.contains(menu)  ) {
          document.body.removeChild(menu);
          document.removeEventListener('click', removeMenu);
        }
      };
      setTimeout(() => document.addEventListener('click', removeMenu), 0);
    });
  }

  /**
   * Updates the layer name in the UI
   * @param {StandardLayer} layer - The layer to update the name for
   */
  #updateLayerName(layer) {
    if (!this.layerItemsUI[layer.id]) {
      console.warn("Layer UI not found for layer:", layer.name);
      return;
    }
    const canvas = this.layerItemsUI[layer.id].canvas;
    canvas.title = layer.name;
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


  setSelectedLayer(layer) {
    this.#deselect();
    const oldSelectedLayer = this.selectedLayer;
    this.selectedLayer = layer;
    if (oldSelectedLayer !== layer ) {
      this.layerUpdateListener('select', layer, oldSelectedLayer);
    }
    this.layerItemsUI[this.selectedLayer.id].box.classList.toggle('selected');
  }

  /**
   * Updates a layer's name and refreshes the UI
   * @param {StandardLayer} layer - The layer to update
   * @param {string} name - The new name for the layer
   */
  updateLayerName(layer, name) {
    layer.name = name;
    this.#updateLayerName(layer);
  }

  updateLayerThumb(layer, ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawScaled(ctx, this.layerItemsUI[layer.id].ctx);
  }

  resize() {
    for (let layer of this.layers) {
      let ctxOut = this.layerItemsUI[layer.id].ctx;
      let canvas = this.layerItemsUI[layer.id].canvas;
      
      // Maintain 16:9 aspect ratio
      const width = canvas.clientWidth;
      const height = width * 9 / 16;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.height = height + 'px';
      
      ctxOut.scale(dpr, dpr);
    }
  }
}
