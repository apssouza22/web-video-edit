import { VideoLayer } from './layer-video.js';
import { AudioLayer } from './layer-audio.js';
import { ImageLayer } from './layer-image.js';
import { TextLayer } from './layer-text.js';
import { LayerService } from './operations.js';

export { StandardLayer, FlexibleLayer, addElementToBackground } from './layer-common.js';
export { VideoLayer } from './layer-video.js';
export { AudioLayer } from './layer-audio.js';
export { ImageLayer } from './layer-image.js';
export { TextLayer } from './layer-text.js';
export { LayersSidebarView } from './layer-view.js';

/**
 * Creates a LayerService instance with the provided listener.
 * @param {Function} onLayerLoadUploadListener - Callback for layer load updates.
 * @returns {LayerService} A new LayerService instance.
 */
export function createLayerService(onLayerLoadUploadListener) {
  return new LayerService(onLayerLoadUploadListener);
}

export function createLayer(layerType, file, name) {
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