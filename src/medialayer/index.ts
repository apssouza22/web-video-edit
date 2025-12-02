import {VideoMedia} from './video';
import {ImageMedia} from './image';
import {AudioMedia} from './audio';
import {MediaService} from './media-service';
import {MediaLayer} from './types';
import {AbstractMedia} from './media-common';
import {TextMedia} from "@/medialayer/text";
import {CaptionMedia, TranscriptionChunk} from "@/medialayer/caption";
import {getEventBus, MediaLoadUpdateEvent} from "@/common";

export {AbstractMedia, addElementToBackground} from './media-common';
export {MediaService} from './media-service';
export {SpeedController} from './speed-controller';
export type {MediaLayer, ESAudioContext} from './types';

/**
 * Creates a LayerService instance
 */
export function createMediaService(): MediaService {
  return new MediaService();
}

export function createMediaFromFile(file: File): Array<AbstractMedia> {
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

function onLoadUpdateListener(
    layer: any,
    progress: number,
    audioBuffer?: AudioBuffer | null
): void {
  getEventBus().emit(new MediaLoadUpdateEvent(layer, progress, audioBuffer));
}

export function createMediaText(text: string): AbstractMedia {
  return new TextMedia(text)
}

export function createMediaCaption(transcription: TranscriptionChunk[]): AbstractMedia {
  return new CaptionMedia(transcription);
}

export function isMediaAudio(layer: AbstractMedia):boolean {
  return layer instanceof AudioMedia;
}

export function isMediaVideo(layer: AbstractMedia):boolean {
  return layer instanceof VideoMedia;
}