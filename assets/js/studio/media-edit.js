import {getVideoLayers, removeVideoInterval, updateStudioTotalTime} from "../transcription/video-utils.js";
import {AudioLayer} from "../layer/layer-audio.js";

export class MediaEditor{
  constructor(studio) {
    this.studio = studio;
  }

  removeInterval(startTime, endTime) {
    if (startTime < 0 || endTime <= startTime) {
      console.error('Invalid time interval provided:', startTime, endTime);
      return;
    }

    console.log(`Removing interval from ${startTime} to ${endTime} seconds`);

    this.#removeAudioInterval(startTime, endTime);
    this.#removeVideoInterval(startTime, endTime);
  }


  /**
   * Removes audio interval from all AudioLayers in the studio
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   */
  #removeAudioInterval(startTime, endTime) {
    try {
      /**
       * @type {AudioLayer[]}
       */
      const audioLayers = this.#getAudioLayers();

      if (audioLayers.length === 0) {
        console.log('No audio layers found to remove interval from');
        return;
      }

      console.log(`Found ${audioLayers.length} audio layer(s) to process`);

      audioLayers.forEach((audioLayer, index) => {
        console.log(`Processing audio layer ${index + 1}: "${audioLayer.name}"`);
        audioLayer.removeInterval(startTime, endTime);
      });

    } catch (error) {
      console.error('Error removing audio interval:', error);
    }
  }

  /**
   * Removes video interval from all VideoLayers in the studio
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   */
  #removeVideoInterval(startTime, endTime) {
    try {
      const videoLayers = getVideoLayers();

      if (videoLayers.length === 0) {
        console.log('No video layers found to remove interval from');
        return;
      }

      console.log(`Found ${videoLayers.length} video layer(s) to process`);

      let anyLayerModified = false;

      videoLayers.forEach((videoLayer, index) => {
        if (videoLayer.framesCollection && videoLayer.ready) {
          console.log(`Processing video layer ${index + 1}: "${videoLayer.name}"`);

          const success = removeVideoInterval(videoLayer, startTime, endTime);

          if (success) {
            console.log(`Successfully updated video layer: "${videoLayer.name}"`);
            anyLayerModified = true;
          } else {
            console.log(`No changes made to video layer: "${videoLayer.name}"`);
          }
        } else {
          console.log(`Video layer "${videoLayer.name}" not ready or missing frames collection`);
        }
      });

      // Update studio total time if any layer was modified
      if (anyLayerModified) {
        updateStudioTotalTime();
      }

    } catch (error) {
      console.error('Error removing video interval:', error);
    }
  }


  /**
   * Finds AudioLayers in the studio layers
   * @returns {Array} Array of AudioLayer instances
   */
  #getAudioLayers() {
    const audioLayers = [];
    const layers = this.studio.getLayers();

    for (let layer of layers) {
      if (layer instanceof AudioLayer && layer.audioBuffer) {
        audioLayers.push(layer);
      }
    }
    return audioLayers;
  }
}