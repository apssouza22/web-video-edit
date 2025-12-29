import {ALL_FORMATS, BlobSource, Input, VideoSampleSink} from 'mediabunny';

type PostMessageFn = {
  (message: any, targetOrigin: string, transfer?: Transferable[]): void;
  (message: any, options?: WindowPostMessageOptions): void
};

export class DemuxProcessor {
  #input: Input | null = null;
  #videoSink: VideoSampleSink | null = null;
  #timestamps: number[] = [];
  #isProcessing = false;
  #postMessage: PostMessageFn;
  #videoId: string;
  #activeBatchRequest: string | null = null;

  constructor(videoId: string, postMessage: PostMessageFn) {
    this.#videoId = videoId;
    this.#postMessage = postMessage;
  }

  async initialize(file: File, targetFps: number): Promise<void> {
    try {
      this.#isProcessing = true;
      this.#timestamps = [];

      const source = new BlobSource(file);
      this.#input = new Input({
        source,
        formats: ALL_FORMATS,
      });

      const totalDuration = await this.#input.computeDuration();
      const videoTrack = await this.#input.getPrimaryVideoTrack();

      if (!videoTrack) {
        this.#postError('No video track found in the file');
        return;
      }

      if (videoTrack.codec === null) {
        this.#postError('Unsupported video codec');
        return;
      }

      if (!(await videoTrack.canDecode())) {
        this.#postError('Unable to decode the video track');
        return;
      }

      this.#videoSink = new VideoSampleSink(videoTrack);
      const timestamps = await this.#extractTimestamps(totalDuration, targetFps);

      const width = videoTrack.displayWidth;
      const height = videoTrack.displayHeight;
      console.log(`[DemuxProcessor] Video dimensions: ${width}x${height}`);
      const totalTimeInMilSeconds = totalDuration * 1000;
      this.#postMessage({
        type: 'complete',
        videoId: this.#videoId,
        timestamps: [...timestamps],
        width,
        height,
        totalTimeInMilSeconds
      });
    } catch (error) {
      console.error('DemuxProcessor initialization error:', error);
      this.cleanup();
      this.#postError(error instanceof Error ? error.message : 'Unknown initialization error');
    }
  }

  async #extractTimestamps(totalDuration: number, targetFps: number): Promise<number[]> {
    if (!this.#videoSink) {
      return [];
    }

    try {
      const frameInterval = 1 / targetFps;
      const totalFramesTarget = Math.floor(totalDuration * targetFps);

      console.log(`[DemuxProcessor] Extracting timestamps at ${targetFps} fps (${totalFramesTarget} total frames)`);

      let currentFrameIndex = 0;
      let nextTargetTime = 0;

      const frameIterator = this.#videoSink.samples(0);

      for await (const videoSample of frameIterator) {
        try {
          if (!this.#isProcessing) {
            break;
          }

          const timestamp = videoSample.timestamp;
          if (timestamp >= nextTargetTime && currentFrameIndex < totalFramesTarget) {
            this.#timestamps.push(timestamp);
            currentFrameIndex++;
            nextTargetTime = currentFrameIndex * frameInterval;
            const progress = totalFramesTarget > 0
              ? Math.min(100, (currentFrameIndex / totalFramesTarget) * 100)
              : 0;
            this.#postMessage({ type: 'progress', videoId: this.#videoId, progress });
          }

          if (currentFrameIndex >= totalFramesTarget) {
            break;
          }
        } finally {
          videoSample.close();
        }
      }

      console.log(`[DemuxProcessor] Extracted ${this.#timestamps.length} timestamps at ${targetFps} fps`);

    } catch (error) {
      console.error('[DemuxProcessor] Error extracting timestamps:', error);
      this.#postError(error instanceof Error ? error.message : 'Error extracting timestamps');
    }
    return this.#timestamps
  }

  async getFrame(index: number): Promise<void> {
    if (!this.#videoSink || index < 0 || index >= this.#timestamps.length) {
      this.#postMessage({ type: 'frame', videoId: this.#videoId, index, frame: null });
      return;
    }

    try {
      const timestamp = this.#timestamps[index];
      if (timestamp === undefined) {
        console.warn(`[DemuxProcessor] Not found frame at index ${index}`);
        this.#postMessage({ type: 'frame', videoId: this.#videoId, index, frame: null });
        return;
      }

      const sample = await this.#videoSink.getSample(timestamp);

      if (sample) {
        const videoFrame = sample.toVideoFrame();
        try {
          const imageBitmap = await createImageBitmap(videoFrame);
          // @ts-ignore - Transfer ImageBitmap to main thread for efficient memory handling
          this.#postMessage({ type: 'frame', videoId: this.#videoId, index, frame: imageBitmap }, [imageBitmap]);
        } finally {
          videoFrame.close();
          sample.close();
        }
      } else {
        this.#postMessage({ type: 'frame', videoId: this.#videoId, index, frame: null });
      }
    } catch (error) {
      console.error(`[DemuxProcessor] Error loading frame at index ${index}:`, error);
      this.#postMessage({ type: 'frame', videoId: this.#videoId, index, frame: null });
    }
  }

  async getBatchFrames(startIndex: number, endIndex: number, requestId: string): Promise<void> {
    if (!this.#videoSink || startIndex < 0 || endIndex > this.#timestamps.length) {
      this.#postError('Invalid batch range');
      return;
    }

    this.#activeBatchRequest = requestId;
    const totalFrames = endIndex - startIndex;
    let processedFrames = 0;

    const startTimestamp = this.#timestamps[startIndex];
    const endTimestamp = endIndex < this.#timestamps.length
      ? this.#timestamps[endIndex - 1] + 0.001
      : Infinity;

    try {
      const frameIterator = this.#videoSink.samples(startTimestamp, endTimestamp);
      let currentIndex = startIndex;

      for await (const videoSample of frameIterator) {
        try {
          if (this.#activeBatchRequest !== requestId) {
            console.log(`[DemuxProcessor] Batch ${requestId} cancelled at frame ${currentIndex}`);
            return;
          }

          if (currentIndex >= endIndex) {
            break;
          }

          let videoFrame: VideoFrame | null = null;
          let imageBitmap: ImageBitmap | null = null;

          try {
            videoFrame = videoSample.toVideoFrame();
            imageBitmap = await createImageBitmap(videoFrame);

            processedFrames++;
            const isComplete = processedFrames === totalFrames;
            this.#postMessage({
              type: 'batch-frame',
              videoId: this.#videoId,
              requestId,
              index: currentIndex,
              frame: imageBitmap,
              progress: processedFrames / totalFrames,
              isComplete,
              // @ts-ignore - Transfer ImageBitmap to main thread for efficient memory handling
            }, [imageBitmap]);

          } catch (error) {
            console.error(`[DemuxProcessor] Error creating bitmap at index ${currentIndex}:`, error);
            imageBitmap?.close();  // Close if created but message failed
          } finally {
            videoFrame?.close();
          }
          currentIndex++;
        } finally {
          videoSample.close();
        }
      }

      if (this.#activeBatchRequest === requestId) {
        this.#activeBatchRequest = null;
      }
    } catch (error) {
      console.error(`[DemuxProcessor] Error in batch decode:`, error);
      this.#activeBatchRequest = null;
      this.#postError(`Batch decode failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  cancelBatch(requestId: string): void {
    if (this.#activeBatchRequest === requestId) {
      console.log(`[DemuxProcessor] Cancelling batch ${requestId}`);
      this.#activeBatchRequest = null;
    }
  }

  cleanup(): void {
    try {
      this.#isProcessing = false;
      this.#timestamps = [];
      this.#input = null;
      this.#videoSink = null;
    } catch (error) {
      console.error('[DemuxProcessor] Error during cleanup:', error);
    }
  }

  #postError(message: string): void {
    this.#isProcessing = false;
    this.#postMessage({ type: 'error', videoId: this.#videoId, message });
  }
}
