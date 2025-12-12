import type { ExtractedFrame } from './frame-extractor.js';
import type { SampleFilterConfig } from './types.js';
import { FilteringStrategy, ComparisonMethod } from './types.js';

const DEFAULT_CONFIG: Required<SampleFilterConfig> = {
  strategy: FilteringStrategy.ADAPTIVE,
  maxSamples: 30,
  minSamples: 5,
  similarityThreshold: 0.15,
  comparisonMethod: ComparisonMethod.HISTOGRAM,
};

export class SampleFilter {
  #config: Required<SampleFilterConfig>;
  #canvas: OffscreenCanvas;
  #context: OffscreenCanvasRenderingContext2D;

  constructor(config?: Partial<SampleFilterConfig>) {
    this.#config = { ...DEFAULT_CONFIG, ...config };
    this.#canvas = new OffscreenCanvas(640, 480);
    this.#context = this.#canvas.getContext('2d')!;
  }

  async filterFrames(
    frames: ExtractedFrame[],
    onProgress?: (progress: number) => void
  ): Promise<ExtractedFrame[]> {
    if (frames.length <= this.#config.minSamples) {
      return frames;
    }

    switch (this.#config.strategy) {
      case FilteringStrategy.SCENE_CHANGE:
        return this.#filterBySceneChange(frames, onProgress);
      case FilteringStrategy.ADAPTIVE:
        return this.#filterAdaptive(frames, onProgress);
      default:
        return this.#filterAdaptive(frames, onProgress);
    }
  }

  async #filterBySceneChange(
    frames: ExtractedFrame[],
    onProgress?: (progress: number) => void
  ): Promise<ExtractedFrame[]> {
    const filtered: ExtractedFrame[] = [];
    let previousImageData: ImageData | null = null;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const imageData = await this.#dataUrlToImageData(frame.imageDataUrl);

      if (!imageData) {
        continue;
      }

      if (!previousImageData) {
        filtered.push(frame);
        previousImageData = imageData;
        onProgress?.(((i + 1) / frames.length) * 100);
        continue;
      }

      if (filtered.length >= this.#config.maxSamples) {
        break;
      }

      const isDifferent = this.#compareFrames(previousImageData, imageData);

      if (isDifferent) {
        filtered.push(frame);
        previousImageData = imageData;
      }

      onProgress?.(((i + 1) / frames.length) * 100);
    }

    return this.#ensureMinimumSamples(filtered, frames);
  }

  async #filterAdaptive(
    frames: ExtractedFrame[],
    onProgress?: (progress: number) => void
  ): Promise<ExtractedFrame[]> {
    const filtered: ExtractedFrame[] = [];
    let previousImageData: ImageData | null = null;
    let consecutiveSimilar = 0;
    let skipInterval = 1;

    for (let i = 0; i < frames.length; i += skipInterval) {
      const frame = frames[i];
      const imageData = await this.#dataUrlToImageData(frame.imageDataUrl);

      if (!imageData) {
        continue;
      }

      if (!previousImageData) {
        filtered.push(frame);
        previousImageData = imageData;
        onProgress?.(((i + 1) / frames.length) * 100);
        continue;
      }

      if (filtered.length >= this.#config.maxSamples) {
        break;
      }

      const isDifferent = this.#compareFrames(previousImageData, imageData);

      if (isDifferent) {
        filtered.push(frame);
        previousImageData = imageData;
        consecutiveSimilar = 0;
        skipInterval = Math.max(1, Math.floor(skipInterval * 0.8));
      } else {
        consecutiveSimilar++;
        if (consecutiveSimilar > 2) {
          skipInterval = Math.min(
            Math.floor(frames.length / this.#config.minSamples),
            Math.floor(skipInterval * 1.5)
          );
        }
      }

      onProgress?.(((i + 1) / frames.length) * 100);
    }

    return this.#ensureMinimumSamples(filtered, frames);
  }

  #compareFrames(frame1: ImageData, frame2: ImageData): boolean {
    if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
      return true;
    }

    let similarity = 0;

    switch (this.#config.comparisonMethod) {
      case ComparisonMethod.HISTOGRAM:
        similarity = this.#compareHistogram(frame1, frame2);
        break;
      case ComparisonMethod.PIXEL_DIFFERENCE:
        similarity = this.#comparePixelDifference(frame1, frame2);
        break;
      default:
        similarity = this.#compareHistogram(frame1, frame2);
    }

    return similarity > this.#config.similarityThreshold;
  }

  #compareHistogram(frame1: ImageData, frame2: ImageData): number {
    const hist1 = this.#calculateHistogram(frame1);
    const hist2 = this.#calculateHistogram(frame2);

    let difference = 0;
    for (let i = 0; i < hist1.length; i++) {
      difference += Math.abs(hist1[i] - hist2[i]);
    }

    return difference / (frame1.width * frame1.height * 2);
  }

  #calculateHistogram(frame: ImageData): number[] {
    const histogram = new Array(256 * 3).fill(0);
    const data = frame.data;

    for (let i = 0; i < data.length; i += 4) {
      histogram[data[i]]++;
      histogram[256 + data[i + 1]]++;
      histogram[512 + data[i + 2]]++;
    }

    return histogram;
  }

  #comparePixelDifference(frame1: ImageData, frame2: ImageData): number {
    const data1 = frame1.data;
    const data2 = frame2.data;

    let totalDifference = 0;
    for (let i = 0; i < data1.length; i += 4) {
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
      totalDifference += (rDiff + gDiff + bDiff) / 3;
    }

    return totalDifference / (data1.length / 4) / 255;
  }

  #ensureMinimumSamples(
    filtered: ExtractedFrame[],
    original: ExtractedFrame[]
  ): ExtractedFrame[] {
    if (filtered.length >= this.#config.minSamples) {
      return filtered;
    }

    const neededSamples = this.#config.minSamples - filtered.length;
    const step = Math.floor(original.length / neededSamples);
    const existingTimestamps = new Set(filtered.map((f) => f.timestamp));

    for (let i = 0; i < neededSamples && filtered.length < this.#config.minSamples; i++) {
      const frameIndex = Math.min(i * step, original.length - 1);
      const frame = original[frameIndex];

      if (!existingTimestamps.has(frame.timestamp)) {
        filtered.push(frame);
        existingTimestamps.add(frame.timestamp);
      }
    }

    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }

  async #dataUrlToImageData(dataUrl: string): Promise<ImageData | null> {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      this.#canvas.width = imageBitmap.width;
      this.#canvas.height = imageBitmap.height;
      this.#context.drawImage(imageBitmap, 0, 0);

      return this.#context.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
    } catch (error) {
      console.error('Error converting data URL to ImageData:', error);
      return null;
    }
  }

  updateConfig(config: Partial<SampleFilterConfig>): void {
    this.#config = { ...this.#config, ...config };
  }

  getConfig(): Required<SampleFilterConfig> {
    return { ...this.#config };
  }
}

