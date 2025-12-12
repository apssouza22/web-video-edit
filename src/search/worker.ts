import type {
  SearchInVideoMessage,
  SearchResult,
  SearchMatch,
  WorkerMessage,
  WorkerResponseMessage,
  LoadModelMessage,
  AnalyzedFrameData,
} from './types.js';
import {SearchModelFactory, type SearchModels} from './model-factory.js';
import {EmbeddingCalculator} from './embedding-calculator.js';
import {FrameAnalyzer} from './frame-analyzer.js';
import {FrameExtractor} from './frame-extractor.js';
import {SampleFilter} from './sample-filter.js';
import {getAnalyzedFrameCache} from './analyzed-frame-cache.js';

const DEFAULT_MIN_COSINE_SIMILARITY = 0.35;
let models: SearchModels | null = null;
let embeddingCalculator: EmbeddingCalculator | null = null;
let frameAnalyzer: FrameAnalyzer | null = null;
let frameExtractor: FrameExtractor | null = null;
let sampleFilter: SampleFilter | null = null;

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message) {
    return;
  }

  if (isLoadModelMessage(message)) {
    await handleLoadModelMessage();
    return;
  }

  if (isSearchMessage(message)) {
    await handleSearchMessage(message);
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

async function handleLoadModelMessage(): Promise<void> {
  try {
    models = await SearchModelFactory.getInstance((data) => {
      const response: WorkerResponseMessage = {
        status: 'progress',
        task: 'load-model',
        message: data.message,
        progress: data.progress,
      };
      self.postMessage(response);
    });

    embeddingCalculator = new EmbeddingCalculator(models.featureExtractor);
    frameAnalyzer = new FrameAnalyzer(models.model, models.processor, models.tokenizer);
    frameExtractor = new FrameExtractor();
    sampleFilter = new SampleFilter();

    const readyResponse: WorkerResponseMessage = {
      status: 'ready',
      task: 'load-model',
      message: 'Search models loaded successfully!',
    };
    self.postMessage(readyResponse);
  } catch (error) {
    const errorResponse: WorkerResponseMessage = {
      status: 'error',
      task: 'load-model',
      message: (error as Error).message,
    };
    self.postMessage(errorResponse);
  }
}

async function init() {
  if (!models || !embeddingCalculator || !frameAnalyzer || !frameExtractor || !sampleFilter) {
    postProgress('Loading search models...', 0);
    models = await SearchModelFactory.getInstance((data) => {
      postProgress(data.message || 'Loading...', data.progress || 0);
    });
    embeddingCalculator = new EmbeddingCalculator(models.featureExtractor);
    frameAnalyzer = new FrameAnalyzer(models.model, models.processor, models.tokenizer);
    frameExtractor = new FrameExtractor();
    sampleFilter = new SampleFilter();
  }
}

async function analyzeFrames(message: SearchInVideoMessage) {
  postProgress('Extracting frames from video...', 5);
  const extractedFrames = await frameExtractor!.extractFrames(message.videoData, (progress) => {
    postProgress('Extracting frames...', 5 + (progress * 0.1));
  });

  postProgress('Filtering similar frames...', 15);
  const frames = await sampleFilter!.filterFrames(extractedFrames, (progress) => {
    postProgress('Filtering frames...', 15 + (progress * 0.1));
  });
  console.log(`Filtered ${extractedFrames.length} frames down to ${frames.length} unique frames`);

  const analyzedFrames:AnalyzedFrameData[] = [];
  const frameCount = frames.length;
  const startAnalysisTime = performance.now();
  for (let i = 0; i < frameCount; i++) {
    const frame = frames[i];
    const progressPercent = 30 + ((i / frameCount) * 60);
    postProgress(`Analyzing frame ${i + 1}/${frameCount}...`, progressPercent);

    const caption = await frameAnalyzer!.generateCaption(frame.imageDataUrl);
    const embedding = await embeddingCalculator!.calculateEmbedding(caption);

    analyzedFrames.push({
      timestamp: frame.timestamp,
      caption,
      embedding,
      imageDataUrl: frame.imageDataUrl,
    });
  }
  const analysisDuration = performance.now() - startAnalysisTime;
  console.log(`Analyzed ${frameCount} frames in ${analysisDuration.toFixed(2)} ms`);

  postProgress('Caching analysis...', 92);
  return analyzedFrames;
}

async function getAnalyzedFrames(message: SearchInVideoMessage) {
  const frameCache = getAnalyzedFrameCache();
  let analyzedFrames: AnalyzedFrameData[] = [];
  const cachedFrames = await frameCache.get(message.videoId);

  if (cachedFrames) {
    console.log(`Using ${cachedFrames.length} cached frames for video ${message.videoId}`);
    postProgress('Using cached analysis...', 20);
    analyzedFrames = cachedFrames;
  } else {
    analyzedFrames = await analyzeFrames(message);
    await frameCache.set(message.videoId, analyzedFrames);
    console.log(`Cached ${analyzedFrames.length} analyzed frames for video ${message.videoId}`);
  }
  return analyzedFrames;
}

async function handleSearchMessage(message: SearchInVideoMessage): Promise<void> {
  const startTime = performance.now();
  const minSimilarity = message.minCosineSimilarity ?? DEFAULT_MIN_COSINE_SIMILARITY;

  try {
    await init();
    postProgress('Checking cache...', 2);
    let analyzedFrames = await getAnalyzedFrames(message);

    postProgress('Calculating query embedding...', 25);
    const queryEmbedding = await embeddingCalculator!.calculateEmbedding(message.query);

    postProgress('Finding matches...', 95);
    const matches = findMatches(analyzedFrames, queryEmbedding, minSimilarity, message.query);

    const result: SearchResult = {
      query: message.query,
      matches,
      totalMatches: matches.length,
      searchDurationMs: performance.now() - startTime,
    };

    const completeResponse: WorkerResponseMessage = {
      status: 'complete',
      task: 'search',
      data: result,
    };
    self.postMessage(completeResponse);
  } catch (error) {
    const errorResponse: WorkerResponseMessage = {
      status: 'error',
      task: 'search',
      message: (error as Error).message,
    };
    self.postMessage(errorResponse);
  }
}

function postProgress(message: string, progress: number): void {
  const response: WorkerResponseMessage = {
    status: 'progress',
    task: 'search',
    message,
    progress: Math.round(progress),
  };
  self.postMessage(response);
}

function findMatches(
    analyzedFrames: AnalyzedFrameData[],
    queryEmbedding: Float32Array,
    minSimilarity: number,
    query: string
): SearchMatch[] {
  const matches: SearchMatch[] = [];

  for (const frame of analyzedFrames) {
    const similarity = embeddingCalculator!.calculateCosineSimilarity(frame.embedding, queryEmbedding);

    if (similarity >= minSimilarity) {
      matches.push({
        timestamp: Math.round(frame.timestamp * 1000) / 1000,
        confidence: Math.round(similarity * 100) / 100,
        matchedText: frame.caption,
        context: `Frame at ${frame.timestamp.toFixed(2)}s: "${frame.caption}"`,
        imageDataUrl: frame.imageDataUrl,
      });
      continue;
    }

    for (const word of query.split(' ')) {
      if (frame.caption.toLowerCase().includes(word.toLowerCase())) {
        matches.push({
          timestamp: Math.round(frame.timestamp * 1000) / 1000,
          confidence: 1,
          matchedText: frame.caption,
          context: `Frame at ${frame.timestamp.toFixed(2)}s: "${frame.caption}"`,
          imageDataUrl: frame.imageDataUrl,
        });
        break;
      }
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  return matches;
}
