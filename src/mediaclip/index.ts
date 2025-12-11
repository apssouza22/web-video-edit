import {VideoMedia} from './video';
import {ImageMedia} from './image';
import {AudioMedia} from './audio/audio';
import {MediaService} from './media-service';
import {AbstractMedia} from './media-common';
import {TextMedia} from "./text";
import {CaptionMedia, TranscriptionChunk} from "./caption";
import {ShapeMedia, ShapeType} from './shape';
import {getEventBus, MediaLoadUpdateEvent} from "@/common";
import {MediaLoader} from "@/mediaclip/mediasource";

export {AbstractMedia, addElementToBackground} from './media-common';
export {MediaService} from './media-service';
export {SpeedController} from './speed-controller';
export {ShapeMedia, ShapeType} from './shape';
export type {ShapeStyle, ShapeConfig} from './shape';
export type {MediaLayer, ESAudioContext} from './types';

export function createMediaService(): MediaService {
  return new MediaService();
}

export async function createMediaFromFile(file: File): Promise<Array<AbstractMedia>> {
  const layers: AbstractMedia[] = [];
  
  if (file.type.indexOf('video') >= 0) {
    const [frameSource, audioFrameSource] = await Promise.all([
      MediaLoader.loadVideoMedia(file, (progress) => {
        notifyProgress(layers, progress - 1);
      }),
      MediaLoader.loadAudioMedia(file)
    ]);
    
    const videoMedia = new VideoMedia(file.name, frameSource);
    const audioMedia = new AudioMedia(file.name, audioFrameSource);
    layers.push(videoMedia);
    layers.push(audioMedia);
    onLoadUpdateListener(videoMedia, 100);
    onLoadUpdateListener(audioMedia, 100, audioFrameSource.audioBuffer);
  }
  
  if (file.type.indexOf('image') >= 0) {
    const frameSource = await MediaLoader.loadImageMedia(file, (progress) => {
      notifyProgress(layers, progress);
      if (progress === 100) {
        onLoadUpdateListener(layers[0], 100);
      }
    });
    const imageMedia = new ImageMedia(file.name, frameSource);
    layers.push(imageMedia);
    onLoadUpdateListener(imageMedia, 100);
  }
  
  if (file.type.indexOf('audio') >= 0) {
    const audioFrameSource = await MediaLoader.loadAudioMedia(file);
    const audioMedia = new AudioMedia(file.name, audioFrameSource);
    layers.push(audioMedia);
    onLoadUpdateListener(audioMedia, 100, audioFrameSource.audioBuffer);
  }
  
  layers.forEach(layer => {
    if (!layer.addLoadUpdateListener) return;
    layer.addLoadUpdateListener(onLoadUpdateListener);
  });
  
  return layers;
}

function notifyProgress(layers: AbstractMedia[], progress: number): void {
  layers.forEach(layer => {
    onLoadUpdateListener(layer, progress);
  });
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

export function createMediaShape(shapeType: ShapeType): AbstractMedia {
  return new ShapeMedia(shapeType);
}

export function isMediaAudio(layer: AbstractMedia):boolean {
  return layer instanceof AudioMedia;
}

export function isMediaVideo(layer: AbstractMedia):boolean {
  return layer instanceof VideoMedia;
}
