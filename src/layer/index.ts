import { VideoLayer } from '@/layer/layer-video';
import { ImageLayer } from './layer-image';
import { TextLayer } from './layer-text';
import { LayerService } from './operations';
import { LayerType, LayerFile, LayerLoadUpdateListener, LayerInterface } from './types';

// Re-export base classes and utility function
export { StandardLayer, FlexibleLayer, addElementToBackground } from './layer-common';
export { VideoLayer } from './layer-video';
export { ImageLayer } from './layer-image';
export { TextLayer } from './layer-text';
export { LayerService } from './operations';
export { SpeedController } from './speed-controller';

// Re-export types
export * from './types';

// Dynamic import for AudioLayer to avoid circular dependencies
async function importAudioLayer(): Promise<any> {
  try {
    const audioModule = await import('../audio/layer-audio');
    return audioModule.AudioLayer;
  } catch (error) {
    console.error('Failed to import AudioLayer:', error);
    return null;
  }
}

/**
 * Creates a LayerService instance with the provided listener.
 */
export function createLayerService(onLayerLoadUploadListener: LayerLoadUpdateListener): LayerService {
  return new LayerService(onLayerLoadUploadListener);
}

/**
 * Creates a layer of the specified type
 */
export async function createLayer(layerType: LayerType, file: LayerFile, name?: string): Promise<LayerInterface | null> {
  switch (layerType) {
    case 'text':
      return new TextLayer(name || file.name);
    
    case 'video':
      return new VideoLayer(file);
    
    case 'audio': {
      const AudioLayer = await importAudioLayer();
      if (AudioLayer) {
        return new AudioLayer(file);
      }
      console.error('AudioLayer not available');
      return null;
    }
    
    case 'image':
      return new ImageLayer(file);
    
    default:
      console.error('Unknown layer type:', layerType);
      return null;
  }
}

/**
 * Synchronous version of createLayer for compatibility
 * Note: This won't work for AudioLayer which requires async import
 */
export function createLayerSync(layerType: LayerType, file: LayerFile, name?: string): LayerInterface | null {
  switch (layerType) {
    case 'text':
      return new TextLayer(name || file.name);
    
    case 'video':
      return new VideoLayer(file);
    
    case 'image':
      return new ImageLayer(file);
    
    case 'audio':
      console.warn('AudioLayer requires async import, use createLayer instead');
      return null;
    
    default:
      console.error('Unknown layer type:', layerType);
      return null;
  }
}
