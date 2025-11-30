import {ESAudioContext} from "@/medialayer/media-common";

/**
 * Local package representation of the media AbstractMedia
 * @see AbstractMedia
 * */
export interface Media{
  id: string;
  name?: string;
  startTime: number; // ms
  totalTimeInMilSeconds: number; // ms

  audioBuffer: AudioBuffer | null;
  playerAudioContext: ESAudioContext | null;
  audioStreamDestination: MediaStreamAudioDestinationNode | null;

}