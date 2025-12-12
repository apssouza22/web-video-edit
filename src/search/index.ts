import { SearchService } from './search-service.js';

export { SearchService } from './search-service.js';
export { SearchModelFactory } from './model-factory.js';
export { EmbeddingCalculator } from './embedding-calculator.js';
export { FrameAnalyzer } from './frame-analyzer.js';
export { FrameExtractor } from './frame-extractor.js';
export { SampleFilter } from './sample-filter.js';
export type { SearchResult, SearchMatch, AnalyzedFrameData, SampleFilterConfig } from './types.js';
export { FilteringStrategy, ComparisonMethod } from './types.js';
export type { ExtractedFrame, FrameExtractorConfig } from './frame-extractor.js';

export function createSearchService(): SearchService {
  return new SearchService();
}

