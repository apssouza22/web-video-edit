import { SampleExtractor } from '@/vision/sample-extractor';
import { FrameComparator, ComparisonMethod } from '@/vision/frame-comparator';
import { SamplingStrategy } from '@/vision/types';
import { AbstractMedia } from '@/media/media-common';
import { FrameService } from '@/frame';

describe('SampleExtractor', () => {
  let sampleExtractor: SampleExtractor;
  let mockMedia: AbstractMedia;

  beforeEach(() => {
    sampleExtractor = new SampleExtractor();

    mockMedia = {
      ready: true,
      width: 640,
      height: 480,
      totalTimeInMilSeconds: 10000,
      startTime: 0,
      framesCollection: {
        getLength: jest.fn().mockReturnValue(300),
        getIndex: jest.fn((time: number, startTime: number) => {
          return Math.floor((time - startTime) / 33.33);
        }),
        frames: []
      } as unknown as FrameService,
      render: jest.fn().mockResolvedValue(undefined)
    } as unknown as AbstractMedia;
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const extractor = new SampleExtractor();
      const config = extractor.getConfig();
      
      expect(config.strategy).toBe(SamplingStrategy.ADAPTIVE);
      expect(config.maxSamples).toBe(10);
      expect(config.minSamples).toBe(3);
      expect(config.intervalSeconds).toBe(5);
      expect(config.similarityThreshold).toBe(0.15);
    });

    it('should create with custom config', () => {
      const extractor = new SampleExtractor({
        strategy: SamplingStrategy.TIME_BASED,
        maxSamples: 20,
        minSamples: 5,
        intervalSeconds: 2
      });
      const config = extractor.getConfig();
      
      expect(config.strategy).toBe(SamplingStrategy.TIME_BASED);
      expect(config.maxSamples).toBe(20);
      expect(config.minSamples).toBe(5);
      expect(config.intervalSeconds).toBe(2);
    });
  });

  describe('extractSamples', () => {
    it('should return empty array if media is not ready', async () => {
      mockMedia.ready = false;
      const samples = await sampleExtractor.extractSamples(mockMedia);
      
      expect(samples).toEqual([]);
    });

    it('should extract samples based on strategy', async () => {
      const extractor = new SampleExtractor({
        strategy: SamplingStrategy.UNIFORM,
        maxSamples: 5,
        minSamples: 5
      });

      const mockImageData = new ImageData(640, 480);
      const mockRenderer = {
        setSize: jest.fn(),
        getImageData: jest.fn().mockReturnValue(mockImageData),
        context: {}
      };

      jest.spyOn(extractor as any, 'renderer', 'get').mockReturnValue(mockRenderer);

      const samples = await extractor.extractSamples(mockMedia);
      
      expect(samples.length).toBeGreaterThan(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      sampleExtractor.updateConfig({
        maxSamples: 15,
        minSamples: 7
      });
      
      const config = sampleExtractor.getConfig();
      expect(config.maxSamples).toBe(15);
      expect(config.minSamples).toBe(7);
    });

    it('should update comparator when threshold changes', () => {
      sampleExtractor.updateConfig({
        similarityThreshold: 0.25
      });
      
      const config = sampleExtractor.getConfig();
      expect(config.similarityThreshold).toBe(0.25);
    });
  });

  describe('clearHistory', () => {
    it('should clear sample history', () => {
      sampleExtractor.clearHistory();
      const history = sampleExtractor.getSampleHistory();
      
      expect(history).toEqual([]);
    });
  });

  describe('getSampleHistory', () => {
    it('should return sample history', () => {
      const history = sampleExtractor.getSampleHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });
});

describe('FrameComparator', () => {
  let comparator: FrameComparator;
  let frame1: ImageData;
  let frame2: ImageData;

  beforeEach(() => {
    comparator = new FrameComparator(0.15);
    
    frame1 = new ImageData(100, 100);
    frame2 = new ImageData(100, 100);
    
    for (let i = 0; i < frame1.data.length; i += 4) {
      frame1.data[i] = 128;
      frame1.data[i + 1] = 128;
      frame1.data[i + 2] = 128;
      frame1.data[i + 3] = 255;
    }
    
    for (let i = 0; i < frame2.data.length; i += 4) {
      frame2.data[i] = 128;
      frame2.data[i + 1] = 128;
      frame2.data[i + 2] = 128;
      frame2.data[i + 3] = 255;
    }
  });

  describe('compare', () => {
    it('should return similarity 0 if frames are null', () => {
      const result = comparator.compare(null as any, frame2);
      
      expect(result.similarity).toBe(0);
      expect(result.isDifferent).toBe(true);
    });

    it('should return similarity 0 if frames have different dimensions', () => {
      const frame3 = new ImageData(50, 50);
      const result = comparator.compare(frame1, frame3);
      
      expect(result.similarity).toBe(0);
      expect(result.isDifferent).toBe(true);
    });

    it('should detect identical frames using histogram', () => {
      const result = comparator.compare(frame1, frame2, ComparisonMethod.HISTOGRAM);
      
      expect(result.similarity).toBeLessThan(0.15);
      expect(result.isDifferent).toBe(false);
      expect(result.method).toBe(ComparisonMethod.HISTOGRAM);
    });

    it('should detect different frames using histogram', () => {
      for (let i = 0; i < frame2.data.length; i += 4) {
        frame2.data[i] = 200;
        frame2.data[i + 1] = 50;
        frame2.data[i + 2] = 100;
      }
      
      const result = comparator.compare(frame1, frame2, ComparisonMethod.HISTOGRAM);
      
      expect(result.similarity).toBeGreaterThan(0);
      expect(result.isDifferent).toBe(true);
    });

    it('should detect identical frames using pixel difference', () => {
      const result = comparator.compare(frame1, frame2, ComparisonMethod.PIXEL_DIFFERENCE);
      
      expect(result.similarity).toBe(0);
      expect(result.isDifferent).toBe(false);
      expect(result.method).toBe(ComparisonMethod.PIXEL_DIFFERENCE);
    });

    it('should detect different frames using pixel difference', () => {
      for (let i = 0; i < frame2.data.length; i += 4) {
        frame2.data[i] = 255;
      }
      
      const result = comparator.compare(frame1, frame2, ComparisonMethod.PIXEL_DIFFERENCE);
      
      expect(result.similarity).toBeGreaterThan(0);
      expect(result.isDifferent).toBe(true);
    });

    it('should use perceptual hash comparison', () => {
      const result = comparator.compare(frame1, frame2, ComparisonMethod.PERCEPTUAL_HASH);
      
      expect(result.method).toBe(ComparisonMethod.PERCEPTUAL_HASH);
      expect(typeof result.similarity).toBe('number');
    });

    it('should use edge detection comparison', () => {
      const result = comparator.compare(frame1, frame2, ComparisonMethod.EDGE_DETECTION);
      
      expect(result.method).toBe(ComparisonMethod.EDGE_DETECTION);
      expect(typeof result.similarity).toBe('number');
    });
  });
});

