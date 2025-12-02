
import {MediaLayer} from "@/medialayer";
import {ESAudioContext} from "@/medialayer";

/**
 * Local package representation of the media AbstractMedia
 * @see AbstractMedia
 * */
export interface Media extends MediaLayer{
  id: string;
  name: string;
  startTime: number; // ms
  totalTimeInMilSeconds: number; // ms

  audioBuffer: AudioBuffer | null;
  playerAudioContext: ESAudioContext | null;
  audioStreamDestination: MediaStreamAudioDestinationNode | null;

}