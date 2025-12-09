import type { AudioMedia } from '@/mediaclip/audio';

export class AudioWaveformGenerator {
  #audioMedia: AudioMedia;
  #waveformCache: Float32Array | null = null;
  #samplesPerPixel: number = 100;
  #isGenerated: boolean = false;

  constructor(audioMedia: AudioMedia) {
    this.#audioMedia = audioMedia;
  }

  generateWaveform(): void {
    if (this.#isGenerated) {
      return;
    }

    const audioBuffer = this.#audioMedia.audioBuffer;
    if (!audioBuffer) {
      return;
    }

    const channelData = this.#extractChannelData(audioBuffer);
    this.#waveformCache = this.#downsampleWaveform(channelData);
    this.#isGenerated = true;
  }

  #extractChannelData(audioBuffer: AudioBuffer): Float32Array {
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }

    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    const merged = new Float32Array(left.length);

    for (let i = 0; i < left.length; i++) {
      merged[i] = (left[i] + right[i]) / 2;
    }

    return merged;
  }

  #downsampleWaveform(channelData: Float32Array): Float32Array {
    const targetSamples = Math.ceil(channelData.length / this.#samplesPerPixel);
    const waveform = new Float32Array(targetSamples);

    for (let i = 0; i < targetSamples; i++) {
      const start = i * this.#samplesPerPixel;
      const end = Math.min(start + this.#samplesPerPixel, channelData.length);

      let maxAmplitude = 0;
      for (let j = start; j < end; j++) {
        const amplitude = Math.abs(channelData[j]);
        if (amplitude > maxAmplitude) {
          maxAmplitude = amplitude;
        }
      }

      waveform[i] = maxAmplitude;
    }

    return waveform;
  }

  getWaveformSegment(startRatio: number, endRatio: number, sampleCount: number): Float32Array {
    if (!this.#waveformCache) {
      return new Float32Array(sampleCount);
    }

    const result = new Float32Array(sampleCount);
    const totalSamples = this.#waveformCache.length;
    const startIndex = Math.floor(startRatio * totalSamples);
    const endIndex = Math.floor(endRatio * totalSamples);
    const segmentLength = endIndex - startIndex;

    if (segmentLength <= 0) {
      return result;
    }

    const step = segmentLength / sampleCount;

    for (let i = 0; i < sampleCount; i++) {
      const index = Math.floor(startIndex + i * step);
      if (index >= 0 && index < totalSamples) {
        result[i] = this.#waveformCache[index];
      }
    }

    return result;
  }

  get isGenerated(): boolean {
    return this.#isGenerated;
  }

  cleanup(): void {
    this.#waveformCache = null;
    this.#isGenerated = false;
  }
}

