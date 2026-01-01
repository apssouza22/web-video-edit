import {VideoMedia} from './video';
import {ImageMedia} from './image';
import {AudioMedia} from './audio/audio';
import {MediaService} from './media-service';
import {AbstractClip} from './media-common';
import {TextMedia} from "./text";
import {CaptionMedia} from "./caption";
import {ShapeMedia, ShapeType} from './shape';
import {getEventBus, MediaLoadUpdateEvent} from "@/common";
import {MediaLoader} from "@/mediaclip/mediasource";
import {TranscriptionResult} from "@/transcription/types";
import {ComposedMedia} from "@/mediaclip/ComposedMedia";

export {AbstractClip, addElementToBackground} from './media-common';
export {MediaService} from './media-service';
export {SpeedController} from './speed-controller';
export {ShapeMedia, ShapeType} from './shape';
export type {ShapeStyle, ShapeConfig} from './shape';
export type {IClip, ESAudioContext, LayerChange} from './types';
export {VideoMedia} from './video';
export {ImageMedia} from './image';
export {AudioMedia} from './audio/audio';
export {TextMedia} from './text';
export {ComposedMedia} from './ComposedMedia';

export function createMediaService(): MediaService {
  return new MediaService();
}

export async function createMediaFromFile(file: File): Promise<Array<AbstractClip>> {

  const layers: AbstractClip[] = [];
  if (file.type.indexOf('video') >= 0) {
    const [frameSource, audioFrameSource] = await Promise.all([
      MediaLoader.loadVideoMedia(file, (progress) => {
        onLoadUpdateListener(progress - 1, file.name);
      }),
      MediaLoader.loadAudioMedia(file)
    ]);

    const videoMedia = new VideoMedia(file.name, frameSource);
    const audioMedia = new AudioMedia(file.name, audioFrameSource);
    const composedMedia = new ComposedMedia(videoMedia, audioMedia);
    layers.push(composedMedia);
    onLoadUpdateListener(100, file.name, composedMedia, composedMedia.audio.audioBuffer);
  }

  if (file.type.indexOf('image') >= 0) {
    const frameSource = await MediaLoader.loadImageMedia(file, (progress) => {
      onLoadUpdateListener(progress, file.name);
    });
    const imageMedia = new ImageMedia(file.name, frameSource);
    layers.push(imageMedia);
    onLoadUpdateListener(100, file.name, imageMedia);
  }

  if (file.type.indexOf('audio') >= 0) {
    const audioFrameSource = await MediaLoader.loadAudioMedia(file);
    const audioMedia = new AudioMedia(file.name, audioFrameSource);
    layers.push(audioMedia);
    onLoadUpdateListener(100, file.name, audioMedia, audioFrameSource.audioBuffer);
  }

  layers.forEach(layer => {
    if (!layer.addLoadUpdateListener) return;
    layer.addLoadUpdateListener(onLoadUpdateListener);
  });

  return layers;
}

function onLoadUpdateListener(
    progress: number,
    layerName: string,
    layer?: AbstractClip,
    audioBuffer?: AudioBuffer | null
): void {
  getEventBus().emit(new MediaLoadUpdateEvent(progress, layerName, layer, audioBuffer));
}

export function createMediaText(text: string): AbstractClip {
  return new TextMedia(text)
}

export function createMediaCaption(transcription: Map<string, TranscriptionResult>): AbstractClip[] {
  console.log("Creating caption media from transcription results:", transcription);
  const captions: AbstractClip[] = [];
  transcription.forEach((result, _) => {
    captions.push(new CaptionMedia(result.audioId + "-captions", result.chunks));
  });
  return captions;
}

export function createMediaShape(shapeType: ShapeType): AbstractClip {
  return new ShapeMedia(shapeType);
}

