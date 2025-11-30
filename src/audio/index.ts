import {AudioSplitHandler} from "@/audio/AudioSplitHandler";
import {AudioService} from "@/audio/audio-service";
import {AudioCutter} from "@/audio/audio-cutter";
import {PitchPreservationProcessor} from "@/audio/pitch-preservation-processor";

export {AudioService} from './audio-service';
export {AudioLoader} from '@/medialayer/audio-loader';
export {AudioSource} from '@/medialayer/audio-source';


export function createAudioService() {
  return new AudioService(new AudioSplitHandler(), new AudioCutter(), new PitchPreservationProcessor());
}
