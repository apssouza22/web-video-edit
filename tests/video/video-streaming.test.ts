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
const { VideoStreaming } = await import('@/video/demux/video-streaming');

describe('VideoStreaming', () => {
  let videoStreaming: any;
  let timestamps: number[];
  let mockVideoSink: any;

  beforeEach(() => {
    jest.clearAllMocks();

    timestamps = [0, 0.033, 0.066, 0.099, 0.132, 0.165, 0.198];
    mockVideoSink = createMockVideoSampleSink();

    // @ts-ignore
    mockToVideoFrame.mockImplementation((timestamp: number) => createMockVideoFrame(timestamp));
    // @ts-ignore
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


  describe('getFrameAtIndex', () => {
    test('should retrieve frameObject at valid index', async () => {
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

    test('should return cached frameObject on subsequent calls', async () => {
      const frame1 = await videoStreaming.getFrameAtIndex(0);
      const frame2 = await videoStreaming.getFrameAtIndex(0);
      
      expect(frame1).toBe(frame2);
      expect(mockGetSample).toHaveBeenCalledTimes(1);
    });
  });


  describe('frameObject buffering', () => {


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

  describe('cleanup', () => {
    test('should close all cached VideoFrames on cleanup', async () => {
      const frame1 = await videoStreaming.getFrameAtIndex(0);
      const frame2 = await videoStreaming.getFrameAtIndex(1);
      
      videoStreaming.cleanup();
      
      expect(frame1.close).toHaveBeenCalled();
      expect(frame2.close).toHaveBeenCalled();
    });
  });

  describe('concurrent requests', () => {
    test('should handle concurrent requests for same frameObject', async () => {
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

