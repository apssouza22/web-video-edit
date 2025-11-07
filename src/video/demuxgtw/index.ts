import { HTMLVideoDemuxer } from "../demux/html-video-demuxer.js";
import { CodecDemuxer } from "../demux/codec-demuxer.js";
import { VideoDemuxService } from "./video-demux.js";
export {VideoDemuxService} from "./video-demux"

export function createDemuxer(): VideoDemuxService {
  return new VideoDemuxService(new HTMLVideoDemuxer(), new CodecDemuxer());
}

