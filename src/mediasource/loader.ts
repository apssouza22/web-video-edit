import {loadVideo} from "@/video";
import {LayerFile, VideoMetadata} from "@/medialayer/types";
import {FrameSource, FrameSourceMetadata, VideoFrameSource, ImageFrameSource} from "@/mediasource/frame-source";

export type LoadProgressCallback = (progress: number) => void;

export class MediaLoader {
  static loadVideoMedia(file: LayerFile, onProgress: LoadProgressCallback): Promise<FrameSource> {
    return new Promise((resolve, reject) => {
      loadVideo(file, (progress: number, metadata: VideoMetadata | null): void => {
        onProgress(progress);
        if (progress < 100) {
          return;
        }

        if (!metadata?.frames) {
          // reject(new Error('Failed to load video: no frames available'));
          return;
        }

        const frameSourceMetadata: FrameSourceMetadata = {
          width: metadata.width,
          height: metadata.height,
          totalTimeInMilSeconds: metadata.totalTimeInMilSeconds
        };

        resolve(new VideoFrameSource(metadata.frames, frameSourceMetadata));
      });
    });
  }

  static loadImageMedia(file: LayerFile, onProgress?: LoadProgressCallback): Promise<FrameSource> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.addEventListener("load", (): void => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Failed to read image file'));
          return;
        }

        img.src = reader.result;
        img.addEventListener('load', (): void => {
          if (onProgress) {
            onProgress(100);
          }
          resolve(new ImageFrameSource(img));
        });

        img.addEventListener('error', (): void => {
          reject(new Error('Failed to load image'));
        });
      });

      reader.addEventListener('error', (): void => {
        reject(new Error('Failed to read file'));
      });

      reader.readAsDataURL(file as File);
    });
  }
}
