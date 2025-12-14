import type {
  SearchInVideoMessage,
  WorkerMessage,
  LoadModelMessage,
} from './types.js';
import {SearchProcessor} from './search-processor.js';

const processor = new SearchProcessor(self.postMessage.bind(self));

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (!message) {
    return;
  }

  if (isLoadModelMessage(message)) {
    await processor.loadModel();
    return;
  }

  if (isSearchMessage(message)) {
    await processor.search(message);
    return;
  }

  console.warn('Unknown message received in search worker:', message);
});

function isLoadModelMessage(message: WorkerMessage): message is LoadModelMessage {
  return message.task === 'load-model';
}

function isSearchMessage(message: WorkerMessage): message is SearchInVideoMessage {
  return message.task === 'search' && message.query !== undefined && message.videoData !== undefined;
}
