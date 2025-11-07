import {CodecDemuxer} from "./mp4boxdemuxer/codec-demuxer.js";
import {MediaBunnyDemuxer} from "./mediabunny-demuxer";
import {VideoDemuxService} from "./video-demux.js";
import {HTMLVideoDemuxer} from "./htmldemuxer/html-video-demuxer";

export {VideoDemuxService} from "./video-demux"

export function createDemuxer(): VideoDemuxService {
  return new VideoDemuxService(new MediaBunnyDemuxer(), new CodecDemuxer(), new HTMLVideoDemuxer());
}

