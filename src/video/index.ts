import {VideoLoader} from "@/media/video-loader";
import {LayerFile, VideoMetadata} from "@/media/types";

export async function loadVideo(
    file: LayerFile,
    callback: OmitThisParameter<(progress: number, metadata: (VideoMetadata | null)) => void>
) {
  await new VideoLoader().loadVideo(file, callback);
}