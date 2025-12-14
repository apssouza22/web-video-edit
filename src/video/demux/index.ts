import { MediaBunnyDemuxer } from './mediabunny-demuxer';

export type {VideoStreamingInterface} from "./types";
export type {MediaBunnyDemuxer} from './mediabunny-demuxer';

export function createDemuxer(): MediaBunnyDemuxer {
  return new MediaBunnyDemuxer();
}

