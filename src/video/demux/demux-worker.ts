import { ALL_FORMATS, BlobSource, Input, VideoSampleSink } from 'mediabunny';
import type {
  DemuxWorkerMessage,
  DemuxWorkerResponse,
  InitializeMessage,
  GetFrameMessage,
} from './demux-worker-types';

let input: Input | null = null;
let videoSink: VideoSampleSink | null = null;
let timestamps: number[] = [];
let isProcessing = false;

self.addEventListener('message', async (event: MessageEvent<DemuxWorkerMessage>) => {
  const message = event.data;

  if (!message) {
    return;
  }

  switch (message.type) {
    case 'initialize':
      await handleInitialize(message);
      break;
    case 'get-frame':
      await handleGetFrame(message);
      break;
    case 'cleanup':
      handleCleanup();
      break;
    default:
      console.warn('Unknown message received in demux worker:', message);
  }
});

async function handleInitialize(message: InitializeMessage): Promise<void> {
  try {
    isProcessing = true;
    timestamps = [];

    const source = new BlobSource(message.file);
    input = new Input({
      source,
      formats: ALL_FORMATS,
    });

    const totalDuration = await input.computeDuration();
    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) {
      postError('No video track found in the file');
      return;
    }

    if (videoTrack.codec === null) {
      postError('Unsupported video codec');
      return;
    }

    if (!(await videoTrack.canDecode())) {
      postError('Unable to decode the video track');
      return;
    }

    const width = videoTrack.displayWidth;
    const height = videoTrack.displayHeight;
    const totalTimeInMilSeconds = totalDuration * 1000;

    videoSink = new VideoSampleSink(videoTrack);

    postMessage({
      type: 'metadata',
      width,
      height,
      totalTimeInMilSeconds,
    } as DemuxWorkerResponse);

    await extractTimestamps(totalDuration, message.targetFps);
  } catch (error) {
    console.error('Demux worker initialization error:', error);
    handleCleanup();
    postError(error instanceof Error ? error.message : 'Unknown initialization error');
  }
}

async function extractTimestamps(totalDuration: number, targetFps: number): Promise<void> {
  if (!videoSink) {
    return;
  }

  try {
    const frameInterval = 1 / targetFps;
    const totalFramesTarget = Math.floor(totalDuration * targetFps);

    console.log(`[Worker] Extracting timestamps at ${targetFps} fps (${totalFramesTarget} total frames)`);

    let currentFrameIndex = 0;
    let nextTargetTime = 0;

    const frameIterator = videoSink.samples(0);

    for await (const videoSample of frameIterator) {
      if (!isProcessing) {
        break;
      }

      const timestamp = videoSample.timestamp;

      if (timestamp >= nextTargetTime && currentFrameIndex < totalFramesTarget) {
        timestamps.push(timestamp);

        currentFrameIndex++;
        nextTargetTime = currentFrameIndex * frameInterval;

        const progress = totalFramesTarget > 0
          ? Math.min(100, (currentFrameIndex / totalFramesTarget) * 100)
          : 0;

        postMessage({
          type: 'progress',
          progress,
        } as DemuxWorkerResponse);
      }

      if (currentFrameIndex >= totalFramesTarget) {
        break;
      }
    }

    console.log(`[Worker] Extracted ${timestamps.length} timestamps at ${targetFps} fps`);

    postMessage({
      type: 'progress',
      progress: 100,
    } as DemuxWorkerResponse);

    postMessage({
      type: 'complete',
      timestamps: [...timestamps],
    } as DemuxWorkerResponse);
  } catch (error) {
    console.error('[Worker] Error extracting timestamps:', error);
    postError(error instanceof Error ? error.message : 'Error extracting timestamps');
  }
}

async function handleGetFrame(message: GetFrameMessage): Promise<void> {
  const { index } = message;

  if (!videoSink || index < 0 || index >= timestamps.length) {
    postMessage({
      type: 'frame',
      index,
      frame: null,
    } as DemuxWorkerResponse);
    return;
  }

  try {
    const timestamp = timestamps[index];
    if (timestamp === undefined) {
      console.warn(`[Worker] Not found frame at index ${index}`);
      postMessage({
        type: 'frame',
        index,
        frame: null,
      } as DemuxWorkerResponse);
      return;
    }

    const sample = await videoSink.getSample(timestamp);

    if (sample) {
      const videoFrame = sample.toVideoFrame();
      postMessage(
        {
          type: 'frame',
          index,
          frame: videoFrame,
        } as DemuxWorkerResponse,
        [videoFrame]
      );
    } else {
      postMessage({
        type: 'frame',
        index,
        frame: null,
      } as DemuxWorkerResponse);
    }
  } catch (error) {
    console.error(`[Worker] Error loading frame at index ${index}:`, error);
    postMessage({
      type: 'frame',
      index,
      frame: null,
    } as DemuxWorkerResponse);
  }
}

function handleCleanup(): void {
  try {
    isProcessing = false;
    timestamps = [];
    input = null;
    videoSink = null;
  } catch (error) {
    console.error('[Worker] Error during cleanup:', error);
  }
}

function postError(message: string): void {
  isProcessing = false;
  postMessage({
    type: 'error',
    message,
  } as DemuxWorkerResponse);
}

