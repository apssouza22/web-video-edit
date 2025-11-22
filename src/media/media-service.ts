import {LayerLoadUpdateListener} from "./types";
import {AbstractMedia} from "@/media/media-common";
import {AudioService} from "@/audio";
import {ESRenderingContext2D} from "@/common/render-2d";
import {AudioMedia} from "./audio";
import {VideoMedia} from "./video";

export class MediaService {
  private onLayerLoadUpdate: LayerLoadUpdateListener = (
      layer: any,
      progress: number,
      ctx: ESRenderingContext2D | null,
      audioBuffer?: AudioBuffer | null
  ) => void {};
  private audioService: AudioService;

  constructor(audioService: AudioService) {
    this.audioService = audioService;
  }

  /**
   * Removes audio interval from all AudioLayers in the studio
   * startTime and endTime are in seconds
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @param audioMedias - Array of AudioLayers to remove interval from
   */
  removeAudioInterval(startTime: number, endTime: number, audioMedias: AbstractMedia[]): void {
    try {
      if (audioMedias.length === 0) {
        console.log('No audio medias found to remove interval from');
        return;
      }
      audioMedias.forEach((audioMedia, index) => {
        console.log(`Clipping audio layer ${index + 1}: "${audioMedia.name}"`);
        const newBuffer = this.audioService.removeInterval(audioMedia, startTime, endTime);
        if (newBuffer && newBuffer !== audioMedia.audioBuffer) {
          (audioMedia as AudioMedia).updateBuffer(newBuffer);
          console.log(`Successfully updated audio layer: "${audioMedia.name}"`);
        }
      });
    } catch (error) {
      console.error('Error removing audio interval:', error);
    }
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
        console.log('No video medias found to remove interval from');
        return;
      }
      videoLayers.forEach((videoLayer, index) => {
        console.log(`Processing video layer ${index + 1}: "${videoLayer.name}"`);
        (videoLayer as VideoMedia).removeInterval(startTime, endTime);
      });
    } catch (error) {
      console.error('Error removing video interval:', error);
    }
  }

  clone(layer: AbstractMedia): AbstractMedia | null {
    const newLayer = layer.clone();
    if (!newLayer) {
      return null;
    }


    return newLayer;
  }

  setOnLayerLoadUpdateListener(onLayerLoadUploadListener: LayerLoadUpdateListener) {
    this.onLayerLoadUpdate = onLayerLoadUploadListener;
  }
}
