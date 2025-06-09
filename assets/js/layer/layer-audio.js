import { StandardLayer } from './layer-common.js';
import { AudioContext } from '../constants.js';

export class AudioLayer extends StandardLayer {
  constructor(file) {
    super(file);
    this.reader = new FileReader();
    this.audioCtx = new AudioContext({
      sampleRate: 16000 // Whisper model requires this
    });
    this.audioBuffer = null;
    this.source = null;
    this.playing = false;
    this.playerAudioContext = null;
    this.audioStreamDestination = null;
    this.reader.addEventListener("load", this.#onAudioLoad.bind(this));
    this.reader.readAsArrayBuffer(file);
  }

  #onAudioLoad() {
    let buffer = this.reader.result;
    this.audioCtx.decodeAudioData(
      buffer,
      this.#onAudioLoadSuccess.bind(this),
      (function (e) {
        //TODO: On error
      }).bind(this)
    );
  }

  #onAudioLoadSuccess(audioBuffer) {
    this.audioBuffer = audioBuffer;
    this.totalTimeInMilSeconds = this.audioBuffer.duration * 1000;
    if (this.totalTimeInMilSeconds === 0) {
      //TODO: On error
    }
    this.ready = true;
    this.loadUpdateListener(this, 100, null, audioBuffer);
  }

  updateName(name) {
    this.name = name + " [Audio] ";
  }

  disconnect() {
    if (this.source) {
      this.source.disconnect(this.playerAudioContext.destination);
      this.source = null;
    }
  }

  init(canvasWidth, canvasHeight,playerAudioContext) {
    super.init(canvasWidth, canvasHeight);
    this.playerAudioContext = playerAudioContext;
  }

  connectAudioSource() {
    this.disconnect();
    this.source = this.playerAudioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.playerAudioContext.destination);
    
    if (this.audioStreamDestination) {
      //Used for video exporting
      this.source.connect(this.audioStreamDestination);
    }
    this.started = false;
  }

  render(ctxOut, currentTime, playing = false) {
    if (!this.ready) {
      return;
    }
    if(!playing){
      return;
    }

    let time = currentTime - this.start_time;
    if (time < 0 || time > this.totalTimeInMilSeconds) {
      return;
    }

    if (!this.started) {
      if (!this.source) {
        this.connectAudioSource(currentTime);
      }
      this.source.start(0, time / 1000);
      this.started = true;
    }
  }

  /**
   * Removes an audio interval from this AudioLayer
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @returns {boolean} - True if the interval was successfully removed, false otherwise
   */
  removeInterval(startTime, endTime) {
    if (!this.audioBuffer || !this.playerAudioContext) {
      console.log(`Audio layer "${this.name}" missing audioBuffer or playerAudioContext`);
      return false;
    }

    if (startTime < 0 || endTime <= startTime) {
      console.error('Invalid time interval provided:', startTime, endTime);
      return false;
    }

    try {
      console.log(`Processing audio layer: "${this.name}"`);

      const newBuffer = this.#removeAudioIntervalInternal(startTime, endTime);

      if (newBuffer && newBuffer !== this.audioBuffer) {
        this.#updateBuffer(newBuffer);
        console.log(`Successfully updated audio layer: "${this.name}"`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error removing audio interval from layer "${this.name}":`, error);
      return false;
    }
  }

  /**
   * Removes an audio interval from this AudioLayer's buffer and returns a new AudioBuffer
   * @param {number} startTime - Start time in seconds to remove
   * @param {number} endTime - End time in seconds to remove
   * @returns {AudioBuffer} New AudioBuffer with the interval removed
   * @private
   */
  #removeAudioIntervalInternal(startTime, endTime) {
    if (!this.audioBuffer || startTime >= endTime || startTime < 0) {
      console.error('Invalid parameters for removeAudioInterval');
      return this.audioBuffer;
    }

    const sampleRate = this.audioBuffer.sampleRate;
    const numberOfChannels = this.audioBuffer.numberOfChannels;
    const originalLength = this.audioBuffer.length;
    
    // Convert time to sample indices
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.ceil(endTime * sampleRate);
    
    // Clamp to valid ranges
    const clampedStartSample = Math.max(0, Math.min(startSample, originalLength));
    const clampedEndSample = Math.max(clampedStartSample, Math.min(endSample, originalLength));
    
    // Calculate new buffer length
    const removedSamples = clampedEndSample - clampedStartSample;
    const newLength = originalLength - removedSamples;
    
    if (newLength <= 0) {
      console.warn('Removing interval would result in empty audio buffer');
      // Return a minimal buffer with silence
      const minimalBuffer = this.playerAudioContext.createBuffer(numberOfChannels, 1, sampleRate);
      return minimalBuffer;
    }
    
    const newBuffer = this.playerAudioContext.createBuffer(numberOfChannels, newLength, sampleRate);
    
    // Copy audio data for each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const originalChannelData = this.audioBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);
      
      let writeIndex = 0;
      
      // Copy data before the removed interval
      for (let i = 0; i < clampedStartSample; i++) {
        newChannelData[writeIndex++] = originalChannelData[i];
      }
      
      // Skip the removed interval and copy data after
      for (let i = clampedEndSample; i < originalLength; i++) {
        newChannelData[writeIndex++] = originalChannelData[i];
      }
    }
    
    console.log(`Removed audio interval ${startTime}s-${endTime}s. Original: ${this.audioBuffer.duration}s, New: ${newBuffer.duration}s`);
    
    return newBuffer;
  }

  /**
   * Updates this AudioLayer with a new AudioBuffer
   * @param {AudioBuffer} newBuffer - The new AudioBuffer
   * @private
   */
  #updateBuffer(newBuffer) {
    if (!newBuffer) {
      console.error('Invalid buffer provided for updateBuffer');
      return;
    }
    
    // Disconnect current audio source
    this.disconnect();
    
    // Update the audio buffer
    this.audioBuffer = newBuffer;
    
    // Update total time
    this.totalTimeInMilSeconds = newBuffer.duration * 1000;
    
    // Update studio total time if needed
    if (window.studio) {
      window.studio.player.total_time = 0;
      for (let layer of window.studio.getLayers()) {
        if (layer.start_time + layer.totalTimeInMilSeconds > window.studio.player.total_time) {
          window.studio.player.total_time = layer.start_time + layer.totalTimeInMilSeconds;
        }
      }
      
      // Refresh audio connections
      window.studio.player.refreshAudio();
    }
    
    console.log(`Updated AudioLayer "${this.name}" with new buffer duration: ${newBuffer.duration}s`);
  }
}
