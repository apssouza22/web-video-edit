import { 
  SampleExtractor, 
  FrameComparator, 
  ComparisonMethod,
  SamplingStrategy 
} from './index.js';
import type { AbstractMedia } from '@/media';

export async function extractAndAnalyzeKeyFrames(media: AbstractMedia) {
  const extractor = new SampleExtractor({
    strategy: SamplingStrategy.ADAPTIVE,
    maxSamples: 10,
    minSamples: 3,
    similarityThreshold: 0.15,
    comparisonMethod: ComparisonMethod.HISTOGRAM
  });

  const samples = await extractor.extractSamples(media);
  
  console.log(`Extracted ${samples.length} unique frames:`);
  samples.forEach((sample, index) => {
    const timeInSeconds = (sample.timestamp / 1000).toFixed(2);
    console.log(`  ${index + 1}. Frame ${sample.frameIndex} at ${timeInSeconds}s`);
  });

  return samples;
}

export async function extractSceneChanges(media: AbstractMedia) {
  const extractor = new SampleExtractor({
    strategy: SamplingStrategy.SCENE_CHANGE,
    maxSamples: 20,
    minSamples: 5,
    similarityThreshold: 0.20,
    comparisonMethod: ComparisonMethod.HISTOGRAM
  });

  const sceneChanges = await extractor.extractSamples(media);
  
  console.log(`Detected ${sceneChanges.length} scene changes`);
  return sceneChanges;
}

export async function compareFramesSample(media: AbstractMedia) {
  const extractor = new SampleExtractor();
  const samples = await extractor.extractSamples(media);

  if (samples.length < 2) {
    console.log('Not enough samples to compare');
    return;
  }

  const comparator = new FrameComparator(0.15);
  
  console.log('Frame comparisons:');
  for (let i = 0; i < samples.length - 1; i++) {
    const result = comparator.compare(
      samples[i].imageData,
      samples[i + 1].imageData,
      ComparisonMethod.HISTOGRAM
    );
    
    console.log(
      `Frame ${i} vs Frame ${i + 1}: ` +
      `similarity=${result.similarity.toFixed(4)}, ` +
      `different=${result.isDifferent}`
    );
  }
}

export async function adaptiveSamplingExample(media: AbstractMedia) {
  const extractor = new SampleExtractor({
    strategy: SamplingStrategy.ADAPTIVE,
    maxSamples: 15,
    minSamples: 5,
    intervalSeconds: 5,
    similarityThreshold: 0.15
  });

  console.log('Starting adaptive sampling...');
  const samples = await extractor.extractSamples(media);
  
  const timestamps = samples.map(s => (s.timestamp / 1000).toFixed(2));
  console.log(`Sampled at times (seconds): ${timestamps.join(', ')}`);
  
  const history = extractor.getSampleHistory();
  console.log(`Total frames compared during extraction: ${history.length}`);
  
  return samples;
}

export async function compareAllMethods(frame1: ImageData, frame2: ImageData) {
  const comparator = new FrameComparator(0.15);
  
  const methods = [
    ComparisonMethod.HISTOGRAM,
    ComparisonMethod.PERCEPTUAL_HASH,
    ComparisonMethod.PIXEL_DIFFERENCE,
    ComparisonMethod.EDGE_DETECTION
  ];

  console.log('Comparing frames using all methods:');
  
  for (const method of methods) {
    const result = comparator.compare(frame1, frame2, method);
    console.log(
      `${method}: similarity=${result.similarity.toFixed(4)}, ` +
      `different=${result.isDifferent}`
    );
  }
}

export async function customIntervalSampling(media: AbstractMedia, intervalSeconds: number = 2) {
  const extractor = new SampleExtractor({
    strategy: SamplingStrategy.TIME_BASED,
    intervalSeconds,
    maxSamples: 50
  });

  const samples = await extractor.extractSamples(media);
  
  console.log(`Extracted ${samples.length} frames at ${intervalSeconds}s intervals`);
  return samples;
}

export async function uniformDistributionSampling(media: AbstractMedia, numSamples: number = 10) {
  const extractor = new SampleExtractor({
    strategy: SamplingStrategy.UNIFORM,
    maxSamples: numSamples,
    minSamples: numSamples
  });

  const samples = await extractor.extractSamples(media);
  
  const videoDuration = media.totalTimeInMilSeconds / 1000;
  console.log(`Extracted ${samples.length} evenly distributed samples from ${videoDuration}s video`);
  
  return samples;
}

