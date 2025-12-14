import { Canvas2DRender } from '@/common/render-2d';
import { fps } from '@/constants';
import { StudioState } from '@/common';
import { CompleteCallback, MetadataCallback, ProgressCallback } from './types';
import { WorkerVideoStreaming } from './worker-video-streaming';
import type { DemuxWorkerMessage, DemuxWorkerResponse } from './demux-worker-types';

export class MediaBunnyDemuxer {
  private onProgressCallback: ProgressCallback = () => {};
  private onCompleteCallback: CompleteCallback = () => {};
  private onMetadataCallback: MetadataCallback = () => {};

  private worker: Worker | null = null;
  private targetFps: number = fps;
  private videoId: string = '';

  setOnProgressCallback(callback: ProgressCallback): void {
    this.onProgressCallback = callback;
  }

  setOnCompleteCallback(callback: CompleteCallback): void {
    this.onCompleteCallback = callback;
  }

  setOnMetadataCallback(callback: MetadataCallback): void {
    this.onMetadataCallback = callback;
  }

  setTargetFps(targetFps: number): void {
    this.targetFps = targetFps;
  }

  async initialize(file: File, renderer: Canvas2DRender): Promise<void> {
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
        case 'metadata':
          StudioState.getInstance().setMinVideoSizes(message.width, message.height);
          this.onMetadataCallback({
            width: message.width,
            height: message.height,
            totalTimeInMilSeconds: message.totalTimeInMilSeconds,
          });
          break;

        case 'progress':
          this.onProgressCallback(message.progress);
          break;

        case 'complete':
          this.#handleComplete(message.timestamps);
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

  #handleComplete(timestamps: number[]): void {
    if (!this.worker) return;

    const workerVideoStreaming = new WorkerVideoStreaming(
      this.videoId,
      this.worker,
      timestamps
    );

    this.onCompleteCallback(workerVideoStreaming);
  }

  cleanup(): void {
    try {
      if (this.worker) {
        this.worker.postMessage({ type: 'cleanup', videoId: this.videoId } as DemuxWorkerMessage);
        this.worker.terminate();
        this.worker = null;
      }
    } catch (error) {
      console.error('Error during MediaBunnyDemuxer cleanup:', error);
    }
  }
}
