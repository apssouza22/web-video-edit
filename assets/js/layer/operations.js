import { TextLayer, VideoLayer, AudioLayer, ImageLayer } from "./index.js";

export class LayerService {

  constructor(onLayerLoadUploadListener) {
    this.onLayerLoadUpdate = onLayerLoadUploadListener;
  }

  clone(layer) {
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
    newLayer.addLoadUpdateListener((l, progress, ctx, audioBuffer) => {
      this.onLayerLoadUpdate(l, progress, ctx, audioBuffer);
    });
    newLayer.loadUpdateListener(newLayer, 100, newLayer.ctx, newLayer.audioBuffer);
    return newLayer;
  }

  #create(layer) {
    if (!layer.ready) {
      console.error('Cannot clone VideoLayer that is not ready');
      return;
    }

    const cloneName = layer.name + " [Clone]";
    if (layer instanceof TextLayer) {
      return new TextLayer(cloneName);
    }
    if (layer instanceof VideoLayer) {
      const videoLayer = new VideoLayer(layer.file,true, layer.useHtmlDemux);
      videoLayer.name = cloneName;
      return videoLayer;
    }
    if (layer instanceof AudioLayer) {
      const audioLayer = new AudioLayer(layer.file, true);
      audioLayer.name = cloneName;
      audioLayer.playerAudioContext = layer.playerAudioContext;
      audioLayer.audioBuffer = layer.audioBuffer;
      return audioLayer
    }

    if (layer instanceof ImageLayer) {
      const imageLayer = new ImageLayer(layer.file);
      imageLayer.name = cloneName;
      return imageLayer;
    }
    return null;
  }
}