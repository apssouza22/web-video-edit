import {AudioSplitHandler} from "@/audio/AudioSplitHandler";
import {AudioService} from "@/audio/audio-service";
import {AudioCutter} from "@/audio/audio-cutter";

export {AudioService} from './audio-service';
export {AudioLoader} from './audio-loader';
export {AudioSource} from './audio-source';


export function createAudioService() {
  return new AudioService(new AudioSplitHandler(), new AudioCutter());
}
