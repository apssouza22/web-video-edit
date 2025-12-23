
import {IClip} from "@/mediaclip";
import {ESAudioContext} from "@/mediaclip";

/**
 * Local package representation of the media AbstractMedia
 * @see AbstractMedia
 * */
export interface Media extends IClip{
  id: string;
  name: string;
  startTime: number; // ms
  totalTimeInMilSeconds: number; // ms

  audioBuffer: AudioBuffer | null;
  playerAudioContext: ESAudioContext | null;
  audioStreamDestination: MediaStreamAudioDestinationNode | null;

}