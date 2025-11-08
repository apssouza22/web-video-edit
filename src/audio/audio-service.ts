import {AudioSplitHandler} from "@/audio/AudioSplitHandler";
import {Media} from "@/audio/types";
import {AudioCutter} from "@/audio/audio-cutter";

export class AudioService {
  private audioSplitHandler: AudioSplitHandler;
  private audioCutter: AudioCutter;

  constructor(audioSplitHandler: AudioSplitHandler, audioCutter: AudioCutter) {
    this.audioSplitHandler = audioSplitHandler;
    this.audioCutter = audioCutter;
  }

  splitAudio(mediaOriginal: Media, mediaClone: Media, time: number): void {
    this.audioSplitHandler.split(mediaOriginal, mediaClone, time);
  }

  removeInterval(
      media: Media,
      startTime: number,
      endTime: number
  ): AudioBuffer | null {
    if (!media.audioBuffer || !media.playerAudioContext) {
      console.warn(`Audio layer "${media.name}" missing audioBuffer or playerAudioContext`);
      return null;
    }

    if (startTime < 0 || endTime <= startTime) {
      console.error('Invalid time interval provided:', startTime, endTime);
      return null;
    }

    try {
      return  this.audioCutter.removeInterval(media.audioBuffer, media.playerAudioContext, startTime, endTime);
    } catch (error) {
      console.error(`Error removing audio interval from layer "${media.name}":`, error);
      return null;
    }
  }
}

