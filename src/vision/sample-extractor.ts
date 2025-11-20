import {AbstractMedia} from '@/media';
import {ComparisonMethod, FrameComparator} from './frame-comparator.js';
import type {FrameSample, SampleExtractorConfig} from './types.js';
import {SamplingStrategy as Strategy} from './types.js';
import {delay} from "@/common/utils";


export class SampleExtractor {
  #config: Required<SampleExtractorConfig>;
  #comparator: FrameComparator;
  #previousSamples: FrameSample[] = [];

  constructor(config?: SampleExtractorConfig) {
    this.#config = {
      strategy: config?.strategy || Strategy.ADAPTIVE,
      maxSamples: config?.maxSamples || 10,
      minSamples: config?.minSamples || 3,
      similarityThreshold: config?.similarityThreshold || 0.15,
      comparisonMethod: config?.comparisonMethod || ComparisonMethod.HISTOGRAM
    };
    this.#comparator = new FrameComparator(this.#config.similarityThreshold);
  }

  async extractSamples(media: AbstractMedia): Promise<FrameSample[]> {
    if (!media.ready) {
      console.warn('Media not ready for sampling');
      return [];
    }
    this.#previousSamples = [];
    switch (this.#config.strategy) {
      case Strategy.SCENE_CHANGE:
        return this.#extractSceneChangeSamples(media);
      case Strategy.ADAPTIVE:
        return this.#extractAdaptiveSamples(media);
      default:
        return this.#extractAdaptiveSamples(media);
    }
  }

  async #extractSceneChangeSamples(media: AbstractMedia): Promise<FrameSample[]> {
    const samples: FrameSample[] = [];
    const totalFrames = media.frameService.getLength();
    const sampleEvery = Math.max(1, Math.floor(totalFrames / (this.#config.maxSamples * 2)));

    let previousImageData: ImageData | null = null;

    for (let i = 0; i < totalFrames && samples.length < this.#config.maxSamples; i += sampleEvery) {
      const time = media.start_time + (i * (media.totalTimeInMilSeconds / totalFrames));
      const imageData = await this.#extractFrameAtTime(media, time);
      await delay(500);
      if (!imageData) continue;
      if (!previousImageData) {
        samples.push({imageData, timestamp: time});
        previousImageData = imageData;
        continue;
      }
      const comparison = this.#comparator.compare(
          previousImageData,
          imageData,
          this.#config.comparisonMethod as ComparisonMethod
      );
      if (comparison.isDifferent) {
        samples.push({imageData, timestamp: time});
        previousImageData = imageData;
      }
    }

    return this.#ensureMinimumSamples(samples, media);
  }

  async #extractAdaptiveSamples(media: AbstractMedia): Promise<FrameSample[]> {
    const samples: FrameSample[] = [];
    const durationSeconds = media.totalTimeInMilSeconds / 1000;

    const minInterval = Math.max(1, durationSeconds / this.#config.maxSamples);
    const maxInterval = Math.max(minInterval * 2, durationSeconds / this.#config.minSamples);

    let currentInterval = minInterval;
    let currentTime = media.start_time;
    const endTime = media.start_time + media.totalTimeInMilSeconds;
    let consecutiveSimilar = 0;

    const firstFrame = await this.#extractFrameAtTime(media, currentTime);
    await delay(500);
    if (firstFrame) {
      samples.push({imageData: firstFrame, timestamp: currentTime});
    }

    currentTime += currentInterval * 1000;

    while (currentTime < endTime && samples.length < this.#config.maxSamples) {
      const imageData = await this.#extractFrameAtTime(media, currentTime);
      await delay(500);
      if (imageData) {
        const isDifferent = this.#isDifferentFromPrevious(imageData);

        if (isDifferent) {
          samples.push({imageData, timestamp: currentTime});
          consecutiveSimilar = 0;
          currentInterval = Math.max(minInterval, currentInterval * 0.8);
          continue;
        }
        consecutiveSimilar++;

        if (consecutiveSimilar > 2) {
          currentInterval = Math.min(maxInterval, currentInterval * 1.5);
        }
      }
      currentTime += currentInterval * 1000;
    }
    return this.#ensureMinimumSamples(samples, media);
  }


  async #extractFrameAtTime(media: AbstractMedia, time: number): Promise<ImageData | null> {
    try {
      const frame = await media.getFrame(time);
      return frame?.toImageData() || null;
    } catch (error) {
      console.error('Error extracting frame at time', time, error);
      return null;
    }
  }

  #isDifferentFromPrevious(imageData: ImageData): boolean {
    if (this.#previousSamples.length === 0) {
      this.#previousSamples.push({
        imageData,
        timestamp: 0,
      });
      return true;
    }

    const lastSample = this.#previousSamples[this.#previousSamples.length - 1];
    const comparison = this.#comparator.compare(
        lastSample.imageData,
        imageData,
        this.#config.comparisonMethod as ComparisonMethod
    );

    if (comparison.isDifferent) {
      this.#previousSamples.push({
        imageData,
        timestamp: 0,
      });
      return true;
    }

    return false;
  }

  async #ensureMinimumSamples(samples: FrameSample[], media: AbstractMedia): Promise<FrameSample[]> {
    if (samples.length >= this.#config.minSamples) {
      return samples;
    }

    const totalFrames = media.frameService.getLength();
    const neededSamples = this.#config.minSamples - samples.length;
    const step = Math.floor(totalFrames / neededSamples);

    for (let i = 0; i < neededSamples; i++) {
      const frameIndex = i * step;
      const time = media.start_time + (frameIndex * (media.totalTimeInMilSeconds / totalFrames));

      const alreadySampled = samples.some(s =>
          Math.abs(s.timestamp - time) < 100
      );

      if (!alreadySampled) {
        const imageData = await this.#extractFrameAtTime(media, time);
        await delay(500);
        if (imageData) {
          samples.push({
            imageData,
            timestamp: time,
          });
        }
      }
    }

    return samples.sort((a, b) => a.timestamp - b.timestamp);
  }

  clearHistory(): void {
    this.#previousSamples = [];
  }

  getSampleHistory(): FrameSample[] {
    return [...this.#previousSamples];
  }

  updateConfig(config: Partial<SampleExtractorConfig>): void {
    this.#config = {
      ...this.#config,
      ...config
    };

    if (config.similarityThreshold !== undefined) {
      this.#comparator = new FrameComparator(config.similarityThreshold);
    }
  }

  getConfig(): Required<SampleExtractorConfig> {
    return {...this.#config};
  }
}

