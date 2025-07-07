import {HTMLVideoDemuxer} from "./html-video-demuxer.js";
import {CodecDemuxer} from "./codec-demuxer.js";
import {VideoDemuxService} from "./video-demux.js";

export function createDemuxer(useHtmlDemux = false) {
  return new VideoDemuxService(new HTMLVideoDemuxer(), new CodecDemuxer(), useHtmlDemux);
}
