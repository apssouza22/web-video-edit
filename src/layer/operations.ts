import { TextLayer } from "./layer-text";
import { VideoLayer } from "./layer-video";
import { ImageLayer } from "./layer-image";
import { AudioLayer } from "../audio/layer-audio";
import { LayerServiceInterface, LayerLoadUpdateListener } from "./types";

export class LayerService implements LayerServiceInterface {
  private onLayerLoadUpdate: LayerLoadUpdateListener;

  constructor(onLayerLoadUploadListener: LayerLoadUpdateListener) {
    this.onLayerLoadUpdate = onLayerLoadUploadListener;
  }

  clone(layer: any): any | null {
    const newLayer = this.#create(layer);
    if (!newLayer) {
      console.error('Cannot clone layer of type:', layer.constructor.name);
      return null;
    }

    const cloneStartTime = layer.start_time + 100; // 100ms offset
    newLayer.start_time = layer.start_time;
    newLayer.id = layer.id + '-clone';
    newLayer.start_time = cloneStartTime;
    newLayer.color = layer.color;
    newLayer.shadow = layer.shadow;
    newLayer.totalTimeInMilSeconds = layer.totalTimeInMilSeconds;
    newLayer.width = layer.width;
    newLayer.height = layer.height;
    newLayer.canvas.width = layer.canvas.width;
    newLayer.canvas.height = layer.canvas.height;
    newLayer.framesCollection.frames = [...layer.framesCollection.frames];
    newLayer.ready = true;
    newLayer.addLoadUpdateListener((l: any, progress: number, ctx: CanvasRenderingContext2D | null, audioBuffer?: AudioBuffer | null) => {
      this.onLayerLoadUpdate(l, progress, ctx, audioBuffer);
    });
    newLayer.loadUpdateListener(newLayer, 100, newLayer.ctx, newLayer.audioBuffer);
    return newLayer;
  }

  #create(layer: any): any | null {
    if (!layer.ready) {
      console.error('Cannot clone VideoLayer that is not ready');
      return null;
    }

    const cloneName = layer.name + " [Clone]";
    
    if (layer instanceof TextLayer) {
      return new TextLayer(cloneName);
    }
    
    if (layer instanceof VideoLayer) {
      const videoLayer = new VideoLayer(layer.file!, true, layer.useHtmlDemux);
      videoLayer.name = cloneName;
      return videoLayer;
    }
    
    // Handle AudioLayer (imported from external module)
    if (layer.constructor.name === 'AudioLayer') {
      if (AudioLayer) {
        const audioLayer = new AudioLayer(layer.file, true);
        audioLayer.name = cloneName;
        audioLayer.playerAudioContext = layer.playerAudioContext;
        audioLayer.audioBuffer = layer.audioBuffer;
        return audioLayer;
      }
    }

    if (layer instanceof ImageLayer) {
      const imageLayer = new ImageLayer(layer.file!);
      imageLayer.name = cloneName;
      return imageLayer;
    }
    
    return null;
  }

}
