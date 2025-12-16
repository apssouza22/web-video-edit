import { ALL_FORMATS, BlobSource, Input, VideoSampleSink } from "mediabunny";

export interface ExtractedFrame {
  timestamp: number;
  imageDataUrl: string;
}

export interface FrameExtractorConfig {
  frameIntervalMs: number;
  maxFrames: number;
}

const DEFAULT_CONFIG: FrameExtractorConfig = {
  frameIntervalMs: 1000,
  maxFrames: 60,
};

export class FrameExtractor {
  #config: FrameExtractorConfig;
  #canvas: OffscreenCanvas;
  #context: OffscreenCanvasRenderingContext2D;

  constructor(config: Partial<FrameExtractorConfig> = {}) {
    this.#config = { ...DEFAULT_CONFIG, ...config };
    this.#canvas = new OffscreenCanvas(640, 480);
    this.#context = this.#canvas.getContext("2d")!;
  }

  async extractFrames(
    videoData: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<ExtractedFrame[]> {
    const frames: ExtractedFrame[] = [];
    let videoSink: VideoSampleSink | null = null;

    try {
      const blob = new Blob([videoData], { type: "video/mp4" });
      const source = new BlobSource(blob);
      const input = new Input({ source, formats: ALL_FORMATS });

      const totalDuration = await input.computeDuration();
      const videoTrack = await input.getPrimaryVideoTrack();

      if (!videoTrack) {
        throw new Error("No video track found in the file");
      }

      if (!(await videoTrack.canDecode())) {
        throw new Error("Unable to decode the video track");
      }

      videoSink = new VideoSampleSink(videoTrack);

      const frameIntervalSeconds = this.#config.frameIntervalMs / 1000;
      const frameCount = Math.min(
        this.#config.maxFrames,
        Math.floor(totalDuration / frameIntervalSeconds)
      );

      const timestamps = this.#calculateTargetTimestamps(totalDuration, frameIntervalSeconds, frameCount);

      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const imageDataUrl = await this.#extractFrameAtTimestamp(videoSink, timestamp);

        if (imageDataUrl) {
          frames.push({ timestamp, imageDataUrl });
        }

        if (onProgress) {
          onProgress(((i + 1) / timestamps.length) * 100);
        }
      }
    } finally {
      videoSink = null;
    }

    return frames;
  }

  #calculateTargetTimestamps(totalDuration: number, intervalSeconds: number, maxFrames: number): number[] {
    const timestamps: number[] = [];
    let currentTime = 0;

    while (currentTime < totalDuration && timestamps.length < maxFrames) {
      timestamps.push(currentTime);
      currentTime += intervalSeconds;
    }

    return timestamps;
  }

  async #extractFrameAtTimestamp(videoSink: VideoSampleSink, timestamp: number): Promise<string | null> {
    try {
      const sample = await videoSink.getSample(timestamp);

      if (!sample) {
        return null;
      }

      const videoFrame = sample.toVideoFrame();
      try {
        const imageDataUrl = await this.#videoFrameToDataUrl(videoFrame);
        return imageDataUrl;
      } finally {
        videoFrame.close();
        sample.close();
      }
    } catch (error) {
      console.error(`Error extracting frame at timestamp ${timestamp}:`, error);
      return null;
    }
  }

  async #videoFrameToDataUrl(videoFrame: VideoFrame): Promise<string> {
    this.#canvas.width = videoFrame.displayWidth;
    this.#canvas.height = videoFrame.displayHeight;
    this.#context.drawImage(videoFrame, 0, 0);

    const blob = await this.#canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 });
    return this.#blobToDataUrl(blob);
  }

  #blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to convert blob to data URL"));
      reader.readAsDataURL(blob);
    });
  }
}

