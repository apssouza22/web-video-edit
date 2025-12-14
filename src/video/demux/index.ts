import { MediaBunnyDemuxer } from './mediabunny-demuxer';
import { VideoDemuxService } from './video-demux.js';

export { VideoDemuxService } from './video-demux';
export type {VideoStreamingInterface} from "./types";

export function createDemuxer(): VideoDemuxService {
  return new VideoDemuxService(new MediaBunnyDemuxer());
}

