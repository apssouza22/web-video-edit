import { FlexibleLayer, AudioLayer, VideoLayer, ImageLayer, TextLayer } from '../layer/index.js';
import { ext_map } from './index.js';
import { Frame } from '../frame/frame.js';

/**
 * LayerLoader class responsible for loading layers from JSON data
 */
export class LayerLoader {

  /**
   * Constructor for LayerLoader
   * @param {VideoStudio} studio - The studio instance that will own the layers
   */
  constructor(studio) {
    this.studio = studio;
  }


  /**
   * Add a layer from a file
   *
   * @param {File} file
   * @param useHtmlDemux
   * @returns {FlexibleLayer[]} The added layer
   */
  addLayerFromFile(file, useHtmlDemux = false) {
    let layers = [];
    if (file.type.indexOf('video') >= 0) {
      layers.push(this.studio.addLayer(new AudioLayer(file)));
      layers.push(this.studio.addLayer(new VideoLayer(file, false, useHtmlDemux)));
    }
    if (file.type.indexOf('image') >= 0) {
      layers.push(this.studio.addLayer(new ImageLayer(file)));
    }
    if (file.type.indexOf('audio') >= 0) {
      layers.push(this.studio.addLayer(new AudioLayer(file)));
    }
    return layers;
  }

  /**
   * Load a layer from a URI
   *
   * @param {string} uri
   * @returns {Promise<FlexibleLayer[]>} Promise that resolves to the added layer
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
      let layersCreated = await this.#loadLayerType(layer_d);

      if (!layersCreated.length) {
        alert("Layer couldn't be processed.");
        continue;
      }
      allLayers.push(...layersCreated);
      this.#addOnLoadUpdateListener(layersCreated, layer_d);
    }
    return allLayers;
  }

  #addOnLoadUpdateListener(layersCreated, layer_d) {
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
            layer.framesCollection.push(Frame.fromArray(new Float32Array(f)));
          }
        }
      });
    })
  }

  async #loadLayerType(layer_d) {
    let layersCreated = [];
    if (layer_d.type === "VideoLayer") {
      const l = await this.loadLayerFromURI(layer_d.uri);
      layersCreated.push(...l);
    }
    if (layer_d.type === "TextLayer") {
      const layer = this.studio.addLayer(new TextLayer(layer_d.name));
      layersCreated.push(layer);
    }
    if (layer_d.type === "ImageLayer") {
      const l = await this.loadLayerFromURI(layer_d.uri);
      layersCreated.push(...l);
    }
    return layersCreated;
  }
}