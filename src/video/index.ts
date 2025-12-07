import {VideoLoader} from "@/mediaclip/video-loader";
import {LayerFile, VideoMetadata} from "@/mediaclip/types";

export { VideoStreaming } from './demux/video-streaming';

export async function loadVideo(
    file: LayerFile,
    callback: OmitThisParameter<(progress: number, metadata: (VideoMetadata | null)) => void>
) {
  await new VideoLoader().loadVideo(file, callback);
}