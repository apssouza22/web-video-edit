import {AudioFrameSource, AudioSourceMetadata} from "./types";

export class AudioBufferSource implements AudioFrameSource {
  readonly metadata: AudioSourceMetadata;
  readonly audioBuffer: AudioBuffer;

  constructor(audioBuffer: AudioBuffer) {
    this.audioBuffer = audioBuffer;
    this.metadata = {
      totalTimeInMilSeconds: audioBuffer.duration * 1000,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels
    };
  }

  cleanup(): void {
    // AudioBuffer doesn't need explicit cleanup
  }
}

