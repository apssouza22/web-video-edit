import type {
  SearchInVideoMessage,
  SearchResult,
  SearchMatch,
  WorkerMessage,
  WorkerResponseMessage
} from './types.js';

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message) {
    return;
  }
  if (isSearchMessage(message)) {
    await handleSearchMessage(message);
    return;
  }
  console.warn('Unknown message received in search worker:', message);
});

function isSearchMessage(message: WorkerMessage): message is SearchInVideoMessage {
  return message.task === 'search' && message.query !== undefined && message.videoData !== undefined;
}

async function handleSearchMessage(message: SearchInVideoMessage): Promise<void> {
  const progressResponse: WorkerResponseMessage = {
    status: 'progress',
    task: 'search',
    progress: 0,
  };
  self.postMessage(progressResponse);
  const startTime = performance.now();
  await simulateSearchDelay();
  const result = generateMockedSearchResult(message.query, message.videoData.byteLength);
  result.searchDurationMs = performance.now() - startTime;
  const completeResponse: WorkerResponseMessage = {
    status: 'complete',
    task: 'search',
    data: result,
  };
  self.postMessage(completeResponse);
}

function simulateSearchDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 500));
}

function generateMockedSearchResult(query: string, videoSize: number): SearchResult {
  const estimatedDurationSeconds = Math.max(30, videoSize / 100000);
  const matchCount = Math.floor(Math.random() * 5) + 1;
  const matches: SearchMatch[] = [];
  for (let i = 0; i < matchCount; i++) {
    const timestamp = Math.random() * estimatedDurationSeconds;
    matches.push({
      timestamp: Math.round(timestamp * 1000) / 1000,
      confidence: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
      matchedText: query,
      context: generateMockedContext(query, i),
    });
  }
  matches.sort((a, b) => a.timestamp - b.timestamp);
  return {
    query,
    matches,
    totalMatches: matchCount,
    searchDurationMs: 0,
  };
}

function generateMockedContext(query: string, index: number): string {
  const contexts = [
    `Scene showing "${query}" prominently in frame`,
    `Text overlay containing "${query}" visible`,
    `Audio transcript mentions "${query}"`,
    `Object detected matching "${query}"`,
    `Visual content related to "${query}"`,
  ];
  return contexts[index % contexts.length];
}
