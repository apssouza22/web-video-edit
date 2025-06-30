import {LayerService} from "./operations.js";
import {TextLayer} from "./layer-text.js";
import {VideoLayer} from "./layer-video.js";
import {AudioLayer} from "./layer-audio.js";
import {ImageLayer} from "./layer-image.js";

export class LayerFactory{
  /**
   * Creates a LayerService instance with the provided listener.
   * @param {Function} onLayerLoadUploadListener - Callback for layer load updates.
   * @returns {LayerService} A new LayerService instance.
   */
  static createService(onLayerLoadUploadListener) {
    return new LayerService(onLayerLoadUploadListener);
  }

  static createLayer(layerType, file, name) {
    switch (layerType) {
      case 'text':
        return new TextLayer(name);
      case 'video':
        return new VideoLayer(file);
      case 'audio':
        return new AudioLayer(file);
      case 'image':
        return new ImageLayer(file);
      default:
        console.error('Unknown layer type:', layerType);
        return null;
    }
  }
}