import {loadVideo} from "@/video";
import {LayerFile, VideoMetadata} from "@/medialayer/types";
import {AudioFrameSource, FrameSource, FrameSourceMetadata} from "./types";
import {VideoFrameSource} from "./video-frame-source";
import {ImageFrameSource} from "./image-frame-source";
import {AudioBufferSource} from "./audio-frame-source";
import {AudioContext} from "@/constants";

export type LoadProgressCallback = (progress: number) => void;

export class MediaLoader {
  private static audioContext: AudioContext | null = null;

  private static getAudioContext(): AudioContext {
    if (!MediaLoader.audioContext) {
      MediaLoader.audioContext = new AudioContext({ sampleRate: 16000 });
    }
    return MediaLoader.audioContext;
  }

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

  static loadAudioMedia(file: LayerFile, onProgress?: LoadProgressCallback): Promise<AudioFrameSource> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener("load", async (): Promise<void> => {
        try {
          const buffer = reader.result as ArrayBuffer;
          const audioContext = MediaLoader.getAudioContext();
          const audioBuffer = await audioContext.decodeAudioData(buffer);
          
          if (onProgress) {
            onProgress(100);
          }
          
          resolve(new AudioBufferSource(audioBuffer));
        } catch (error) {
          reject(new Error(`Failed to decode audio data: ${error}`));
        }
      });

      reader.addEventListener("error", (): void => {
        reject(new Error(`Failed to read audio file: ${reader.error}`));
      });

      reader.readAsArrayBuffer(file as File);
    });
  }
}
