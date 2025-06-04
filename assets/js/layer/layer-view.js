/**
 * LayersSidebarView class responsible for managing the layer preview UI elements
 */
class LayersSidebarView {
  /**
   * Constructor for LayerManagementViewHandler
   * @param {VideoStudio} studio - The studio instance that will own the layers
   */
  constructor(studio) {
    this.studio = studio;
    this.layersHolder = document.getElementById('layers');
    this.selectedLayer = null;
    this.selectedLayerUpdateListener = null;
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
    let title = document.createElement('div');
    layerItemHolder.classList.toggle('preview');

    layerItemHolder.setAttribute('draggable', true);
    this.#setupDragEvents(layerItemHolder, layer);
    this.#setupClickEvents(layerItemHolder, layer);

    thumb.classList.toggle('preview_thumb');
    title.classList.toggle('preview_title');
    layerItemHolder.appendChild(thumb);
    layerItemHolder.appendChild(title);
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

    layer.start_time = this.studio.player.time;

    layer.init(this.studio.player.width, this.studio.player.height, this.studio.player.audioContext);

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
    const titleDiv = this.#addDescription(layer, layerItemHolder);
    this.#addDeleteButton(layer, titleDiv);
    this.#updateLayerName(layer);
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
    const layerItemHolder = this.layerItemsUI[layer.id].box;
    layerItemHolder.querySelector(".description").textContent = "\"" + layer.name + "\"";
  }

  /**
   * Adds the description element to the layer UI
   * @param {StandardLayer} layer - The layer to add description for
   * @param {HTMLElement} layerItemHolder - The layer's UI container
   */
  #addDescription(layer, layerItemHolder) {
    const description = document.createElement('span');
    description.classList.toggle('description');
    description.addEventListener('click', (e) => {
      const new_text = prompt("Enter new text:");
      if (new_text) {
        layer.name = new_text;
        this.#updateLayerName(layer);
      }
    });

    const titleDiv = layerItemHolder.querySelector('.preview_title');
    titleDiv.appendChild(description);

    return titleDiv;
  }

  /**
   * Adds the delete button to the layer UI
   * @param {StandardLayer} layer - The layer to add delete button for
   * @param {HTMLElement} titleDiv - The layer's UI container
   */
  #addDeleteButton(layer, titleDiv) {
    let delete_option = document.createElement('a');
    delete_option.textContent = '[x]';
    delete_option.style.float = "right";
    delete_option.addEventListener('click', () => {
      if (confirm("Delete layer \"" + layer.name + "\"?")) {
        if (this.layerUpdateListener) {
          this.layerUpdateListener('delete', layer, null);
        } else {
          // Fallback to old method if no new listener
          this.studio.remove(layer);
        }
      }
    });
    titleDiv.appendChild(delete_option);
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
   * Adds a listener for changes to the selected layer
   * @param {Function} listener - Function to call when selected layer changes
   */
  addSelectedLayerUpdateListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Selected layer update listener must be a function');
    }
    this.selectedLayerUpdateListener = listener;
  }

  setSelectedLayer(layer) {
    this.#deselect();
    const oldSelectedLayer = this.selectedLayer;
    this.selectedLayer = layer;
    if (oldSelectedLayer !== layer && this.selectedLayerUpdateListener) {
      this.selectedLayerUpdateListener(layer, oldSelectedLayer);
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
    console.log("Updating layer thumb for layer:", ctx);
    drawScaled(ctx, this.layerItemsUI[layer.id].ctx);
  }

  resize() {
    for (let layer of this.layers) {
      let ctxOut = this.layerItemsUI[layer.id].ctx;
      let canvas = this.layerItemsUI[layer.id].canvas;
      ctxOut.scale(dpr, dpr);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    }
  }
}
