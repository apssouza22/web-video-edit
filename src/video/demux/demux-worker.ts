import type {DemuxWorkerMessage} from './demux-worker-types';
import {DemuxProcessor} from './demux-processor';

const processors = new Map<string, DemuxProcessor>();

self.addEventListener('message', async (event: MessageEvent<DemuxWorkerMessage>) => {
  const message = event.data;

  if (!message) {
    return;
  }

  switch (message.type) {
    case 'initialize': {
      const processor = new DemuxProcessor(message.videoId, self.postMessage.bind(self));
      processors.set(message.videoId, processor);
      await processor.initialize(message.file, message.targetFps);
      break;
    }

    case 'get-frame': {
      const processor = processors.get(message.videoId);
      if (processor) {
        await processor.getFrame(message.index);
      }
      break;
    }

    case 'cleanup': {
      const processor = processors.get(message.videoId);
      if (processor) {
        processor.cleanup();
        processors.delete(message.videoId);
      }
      break;
    }

    default:
      console.warn('Unknown message received in demux worker:', message);
  }
});
