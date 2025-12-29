import {AbstractClip} from "@/mediaclip/media-common";

export class MediaService {

  constructor() {
  }

  /**
   * Removes audio interval from all AudioLayers in the studio
   * startTime and endTime are in seconds
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @param audioMedias - Array of AudioLayers to remove interval from
   */
  removeAudioInterval(startTime: number, endTime: number, audioMedias: AbstractClip[]): void {
    try {
      if (audioMedias.length === 0) {
        console.log('No audio medias found to remove interval from');
        return;
      }
      audioMedias.forEach((audioMedia, index) => {
        console.log(`Clipping audio layer ${index + 1}: "${audioMedia.name}"`);
        audioMedia.removeInterval(startTime, endTime);
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
  removeVideoInterval(startTime: number, endTime: number, videoLayers: AbstractClip[]): void {
    try {
      if (videoLayers.length === 0) {
        console.log('No video medias found to remove interval from');
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
}
