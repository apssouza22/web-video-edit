import { VideoLayer } from './video';
import { ImageLayer } from './image';
import { TextLayer } from './text';
import { AudioLayer } from './audio';
import { MediaService } from './media-service';
import { LayerType, LayerFile, LayerLoadUpdateListener } from './types';
import { AbstractMedia } from './media-common';

export { AbstractMedia, FlexibleLayer, addElementToBackground } from './media-common';
export { VideoLayer } from './video';
export { ImageLayer } from './image';
export { TextLayer } from './text';
export { AudioLayer } from './audio';
export { MediaService } from './media-service';
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

