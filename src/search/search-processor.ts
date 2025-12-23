import type {
  SearchInVideoMessage,
  SearchResult,
  SearchMatch,
  WorkerResponseMessage,
  AnalyzedFrameData,
} from './types.js';
import {SearchModelFactory, type SearchModels} from './model-factory.js';
import {EmbeddingCalculator} from './embedding-calculator.js';
import {FrameAnalyzer} from './frame-analyzer.js';
import {FrameExtractor} from './frame-extractor.js';
import {SampleFilter} from './sample-filter.js';
import {getAnalyzedFrameCache} from './analyzed-frame-cache.js';

type PostMessageFn = (message: WorkerResponseMessage) => void;

const DEFAULT_MIN_COSINE_SIMILARITY = 0.25;

export class SearchProcessor {
  #models: SearchModels | null = null;
  #embeddingCalculator: EmbeddingCalculator | null = null;
  #frameAnalyzer: FrameAnalyzer | null = null;
  #frameExtractor: FrameExtractor | null = null;
  #sampleFilter: SampleFilter | null = null;
  #postMessage: PostMessageFn;

  constructor(postMessage: PostMessageFn) {
    this.#postMessage = postMessage;
  }

  async loadModel(): Promise<void> {
    try {
      this.#models = await SearchModelFactory.getInstance((data) => {
        this.#postMessage({
          status: 'progress',
          task: 'load-model',
          message: data.message,
          progress: data.progress,
        });
      });

      this.#embeddingCalculator = new EmbeddingCalculator(this.#models.featureExtractor);
      this.#frameAnalyzer = new FrameAnalyzer(this.#models.model, this.#models.processor, this.#models.tokenizer);
      this.#frameExtractor = new FrameExtractor();
      this.#sampleFilter = new SampleFilter();

      this.#postMessage({
        status: 'ready',
        task: 'load-model',
        message: 'Search models loaded successfully!',
      });
    } catch (error) {
      this.#postError('load-model', (error as Error).message);
    }
  }

  async search(message: SearchInVideoMessage): Promise<void> {
    const startTime = performance.now();
    const minSimilarity = message.minCosineSimilarity ?? DEFAULT_MIN_COSINE_SIMILARITY;

    try {
      await this.#init();
      const analyzedFrames = await this.#getAnalyzedFrames(message);

      this.#postProgress('Calculating query embedding...', 25);
      const queryEmbedding = await this.#embeddingCalculator!.calculateEmbedding(message.query);

      this.#postProgress('Finding matches...', 95);
      const matches = this.#findMatches(analyzedFrames, queryEmbedding, minSimilarity, message.query);

      const result: SearchResult = {
        query: message.query,
        matches,
        totalMatches: matches.length,
        searchDurationMs: performance.now() - startTime,
      };

      this.#postMessage({
        status: 'complete',
        task: 'search',
        data: result,
      });
    } catch (error) {
      this.#postError('search', (error as Error).message);
    }
  }

  async #init(): Promise<void> {
    if (this.#models && this.#embeddingCalculator && this.#frameAnalyzer && this.#frameExtractor && this.#sampleFilter) {
      return;
    }

    this.#postProgress('Loading search models...', 0);
    this.#models = await SearchModelFactory.getInstance((data) => {
      this.#postProgress(data.message || 'Loading...', data.progress || 0);
    });
    this.#embeddingCalculator = new EmbeddingCalculator(this.#models.featureExtractor);
    this.#frameAnalyzer = new FrameAnalyzer(this.#models.model, this.#models.processor, this.#models.tokenizer);
    this.#frameExtractor = new FrameExtractor();
    this.#sampleFilter = new SampleFilter();
  }

  async #getAnalyzedFrames(message: SearchInVideoMessage): Promise<AnalyzedFrameData[]> {
    this.#postProgress('Checking cache...', 2);
    const frameCache = getAnalyzedFrameCache();
    const cachedFrames = await frameCache.get(message.videoId);

    if (cachedFrames) {
      console.log(`Using ${cachedFrames.length} cached frames for video ${message.videoId}`);
      this.#postProgress('Using cached analysis...', 20);
      return cachedFrames;
    }

    const analyzedFrames = await this.#analyzeFrames(message);
    await frameCache.set(message.videoId, analyzedFrames);
    console.log(`Cached ${analyzedFrames.length} analyzed frames for video ${message.videoId}`);
    return analyzedFrames;
  }

  async #analyzeFrames(message: SearchInVideoMessage): Promise<AnalyzedFrameData[]> {
    this.#postProgress('Extracting frames from video...', 5);
    const extractedFrames = await this.#frameExtractor!.extractFrames(message.videoData, (progress) => {
      this.#postProgress('Extracting frames...', 5 + (progress * 0.1));
    });

    this.#postProgress('Filtering similar frames...', 15);
    const frames = await this.#sampleFilter!.filterFrames(extractedFrames, (progress) => {
      this.#postProgress('Filtering frames...', 15 + (progress * 0.1));
    });
    console.log(`Filtered ${extractedFrames.length} frames down to ${frames.length} unique frames`);

    const analyzedFrames: AnalyzedFrameData[] = [];
    const frameCount = frames.length;
    const startAnalysisTime = performance.now();

    for (let i = 0; i < frameCount; i++) {
      const frame = frames[i];
      const progressPercent = 30 + ((i / frameCount) * 60);
      this.#postProgress(`Analyzing frame ${i + 1}/${frameCount}...`, progressPercent);

      const caption = await this.#frameAnalyzer!.generateCaption(frame.imageDataUrl);
      const embedding = await this.#embeddingCalculator!.calculateEmbedding(caption);

      analyzedFrames.push({
        timestamp: frame.timestamp,
        caption,
        embedding,
        imageDataUrl: frame.imageDataUrl,
      });
    }

    const analysisDuration = performance.now() - startAnalysisTime;
    console.log(`Analyzed ${frameCount} frames in ${analysisDuration.toFixed(2)} ms`);

    this.#postProgress('Caching analysis...', 92);
    return analyzedFrames;
  }

  #findMatches(
    analyzedFrames: AnalyzedFrameData[],
    queryEmbedding: Float32Array,
    minSimilarity: number,
    query: string
  ): SearchMatch[] {
    const matches: SearchMatch[] = [];

    for (const frame of analyzedFrames) {
      const similarity = this.#embeddingCalculator!.calculateCosineSimilarity(frame.embedding, queryEmbedding);

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
            confidence: 0.9,
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

  #postProgress(message: string, progress: number): void {
    this.#postMessage({
      status: 'progress',
      task: 'search',
      message,
      progress: Math.round(progress),
    });
  }

  #postError(task: string, message: string): void {
    this.#postMessage({
      status: 'error',
      task,
      message,
    });
  }
}

