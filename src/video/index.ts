import {VideoLoader} from "@/video/video-loader";
import {LayerFile, VideoMetadata} from "@/media/types";

export function loadVideo(
    file: LayerFile,
    callback: OmitThisParameter<(progress: number, metadata: (VideoMetadata | null)) => void>
) {
  new VideoLoader().loadVideo(file, callback);
}