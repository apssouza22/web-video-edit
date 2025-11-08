import {AudioSplitHandler} from "@/audio/AudioSplitHandler";
import {AudioService} from "@/audio/audio-service";

export {AudioService} from './audio-service';
export {AudioLoader} from './audio-loader';
export {AudioSource} from './audio-source';


export function createAudioService() {
  return new AudioService(new AudioSplitHandler());
}
