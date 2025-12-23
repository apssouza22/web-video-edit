import {VideoThumbnailGenerator} from './video-thumbnail-generator';
import {AudioWaveformGenerator} from './audio-waveform-generator';
import type {ComposedMedia} from '@/mediaclip';

export class ComposedMediaGenerator {
  #thumbnailGenerator: VideoThumbnailGenerator;
  #waveformGenerator: AudioWaveformGenerator;
  #isInitialized: boolean = false;

  constructor(composedMedia: ComposedMedia) {
    this.#thumbnailGenerator = new VideoThumbnailGenerator(composedMedia.video);
    this.#waveformGenerator = new AudioWaveformGenerator(composedMedia.audio);
  }

  async initializeGenerators(thumbnailIndices: number[]): Promise<void> {
    if (this.#isInitialized) {
      return;
    }
    this.#waveformGenerator.generateWaveform();
    await this.#thumbnailGenerator.generateThumbnails(thumbnailIndices);
    this.#isInitialized = true;
  }

  getThumbnail(frameIndex: number): HTMLCanvasElement | null {
    return this.#thumbnailGenerator.getThumbnail(frameIndex);
  }

  getWaveformSegment(startRatio: number, endRatio: number, sampleCount: number): Float32Array {
    return this.#waveformGenerator.getWaveformSegment(startRatio, endRatio, sampleCount);
  }

  get isThumbnailsGenerated(): boolean {
    return this.#isInitialized;
  }

  get isWaveformGenerated(): boolean {
    return this.#waveformGenerator.isGenerated;
  }

  cleanup(): void {
    this.#thumbnailGenerator.cleanup();
    this.#waveformGenerator.cleanup();
    this.#isInitialized = false;
  }
}
