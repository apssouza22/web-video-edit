import {AudioLayer, VideoLayer} from "../layer/index.js";

export class MediaEditor {
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

    } catch (error) {
      console.error('Error removing video interval:', error);
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
    let layer = this.studio.getSelectedLayer();
    
    // Check if layer is VideoLayer or AudioLayer
    if (!(layer instanceof VideoLayer) && !(layer instanceof AudioLayer)) {
      return;
    }
    if (!layer.ready) {
      return;
    }
    if (layer.start_time > this.studio.player.time) {
      return;
    }
    if (layer.start_time + layer.totalTimeInMilSeconds < this.studio.player.time) {
      return;
    }

    if (layer instanceof VideoLayer) {
      this.#splitVideoLayer(layer);
    } else if (layer instanceof AudioLayer) {
      this.#splitAudioLayer(layer);
    }
  }

  /**
   * Splits a VideoLayer at the current player time
   * @param {VideoLayer} layer - The VideoLayer to split
   */
  #splitVideoLayer(layer) {
    const nl = this.studio.layerOperations.clone(layer)
    nl.name = layer.name + " [Split]";
    nl._leave_empty = true;

    const pct = (this.studio.player.time - layer.start_time) / layer.totalTimeInMilSeconds;
    const split_idx = Math.round(pct * layer.framesCollection.frames.length);
    nl.framesCollection.frames = layer.framesCollection.frames.splice(0, split_idx);

    nl.totalTimeInMilSeconds = pct * layer.totalTimeInMilSeconds;
    this.studio.addLayer(nl)

    layer.start_time = layer.start_time + nl.totalTimeInMilSeconds;
    layer.totalTimeInMilSeconds = layer.totalTimeInMilSeconds - nl.totalTimeInMilSeconds;
  }

  /**
   * Splits an AudioLayer at the current player time
   * @param {AudioLayer} layer - The AudioLayer to split
   */
  #splitAudioLayer(layer) {
    if (!layer.audioBuffer || !layer.playerAudioContext) {
      console.error('AudioLayer missing audioBuffer or playerAudioContext');
      return;
    }

    // Calculate split time relative to the layer
    const layerRelativeTime = (this.studio.player.time - layer.start_time) / 1000; // Convert to seconds
    
    if (layerRelativeTime <= 0 || layerRelativeTime >= layer.audioBuffer.duration) {
      console.error('Split time is outside layer bounds');
      return;
    }

    // Create two new audio buffers
    const firstBuffer = this.#createAudioBufferSegment(layer.audioBuffer, 0, layerRelativeTime, layer.playerAudioContext);
    const secondBuffer = this.#createAudioBufferSegment(layer.audioBuffer, layerRelativeTime, layer.audioBuffer.duration, layer.playerAudioContext);

    if (!firstBuffer || !secondBuffer) {
      console.error('Failed to create audio buffer segments');
      return;
    }

    // Clone the layer for the first part
    const firstLayer = this.studio.layerOperations.clone(layer);
    firstLayer.name = layer.name + " [Split]";
    
    // Update first layer with first buffer
    firstLayer.audioBuffer = firstBuffer;
    firstLayer.totalTimeInMilSeconds = firstBuffer.duration * 1000;

    layer.audioBuffer = secondBuffer;
    layer.totalTimeInMilSeconds = secondBuffer.duration * 1000;
    layer.start_time = layer.start_time + firstLayer.totalTimeInMilSeconds;

    this.studio.addLayer(firstLayer);


    console.log(`Successfully split AudioLayer: "${layer.name}" at ${layerRelativeTime}s`);
  }

  /**
   * Creates a new AudioBuffer containing a segment of the original buffer
   * @param {AudioBuffer} originalBuffer - The original audio buffer
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @param {AudioContext} audioContext - The audio context to create the buffer with
   * @returns {AudioBuffer|null} New AudioBuffer segment or null if failed
   */
  #createAudioBufferSegment(originalBuffer, startTime, endTime, audioContext) {
    if (!originalBuffer || startTime >= endTime || startTime < 0 || endTime > originalBuffer.duration) {
      console.error('Invalid parameters for createAudioBufferSegment');
      return null;
    }

    const sampleRate = originalBuffer.sampleRate;
    const numberOfChannels = originalBuffer.numberOfChannels;
    
    // Convert time to sample indices
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.ceil(endTime * sampleRate);
    
    // Clamp to valid ranges
    const clampedStartSample = Math.max(0, Math.min(startSample, originalBuffer.length));
    const clampedEndSample = Math.max(clampedStartSample, Math.min(endSample, originalBuffer.length));
    
    const segmentLength = clampedEndSample - clampedStartSample;
    
    if (segmentLength <= 0) {
      console.error('Invalid segment length');
      return null;
    }

    try {
      const newBuffer = audioContext.createBuffer(numberOfChannels, segmentLength, sampleRate);
      
      // Copy audio data for each channel
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const originalChannelData = originalBuffer.getChannelData(channel);
        const newChannelData = newBuffer.getChannelData(channel);
        
        // Copy the segment
        for (let i = 0; i < segmentLength; i++) {
          newChannelData[i] = originalChannelData[clampedStartSample + i];
        }
      }
      
      console.log(`Created audio buffer segment: ${startTime}s-${endTime}s, duration: ${newBuffer.duration}s`);
      return newBuffer;
      
    } catch (error) {
      console.error('Error creating audio buffer segment:', error);
      return null;
    }
  }
}