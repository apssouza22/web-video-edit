import {TextLayer} from "./text";
import {VideoLayer} from "./video";
import {ImageLayer} from "./image";
import {AudioLayer} from "./audio";
import {LayerLoadUpdateListener} from "./types";
import {AbstractMedia} from "@/media/media-common";
import {AudioSplitHandler} from "@/media/AudioSplitHandler";

export class MediaService {
  private onLayerLoadUpdate: LayerLoadUpdateListener;
  private audioCutter: AudioSplitHandler

  constructor(onLayerLoadUploadListener: LayerLoadUpdateListener) {
    this.onLayerLoadUpdate = onLayerLoadUploadListener;
    this.audioCutter = new AudioSplitHandler();
  }

  /**
   * Removes audio interval from all AudioLayers in the studio
   * startTime and endTime are in seconds
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @param audioLayers - Array of AudioLayers to remove interval from
   */
  removeAudioInterval(startTime: number, endTime: number, audioLayers: AbstractMedia[]): void {
    try {
      if (audioLayers.length === 0) {
        console.log('No audio layers found to remove interval from');
        return;
      }
      audioLayers.forEach((audioLayer, index) => {
        console.log(`Clipping audio layer ${index + 1}: "${audioLayer.name}"`);
        audioLayer.removeInterval(startTime, endTime);
      });
    } catch (error) {
      console.error('Error removing audio interval:', error);
    }
  }

  splitMedia(selectedMedia: AbstractMedia, splitTime: number): AbstractMedia {
    const mediaClone = this.clone(selectedMedia);
    if (selectedMedia instanceof VideoLayer) {
      this.splitVideoLayer(selectedMedia, mediaClone, splitTime);
    }

    if (selectedMedia instanceof AudioLayer) {
      this.audioCutter.split(selectedMedia, mediaClone, splitTime);
    }

    return mediaClone;
  }


  private splitVideoLayer(mediaOriginal: AbstractMedia, mediaClone: AbstractMedia, splitTime: number): void {
    const pct = (splitTime - mediaOriginal.start_time) / mediaOriginal.totalTimeInMilSeconds;
    const split_idx = Math.round(pct * mediaOriginal.framesCollection.frames.length);

    mediaClone.name = mediaOriginal.name + " [Split]";
    mediaClone.framesCollection.frames = mediaOriginal.framesCollection.frames.splice(0, split_idx);
    mediaClone.totalTimeInMilSeconds = pct * mediaOriginal.totalTimeInMilSeconds;

    mediaOriginal.start_time = mediaOriginal.start_time + mediaClone.totalTimeInMilSeconds;
    mediaOriginal.totalTimeInMilSeconds = mediaOriginal.totalTimeInMilSeconds - mediaClone.totalTimeInMilSeconds;
  }


  /**
   * Removes video interval from all VideoLayers in the studio
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @param videoLayers - Array of VideoLayers to remove interval from
   */
  removeVideoInterval(startTime: number, endTime: number, videoLayers: AbstractMedia[]): void {
    try {
      if (videoLayers.length === 0) {
        console.log('No video layers found to remove interval from');
        return;
      }
      videoLayers.forEach((videoLayer, index) => {
        console.log(`Processing video layer ${index + 1}: "${videoLayer.name}"`);
        videoLayer.removeInterval(startTime, endTime);
      });
    } catch (error) {
      console.error('Error removing video interval:', error);
    }
  }

  clone(layer: any): any | null {
    const newLayer = this.createClone(layer);
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
    newLayer.addLoadUpdateListener((l: any, progress: number, ctx: CanvasRenderingContext2D | null, audioBuffer?: AudioBuffer) => {
      this.onLayerLoadUpdate(l, progress, ctx, audioBuffer);
    });
    newLayer.loadUpdateListener(newLayer, 100, newLayer.ctx, newLayer.audioBuffer);
    return newLayer;
  }

  private createClone(layer: any): any | null {
    if (!layer.ready) {
      console.error('Cannot clone VideoLayer that is not ready');
      return null;
    }

    const cloneName = layer.name + " [Clone]";

    if (layer instanceof TextLayer) {
      return new TextLayer(cloneName);
    }

    if (layer instanceof VideoLayer) {
      const videoLayer = new VideoLayer(layer.file!, true);
      videoLayer.name = cloneName;
      return videoLayer;
    }

    if (layer instanceof AudioLayer) {
      const audioLayer = new AudioLayer(layer.file!, true);
      audioLayer.name = cloneName;
      audioLayer.playerAudioContext = layer.playerAudioContext;
      audioLayer.audioBuffer = layer.audioBuffer;
      return audioLayer;
    }

    if (layer instanceof ImageLayer) {
      const imageLayer = new ImageLayer(layer.file!);
      imageLayer.name = cloneName;
      return imageLayer;
    }

    return null;
  }

}
