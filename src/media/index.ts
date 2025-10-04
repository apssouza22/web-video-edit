import { VideoLayer } from './layer-video';
import { ImageLayer } from './layer-image';
import { TextLayer } from './layer-text';
import { AudioLayer } from './audio';
import { MediaService } from './operations';
import { LayerType, LayerFile, LayerLoadUpdateListener } from './types';
import { AbstractMedia } from './layer-common';

export { AbstractMedia, FlexibleLayer, addElementToBackground } from './layer-common';
export { VideoLayer } from './layer-video';
export { ImageLayer } from './layer-image';
export { TextLayer } from './layer-text';
export { AudioLayer } from './audio';
export { MediaService } from './operations';
export { SpeedController } from './speed-controller';



/**
 * Creates a LayerService instance with the provided listener.
 */
export function createMediaService(onLayerLoadUploadListener: LayerLoadUpdateListener): MediaService {
  return new MediaService(onLayerLoadUploadListener);
}

/**
 * Creates a layer of the specified type
 */
export  function createLayer(layerType: LayerType, file: LayerFile, name?: string): AbstractMedia {
  switch (layerType) {
    case 'text':
      return new TextLayer(name || file.name);
    
    case 'video':
      return new VideoLayer(file);
    
    case 'audio': {
        return new AudioLayer(file);
    }
    
    case 'image':
      return new ImageLayer(file);
    
    default:
      throw new Error('Unknown layer type: ' + layerType);
  }
}

