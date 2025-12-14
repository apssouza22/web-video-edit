import type {DemuxWorkerMessage} from './demux-worker-types';
import {DemuxProcessor} from './demux-processor';

const processor = new DemuxProcessor(self.postMessage.bind(self));

self.addEventListener('message', async (event: MessageEvent<DemuxWorkerMessage>) => {
  const message = event.data;

  if (!message) {
    return;
  }

  switch (message.type) {
    case 'initialize':
      await processor.initialize(message.file, message.targetFps);
      break;

    case 'get-frame':
      await processor.getFrame(message.index);
      break;

    case 'cleanup':
      processor.cleanup();
      break;

    default:
      console.warn('Unknown message received in demux worker:', message);
  }
});
