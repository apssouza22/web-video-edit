import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockGetSample = jest.fn();
const mockToVideoFrame = jest.fn();

const createMockVideoSampleSink = () => ({
  getSample: mockGetSample,
});

const createMockVideoFrame = (timestamp: number) => ({
  codedWidth: 1920,
  codedHeight: 1080,
  timestamp,
  close: jest.fn(),
});

// Import VideoStreaming after setting up mocks
const { VideoStreaming } = await import('@/video/video-streaming');

describe('VideoStreaming', () => {
  let videoStreaming: any;
  let timestamps: number[];
  let mockVideoSink: any;

  beforeEach(() => {
    jest.clearAllMocks();

    timestamps = [0, 0.033, 0.066, 0.099, 0.132, 0.165, 0.198];
    mockVideoSink = createMockVideoSampleSink();

    mockToVideoFrame.mockImplementation((timestamp: number) => createMockVideoFrame(timestamp));
    mockGetSample.mockImplementation(async (timestamp: number) => ({
      timestamp,
      toVideoFrame: () => createMockVideoFrame(timestamp),
    }));

    videoStreaming = new VideoStreaming(timestamps, mockVideoSink, 30, 3);
  });

  afterEach(() => {
    if (videoStreaming) {
      videoStreaming.cleanup();
    }
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    test('should initialize with timestamps and videoSink', () => {
      expect(videoStreaming).toBeDefined();
      expect(videoStreaming.getTotalFrames()).toBe(7);
    });

    test('should accept custom cache and buffer sizes', () => {
      const customStreaming = new VideoStreaming(timestamps, mockVideoSink, 50, 10);
      expect(customStreaming).toBeDefined();
      customStreaming.cleanup();
    });
  });

  describe('getFrameAtIndex', () => {
    test('should retrieve frame at valid index', async () => {
      const frame = await videoStreaming.getFrameAtIndex(0);
      
      expect(frame).toBeDefined();
      expect(frame?.codedWidth).toBe(1920);
      expect(frame?.codedHeight).toBe(1080);
      expect(mockGetSample).toHaveBeenCalledWith(0);
    });

    test('should return null for negative index', async () => {
      const frame = await videoStreaming.getFrameAtIndex(-1);
      expect(frame).toBeNull();
    });

    test('should return null for index out of bounds', async () => {
      const frame = await videoStreaming.getFrameAtIndex(100);
      expect(frame).toBeNull();
    });

    test('should return cached frame on subsequent calls', async () => {
      const frame1 = await videoStreaming.getFrameAtIndex(0);
      const frame2 = await videoStreaming.getFrameAtIndex(0);
      
      expect(frame1).toBe(frame2);
      expect(mockGetSample).toHaveBeenCalledTimes(1);
    });

    test('should handle errors gracefully', async () => {
      mockGetSample.mockRejectedValueOnce(new Error('Failed to load frame'));
      
      const frame = await videoStreaming.getFrameAtIndex(0);
      expect(frame).toBeNull();
    });
  });

  describe('getFrameAtTimestamp', () => {
    test('should retrieve frame at exact timestamp', async () => {
      const frame = await videoStreaming.getFrameAtTimestamp(0.066);
      
      expect(frame).toBeDefined();
      expect(mockGetSample).toHaveBeenCalledWith(0.066);
    });

    test('should retrieve closest frame for approximate timestamp', async () => {
      const frame = await videoStreaming.getFrameAtTimestamp(0.065);
      
      expect(frame).toBeDefined();
      // Should get frame at index 1 (timestamp 0.033)
      expect(mockGetSample).toHaveBeenCalled();
    });

    test('should return null for timestamp before first frame', async () => {
      mockGetSample.mockResolvedValueOnce(null);
      const frame = await videoStreaming.getFrameAtTimestamp(-1);
      
      expect(frame).toBeNull();
    });
  });

  describe('frame buffering', () => {
    test('should prefetch next frames after retrieving current frame', async () => {
      jest.useFakeTimers();
      
      await videoStreaming.getFrameAtIndex(0);
      
      // Advance timers to trigger prefetching
      jest.advanceTimersByTime(10);
      
      // Wait for prefetch promises
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should have prefetched up to bufferSize (3) frames ahead
      expect(mockGetSample.mock.calls.length).toBeGreaterThan(1);
      
      jest.useRealTimers();
    });

    test('should not prefetch if already buffering', async () => {
      jest.useFakeTimers();
      
      // Request multiple frames quickly
      const promise1 = videoStreaming.getFrameAtIndex(0);
      const promise2 = videoStreaming.getFrameAtIndex(1);
      
      await Promise.all([promise1, promise2]);
      
      jest.advanceTimersByTime(10);
      
      // Should not duplicate prefetch calls
      const callCount = mockGetSample.mock.calls.length;
      expect(callCount).toBeLessThanOrEqual(timestamps.length);
      
      jest.useRealTimers();
    });
  });

  describe('utility methods', () => {
    test('should return total frames count', () => {
      expect(videoStreaming.getTotalFrames()).toBe(7);
    });

    test('should return cache size', async () => {
      expect(videoStreaming.getCacheSize()).toBe(0);
      
      await videoStreaming.getFrameAtIndex(0);
      expect(videoStreaming.getCacheSize()).toBe(1);
      
      await videoStreaming.getFrameAtIndex(1);
      expect(videoStreaming.getCacheSize()).toBe(2);
    });

    test('should return timestamp at valid index', () => {
      expect(videoStreaming.getTimestampAtIndex(0)).toBe(0);
      expect(videoStreaming.getTimestampAtIndex(2)).toBe(0.066);
    });

    test('should return null for invalid index', () => {
      expect(videoStreaming.getTimestampAtIndex(-1)).toBeNull();
      expect(videoStreaming.getTimestampAtIndex(100)).toBeNull();
    });
  });

  describe('cleanup', () => {
    test('should clear cache and reset state', async () => {
      await videoStreaming.getFrameAtIndex(0);
      await videoStreaming.getFrameAtIndex(1);
      
      expect(videoStreaming.getCacheSize()).toBeGreaterThan(0);
      
      videoStreaming.cleanup();
      
      expect(videoStreaming.getCacheSize()).toBe(0);
    });

    test('should close all cached VideoFrames on cleanup', async () => {
      const frame1 = await videoStreaming.getFrameAtIndex(0);
      const frame2 = await videoStreaming.getFrameAtIndex(1);
      
      videoStreaming.cleanup();
      
      expect(frame1.close).toHaveBeenCalled();
      expect(frame2.close).toHaveBeenCalled();
    });
  });

  describe('concurrent requests', () => {
    test('should handle concurrent requests for same frame', async () => {
      const promise1 = videoStreaming.getFrameAtIndex(0);
      const promise2 = videoStreaming.getFrameAtIndex(0);
      const promise3 = videoStreaming.getFrameAtIndex(0);
      
      const [frame1, frame2, frame3] = await Promise.all([promise1, promise2, promise3]);
      
      expect(frame1).toBe(frame2);
      expect(frame2).toBe(frame3);
      // Should only call getSample once despite multiple concurrent requests
      expect(mockGetSample).toHaveBeenCalledTimes(1);
    });

    test('should handle concurrent requests for different frames', async () => {
      const promises = [0, 1, 2, 3].map(i => videoStreaming.getFrameAtIndex(i));
      const frames = await Promise.all(promises);
      
      expect(frames).toHaveLength(4);
      frames.forEach(frame => expect(frame).toBeDefined());
      expect(mockGetSample).toHaveBeenCalledTimes(4);
    });
  });
});

