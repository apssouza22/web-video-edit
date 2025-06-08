import {FlexibleLayer} from './layer-common.js';
import {LayersSidebarView} from './layer-view.js';
import {AudioLayer} from './layer-audio.js';
import {VideoLayer} from './layer-video.js';
import {ImageLayer} from './layer-image.js';
import {TextLayer} from './layer-text.js';
import {ext_map} from '../studio/utils.js';

/**
 * LayerLoader class responsible for loading layers from JSON data
 */
export class LayerLoader {
  /**
   * Constructor for LayerLoader
   * @param {VideoStudio} player - The player instance that will own the layers
   * @param {LayersSidebarView} viewHandler - The view handler for layer UI management
   */
  constructor(player, viewHandler) {
    this.viewHandler = viewHandler || new LayersSidebarView(player);
  }

  /**
   * Add a layer to the player
   *
   * @param {StandardLayer} layer
   * @returns {FlexibleLayer} The added layer
   */
  insertLayer(layer) {
    return this.viewHandler.addLayer(layer);
  }

  /**
   * Add a layer from a file
   *
   * @param {File} file
   * @returns {FlexibleLayer[]} The added layer
   */
  addLayerFromFile(file) {
    let layers = [];
    if (file.type.indexOf('video') >= 0) {
      layers.push(this.insertLayer(new VideoLayer(file)));
      layers.push(this.insertLayer(new AudioLayer(file)));
    }
    if (file.type.indexOf('image') >= 0) {
      layers.push(this.insertLayer(new ImageLayer(file)));
    }
    if (file.type.indexOf('audio') >= 0) {
      layers.push(this.insertLayer(new AudioLayer(file)));
    }
    return layers;
  }

  /**
   * Load a layer from a URI
   *
   * @param {string} uri
   * @returns {FlexibleLayer[]} Promise that resolves to the added layer
   */
  async loadLayerFromURI(uri) {
    if (!uri) {
      return;
    }
    const extension = uri.split(/[#?]/)[0].split('.').pop().trim();

    let metadata = {
      type: ext_map[extension]
    };
    let response = await fetch(uri);
    let data = await response.blob();

    let segs = uri.split("/");
    let name = segs[segs.length - 1];
    let file = new File([data], name, metadata);
    file.uri = uri;
    return this.addLayerFromFile(file);
  }

  /**
   * Load layers from JSON data
   * @param {Array} layers - Array of layer data objects
   * @returns {FlexibleLayer[]} - Promise that resolves when all layers are loaded
   */
  async loadLayersFromJson(layers) {
    const allLayers = [];
    for (let layer_d of layers) {
      let layersCreated = [];
      if (layer_d.type == "VideoLayer") {
        const l = await this.loadLayerFromURI(layer_d.uri);
        layersCreated.push(...l);
      }
      if (layer_d.type == "TextLayer") {
        const layer = this.insertLayer(new TextLayer(layer_d.name));
        layersCreated.push(layer);
      }
      if (layer_d.type == "ImageLayer") {
        const l = await this.loadLayerFromURI(layer_d.uri);
        layersCreated.push(...l);
      }

      if (!layersCreated.length) {
        alert("Layer couldn't be processed.");
        continue;
      }
      allLayers.push(...layersCreated);

      layersCreated.forEach(layer => {
        layer.addLoadUpdateListener((l, progress, ctx, audioBuffer) => {
          if (progress < 100) {
            return
          }
          layer.name = layer.name;
          layer.width = layer_d.width;
          layer.height = layer_d.height;
          layer.start_time = layer_d.start_time;
          layer.total_time = layer_d.total_time;

          if (layer_d.frames) {
            layer.framesCollection.frames = [];
            for (let f of layer_d.frames) {
              layer.framesCollection.push(new Float32Array(f));
            }
          }
        });
      })
    }
    return allLayers;
  }
}
