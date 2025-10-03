import { VideoLayer } from '@/layer/layer-video';
import { ImageLayer } from './layer-image';
import { TextLayer } from './layer-text';
import { AudioLayer } from './layer-audio';
import { LayerService } from './operations';
import { LayerType, LayerFile, LayerLoadUpdateListener } from './types';
import { StandardLayer } from './layer-common';

export { StandardLayer, FlexibleLayer, addElementToBackground } from './layer-common';
export { VideoLayer } from './layer-video';
export { ImageLayer } from './layer-image';
export { TextLayer } from './layer-text';
export { LayerService } from './operations';
export { SpeedController } from './speed-controller';



/**
 * Creates a LayerService instance with the provided listener.
 */
export function createLayerService(onLayerLoadUploadListener: LayerLoadUpdateListener): LayerService {
  return new LayerService(onLayerLoadUploadListener);
}

/**
 * Creates a layer of the specified type
 */
export  function createLayer(layerType: LayerType, file: LayerFile, name?: string): StandardLayer {
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

