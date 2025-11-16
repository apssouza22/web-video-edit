import { VisionService } from './vision-service.js';
import { SampleExtractor } from './sample-extractor.js';
import { SamplingStrategy } from './types.js';
import {ComparisonMethod} from "@/vision/frame-comparator";

export { VisionService } from './vision-service.js';

export function createVisionService(): VisionService {
  const sampleExtractor = new SampleExtractor({
    strategy: SamplingStrategy.SCENE_CHANGE,
    maxSamples: 1000,
    minSamples: 5,
    similarityThreshold: 0.20,
    comparisonMethod: ComparisonMethod.HISTOGRAM
  })
  return new VisionService(sampleExtractor);
}

