import {AudioSplitHandler} from "@/audio/AudioSplitHandler";
import {Media} from "@/audio/types";

export class AudioService {
  private audioSplitHandler: AudioSplitHandler;

  constructor(audioSplitHandler: AudioSplitHandler) {
    this.audioSplitHandler = audioSplitHandler;
  }

  splitAudio(mediaOriginal: Media, mediaClone: Media, time: number): void {
    this.audioSplitHandler.split(mediaOriginal, mediaClone, time);
  }

}

