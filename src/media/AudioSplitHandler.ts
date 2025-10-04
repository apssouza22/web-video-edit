import {AbstractMedia, isMediaAudio, isMediaVideo} from "@/media/index";
import {ESAudioContext} from "@/media/media-common";

export class AudioSplitHandler {

  split(mediaOriginal: AbstractMedia, mediaClone: AbstractMedia, time: number): void {
    if (!mediaOriginal.audioBuffer || !mediaOriginal.playerAudioContext) {
      console.error('AudioLayer missing audioBuffer or playerAudioContext');
      return;
    }

    const layerRelativeTime = (time - mediaOriginal.start_time) / 1000; // Convert to seconds

    if (layerRelativeTime <= 0 || layerRelativeTime >= mediaOriginal.audioBuffer.duration) {
      console.error('Split time is outside mediaOriginal bounds');
      return;
    }

    const firstBuffer = this.createAudioBufferSegment(mediaOriginal.audioBuffer, 0, layerRelativeTime, mediaOriginal.playerAudioContext);
    const secondBuffer = this.createAudioBufferSegment(mediaOriginal.audioBuffer, layerRelativeTime, mediaOriginal.audioBuffer.duration, mediaOriginal.playerAudioContext);

    if (!firstBuffer || !secondBuffer) {
      console.error('Failed to create audio buffer segments');
      return;
    }

    mediaClone.name = mediaOriginal.name + " [Split]";
    mediaClone.audioBuffer = firstBuffer;
    mediaClone.totalTimeInMilSeconds = firstBuffer.duration * 1000;

    mediaOriginal.audioBuffer = secondBuffer;
    mediaOriginal.totalTimeInMilSeconds = secondBuffer.duration * 1000;
    mediaOriginal.start_time = mediaOriginal.start_time + mediaClone.totalTimeInMilSeconds;
    console.log(`Successfully split AudioLayer: "${mediaOriginal.name}" at ${layerRelativeTime}s`);
  }


  private createAudioBufferSegment(originalBuffer: AudioBuffer, startTime: number, endTime: number, audioContext: ESAudioContext): AudioBuffer | null {
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
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const originalChannelData = originalBuffer.getChannelData(channel);
        const newChannelData = newBuffer.getChannelData(channel);

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