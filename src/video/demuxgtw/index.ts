import { CodecDemuxer } from "../demux/codec-demuxer.js";
import { MediaBunnyDemuxer } from "./mediabunny-demuxer";
import { VideoDemuxService } from "./video-demux.js";
export {VideoDemuxService} from "./video-demux"

export function createDemuxer(): VideoDemuxService {
  return new VideoDemuxService(new MediaBunnyDemuxer(), new CodecDemuxer());
}

