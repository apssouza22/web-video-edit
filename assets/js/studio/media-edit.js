import {AudioLayer} from "../layer/layer-audio.js";
import {VideoLayer} from "../layer/layer-video.js";

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
      const videoLayers = this.#getVideoLayers();

      if (videoLayers.length === 0) {
        console.log('No video layers found to remove interval from');
        return;
      }

      console.log(`Found ${videoLayers.length} video layer(s) to process`);

      let anyLayerModified = false;

      videoLayers.forEach((videoLayer, index) => {
        if (videoLayer.framesCollection && videoLayer.ready) {
          console.log(`Processing video layer ${index + 1}: "${videoLayer.name}"`);

          const success = videoLayer.removeInterval(startTime, endTime);

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
        this.#updateStudioTotalTime();
      }

    } catch (error) {
      console.error('Error removing video interval:', error);
    }
  }

  /**
   * Updates studio total time after layer modifications
   */
  #updateStudioTotalTime() {
    if (this.studio) {
      this.studio.player.total_time = 0;
      for (let layer of this.studio.getLayers()) {
        if (layer.start_time + layer.totalTimeInMilSeconds > this.studio.player.total_time) {
          this.studio.player.total_time = layer.start_time + layer.totalTimeInMilSeconds;
        }
      }
      
      // Refresh the studio timeline
      if (this.studio.timeline) {
        this.studio.timeline.render(this.studio.getLayers());
      }
      
      console.log(`Updated studio total time to: ${this.studio.player.total_time / 1000}s`);
    }
  }

  /**
   * Finds VideoLayers in the studio layers
   * @returns {VideoLayer[]} Array of VideoLayer instances
   */
  #getVideoLayers() {
    const videoLayers = [];
    const layers = this.studio.getLayers();

    for (let layer of layers) {
      if (layer instanceof VideoLayer && layer.framesCollection) {
        videoLayers.push(layer);
      }
    }
    return videoLayers;
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

  split() {
    if (!this.studio.getSelectedLayer()) {
      return;
    }
    let l = this.studio.getSelectedLayer();
    if (!(l instanceof VideoLayer)) {
      return;
    }
    if (!l.ready) {
      return;
    }
    if (l.start_time > this.studio.player.time) {
      return;
    }
    if (l.start_time + l.totalTimeInMilSeconds < this.studio.player.time) {
      return;
    }
    let nl = new VideoLayer({
      name: l.name + "NEW",
      _leave_empty: true
    });
    const pct = (this.studio.player.time - l.start_time) / l.totalTimeInMilSeconds;
    const split_idx = Math.round(pct * l.framesCollection.frames.length);
    nl.framesCollection.frames = l.framesCollection.frames.splice(0, split_idx);
    nl.start_time = l.start_time;
    nl.totalTimeInMilSeconds = pct * l.totalTimeInMilSeconds;
    nl.width = l.width;
    nl.height = l.height;
    nl.canvas.width = l.canvas.width;
    nl.canvas.height = l.canvas.height;
    const newLayer = this.studio.layerLoader.insertLayer(nl);
    newLayer.addLoadUpdateListener(this.studio.onLayerLoadUpdate.bind(this.studio))
    nl.ready = true;

    l.start_time = l.start_time + nl.totalTimeInMilSeconds;
    l.totalTimeInMilSeconds = l.totalTimeInMilSeconds - nl.totalTimeInMilSeconds;
  }
}