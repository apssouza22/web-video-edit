import { VisionService } from './vision-service.js';

export {
  VisionModelFactory,
  analyzeImage,
  analyzeVideoFrame,
  onModelInferenceError
} from "./vision-model.js";

export { VisionService } from './vision-service.js';
export { VisionView } from './vision-view.js';
export { SampleExtractor } from './sample-extractor.js';
export { FrameComparator, ComparisonMethod } from './frame-comparator.js';

export type {
  VisionResult,
  ModelParams,
  ProgressCallback,
  ProgressCallbackData,
  ModelOptions,
  WorkerMessage,
  WorkerResponseMessage,
  LoadModelMessage,
  AnalyzeImageMessage,
  VisionResultCallback,
  StreamUpdateCallback,
  VisionServiceConfig,
  VisionError,
  SamplingStrategy,
  FrameSample,
  SampleExtractorConfig,
  FrameComparisonResult
} from './types.js';

export function createVisionService(): VisionService {
  return new VisionService();
}

