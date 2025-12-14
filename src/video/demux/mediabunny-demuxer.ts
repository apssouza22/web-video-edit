import {Canvas2DRender} from '@/common/render-2d';
import {fps} from '@/constants';
import {StudioState} from '@/common';
import {CompleteCallback, ProgressCallback} from './types';
import {WorkerVideoStreaming} from './worker-video-streaming';
import {CompleteResponse, DemuxWorkerMessage, DemuxWorkerResponse} from './demux-worker-types';
import {VideoMetadata} from '@/mediaclip/types';

export class MediaBunnyDemuxer {
  private onProgressCallback: ProgressCallback = () => {
  };
  private onCompleteCallback: CompleteCallback = () => {
  };

  private worker: Worker | null = null;
  private targetFps: number = fps;
  private videoId: string = '';

  setOnProgressCallback(callback: ProgressCallback): void {
    this.onProgressCallback = callback;
  }

  setOnCompleteCallback(callback: CompleteCallback): void {
    this.onCompleteCallback = callback;
  }

  setTargetFps(targetFps: number): void {
    this.targetFps = targetFps;
  }

  async initialize(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.videoId = file.name;

        this.worker = new Worker(new URL('./demux-worker.ts', import.meta.url), {
          type: 'module',
        });

        this.#setupWorkerMessageHandler(resolve, reject);

        this.worker.postMessage({
          type: 'initialize',
          videoId: this.videoId,
          file,
          targetFps: this.targetFps,
        } as DemuxWorkerMessage);
      } catch (error) {
        console.error('MediaBunnyDemuxer initialization error:', error);
        this.cleanup();
        reject(error);
      }
    });
  }

  #setupWorkerMessageHandler(
      resolve: () => void,
      reject: (error: Error) => void
  ): void {
    if (!this.worker) return;

    this.worker.addEventListener('message', (event: MessageEvent<DemuxWorkerResponse>) => {
      const message = event.data;

      if (message.videoId !== this.videoId) {
        return;
      }

      switch (message.type) {
        case 'progress':
          this.onProgressCallback(message.progress);
          break;

        case 'complete':
          StudioState.getInstance().setMinVideoSizes(message.width, message.height);
          this.#handleComplete(message);
          resolve();
          break;

        case 'error':
          reject(new Error(message.message));
          break;
      }
    });

    this.worker.addEventListener('error', (error) => {
      console.error('Worker error:', error);
      this.cleanup();
      reject(new Error(error.message));
    });
  }

  #handleComplete(response: CompleteResponse): void {
    if (!this.worker) return;
    const metadata = {
      width: response.width,
      height: response.height,
      timestamps: response.timestamps,
      totalTimeInMilSeconds: response.totalTimeInMilSeconds,
      videoSink: new WorkerVideoStreaming(
          this.videoId,
          this.worker,
          response.timestamps
      )
    } as VideoMetadata;

    this.onCompleteCallback(metadata);
  }

  cleanup(): void {
    try {
      if (this.worker) {
        this.worker.postMessage({type: 'cleanup', videoId: this.videoId} as DemuxWorkerMessage);
        this.worker.terminate();
        this.worker = null;
      }
    } catch (error) {
      console.error('Error during MediaBunnyDemuxer cleanup:', error);
    }
  }
}
