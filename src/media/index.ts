import {VideoMedia} from './video';
import {ImageMedia} from './image';
import {AudioMedia} from './audio';
import {MediaService} from './media-service';
import {LayerLoadUpdateListener} from './types';
import {AbstractMedia} from './media-common';
import {TextMedia} from "@/media/text";
import {AudioService} from "@/audio";

export {AbstractMedia, FlexibleLayer, addElementToBackground} from './media-common';
export {MediaService} from './media-service';
export {SpeedController} from './speed-controller';

/**
 * Creates a LayerService instance with the provided listener.
 */
export function createMediaService(onLayerLoadUploadListener: LayerLoadUpdateListener, audioService: AudioService): MediaService {
  return new MediaService(onLayerLoadUploadListener, audioService);
}

export function createMediaFromFile(file: File, onLoadUpdateListener: LayerLoadUpdateListener): Array<AbstractMedia> {
  const layers: AbstractMedia[] = [];
  if (file.type.indexOf('video') >= 0) {
    layers.push(new AudioMedia(file));
    layers.push(new VideoMedia(file, false));
  }
  if (file.type.indexOf('image') >= 0) {
    layers.push(new ImageMedia(file));
  }
  if (file.type.indexOf('audio') >= 0) {
    layers.push(new AudioMedia(file));
  }
  layers.forEach(layer => {
    layer.addLoadUpdateListener(onLoadUpdateListener);
  });
  return layers;
}

export function createMediaText(text: string, onLoadUpdateListener: LayerLoadUpdateListener): AbstractMedia {
  return new TextMedia(text)
}

export function isMediaAudio(layer: AbstractMedia):boolean {
  return layer instanceof AudioMedia;
}

export function isMediaVideo(layer: AbstractMedia):boolean {
  return layer instanceof VideoMedia;
}