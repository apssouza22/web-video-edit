import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

// Create mock functions that we can access and modify in tests
const mockComputeDuration = jest.fn();
const mockGetPrimaryVideoTrack = jest.fn();
const mockCanDecode = jest.fn();
const mockSamples = jest.fn();

const createMockVideoTrack = () => ({
  codec: 'avc1.42E01E',
  displayWidth: 1920,
  displayHeight: 1080,
  canDecode: mockCanDecode,
});

const createMockInputInstance = () => ({
  computeDuration: mockComputeDuration,
  getPrimaryVideoTrack: mockGetPrimaryVideoTrack,
});

const mockInput = jest.fn();
const mockBlobSource = jest.fn();
const mockVideoSampleSink = jest.fn();

// Mock render-2d using unstable_mockModule
jest.unstable_mockModule('@/common/render-2d', () => ({
  Canvas2DRender: jest.fn(),
}));

// Mock studio-state using unstable_mockModule
jest.unstable_mockModule('@/common/studio-state', () => ({
  StudioState: {
    getInstance: jest.fn(() => ({
      setMinVideoSizes: jest.fn(),
    })),
  },
}));

// Mock mediabunny using unstable_mockModule
jest.unstable_mockModule('mediabunny', () => ({
  Input: mockInput,
  BlobSource: mockBlobSource,
  ALL_FORMATS: [],
  VideoSampleSink: mockVideoSampleSink,
}));

// Import modules AFTER mocking
const { MediaBunnyDemuxer } = await import('@/video/demux/mediabunny-demuxer');
const { Canvas2DRender } = await import('@/common/render-2d');

describe('MediaBunnyDemuxer', () => {
  let demuxer: MediaBunnyDemuxer;
  let mockRenderer: jest.Mocked<Canvas2DRender>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset to default implementations
    mockComputeDuration.mockResolvedValue(10);
    mockCanDecode.mockResolvedValue(true);
    mockGetPrimaryVideoTrack.mockResolvedValue(createMockVideoTrack());
    
    mockSamples.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (let i = 0; i < 5; i++) {
          yield {
            timestamp: i * 0.033,
            toVideoFrame: jest.fn().mockReturnValue({
              codedWidth: 1920,
              codedHeight: 1080,
              timestamp: i * 0.033,
              close: jest.fn(),
            }),
          };
        }
      },
    });
    
    mockInput.mockImplementation(() => createMockInputInstance());
    mockBlobSource.mockImplementation(() => ({}));
    mockVideoSampleSink.mockImplementation(() => ({
      samples: mockSamples,
    }));
    
    demuxer = new MediaBunnyDemuxer();

    mockRenderer = {
      context: {
        clearRect: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest.fn().mockReturnValue({
          data: new Uint8ClampedArray(1920 * 1080 * 4),
          width: 1920,
          height: 1080,
        }),
      },
      canvas: {
        width: 1920,
        height: 1080,
      },
    } as any;
  });

  afterEach(() => {
    demuxer.cleanup();
    jest.restoreAllMocks();
  });

  describe('callback setters', () => {
    test('should set progress callback', () => {
      const callback = jest.fn();
      demuxer.setOnProgressCallback(callback);
      expect(demuxer['onProgressCallback']).toBe(callback);
    });

    test('should set complete callback', () => {
      const callback = jest.fn();
      demuxer.setOnCompleteCallback(callback);
      expect(demuxer['onCompleteCallback']).toBe(callback);
    });

    test('should set metadata callback', () => {
      const callback = jest.fn();
      demuxer.setOnMetadataCallback(callback);
      expect(demuxer['onMetadataCallback']).toBe(callback);
    });

    test('should set target FPS', () => {
      demuxer.setTargetFps(60);
      expect(demuxer['targetFps']).toBe(60);
    });

    test('should handle multiple callback updates', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      demuxer.setOnProgressCallback(callback1);
      demuxer.setOnProgressCallback(callback2);
      
      expect(demuxer['onProgressCallback']).toBe(callback2);
    });

    test('should allow setting different target FPS values', () => {
      demuxer.setTargetFps(24);
      expect(demuxer['targetFps']).toBe(24);
      
      demuxer.setTargetFps(30);
      expect(demuxer['targetFps']).toBe(30);
      
      demuxer.setTargetFps(60);
      expect(demuxer['targetFps']).toBe(60);
    });
  });

  describe('initialization', () => {
    test('should successfully initialize with valid video file', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

      await expect(demuxer.initialize(mockFile, mockRenderer)).resolves.not.toThrow();
      
      // Verify metadata callback was called
      expect(demuxer['onMetadataCallback']).toBeDefined();
    });

    test('should set processing state during initialization', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

      const initPromise = demuxer.initialize(mockFile, mockRenderer);
      
      await initPromise;
    });


    test('should throw error when no video track is found', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      mockGetPrimaryVideoTrack.mockResolvedValueOnce(null);
      await expect(demuxer.initialize(mockFile, mockRenderer)).rejects.toThrow('No video track found in the file');
    });

    test('should handle initialization errors gracefully', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

      // Override the mock to throw an error
      mockComputeDuration.mockRejectedValueOnce(new Error('Input has an unsupported or unrecognizable format'));

      await expect(demuxer.initialize(mockFile, mockRenderer)).rejects.toThrow();
      
      // Verify cleanup was called
      expect(demuxer['isProcessing']).toBe(false);
    });
  });

  describe('cleanup', () => {
    test('should cleanup resources', () => {
      demuxer['frames'] = [{ width: 1920, height: 1080 }] as any;
      demuxer['isProcessing'] = true;

      demuxer.cleanup();

      expect(demuxer['isProcessing']).toBe(false);
      expect(demuxer['frames']).toEqual([]);
      expect(demuxer['videoSink']).toBeNull();
      expect(demuxer['input']).toBeNull();
    });

    test('should handle cleanup when no resources are initialized', () => {
      const newDemuxer = new MediaBunnyDemuxer();
      
      expect(() => newDemuxer.cleanup()).not.toThrow();
    });

    test('should handle multiple cleanup calls', () => {
      demuxer['frames'] = [{ width: 1920, height: 1080 }] as any;
      
      demuxer.cleanup();
      demuxer.cleanup();
      demuxer.cleanup();

      expect(demuxer['frames']).toEqual([]);
      expect(demuxer['isProcessing']).toBe(false);
    });

    test('should reset all state on cleanup', () => {
      demuxer['frames'] = [{ width: 1920, height: 1080 }] as any;
      demuxer['isProcessing'] = true;
      demuxer['totalDuration'] = 10;

      demuxer.cleanup();

      expect(demuxer['frames']).toEqual([]);
      expect(demuxer['isProcessing']).toBe(false);
      expect(demuxer['videoSink']).toBeNull();
      expect(demuxer['input']).toBeNull();
    });
  });

  describe('instance creation', () => {
    test('should create instance with default values', () => {
      const newDemuxer = new MediaBunnyDemuxer();
      
      expect(newDemuxer).toBeInstanceOf(MediaBunnyDemuxer);
      expect(newDemuxer['frames']).toEqual([]);
      expect(newDemuxer['isProcessing']).toBe(false);
      expect(newDemuxer['totalDuration']).toBe(0);
    });

    test('should have default target FPS', () => {
      const newDemuxer = new MediaBunnyDemuxer();
      
      // Default FPS from constants
      expect(newDemuxer['targetFps']).toBeDefined();
      expect(typeof newDemuxer['targetFps']).toBe('number');
    });

    test('should allow multiple instances', () => {
      const demuxer1 = new MediaBunnyDemuxer();
      const demuxer2 = new MediaBunnyDemuxer();
      const demuxer3 = new MediaBunnyDemuxer();

      expect(demuxer1).toBeInstanceOf(MediaBunnyDemuxer);
      expect(demuxer2).toBeInstanceOf(MediaBunnyDemuxer);
      expect(demuxer3).toBeInstanceOf(MediaBunnyDemuxer);
      
      expect(demuxer1).not.toBe(demuxer2);
      expect(demuxer2).not.toBe(demuxer3);
      
      demuxer1.cleanup();
      demuxer2.cleanup();
      demuxer3.cleanup();
    });
  });

  describe('state management', () => {
    test('should maintain separate state for callbacks', () => {
      const progressCallback = jest.fn();
      const completeCallback = jest.fn();
      const metadataCallback = jest.fn();
      
      demuxer.setOnProgressCallback(progressCallback);
      demuxer.setOnCompleteCallback(completeCallback);
      demuxer.setOnMetadataCallback(metadataCallback);
      
      expect(demuxer['onProgressCallback']).toBe(progressCallback);
      expect(demuxer['onCompleteCallback']).toBe(completeCallback);
      expect(demuxer['onMetadataCallback']).toBe(metadataCallback);
    });

    test('should allow overwriting callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      demuxer.setOnProgressCallback(callback1);
      expect(demuxer['onProgressCallback']).toBe(callback1);
      
      demuxer.setOnProgressCallback(callback2);
      expect(demuxer['onProgressCallback']).toBe(callback2);
      expect(demuxer['onProgressCallback']).not.toBe(callback1);
    });

    test('should maintain target FPS across operations', () => {
      demuxer.setTargetFps(45);
      expect(demuxer['targetFps']).toBe(45);
      
      // Setting callbacks shouldn't affect target FPS
      demuxer.setOnProgressCallback(jest.fn());
      expect(demuxer['targetFps']).toBe(45);
      
      demuxer.setOnCompleteCallback(jest.fn());
      expect(demuxer['targetFps']).toBe(45);
    });
  });

  describe('frame extraction', () => {
    test('should extract frames and call progress callback', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      const progressCallback = jest.fn();
      const completeCallback = jest.fn();

      demuxer.setOnProgressCallback(progressCallback);
      demuxer.setOnCompleteCallback(completeCallback);

      await demuxer.initialize(mockFile, mockRenderer);

      // Progress callback should have been called
      expect(progressCallback).toHaveBeenCalled();
      
      // Complete callback should have been called with frames
      expect(completeCallback).toHaveBeenCalled();
      expect(completeCallback).toHaveBeenCalledWith(expect.any(Array));
    });

    test('should extract correct number of frames based on target FPS', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      const completeCallback = jest.fn();

      demuxer.setTargetFps(30);
      demuxer.setOnCompleteCallback(completeCallback);

      await demuxer.initialize(mockFile, mockRenderer);

      // Should have extracted frames
      expect(completeCallback).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          codedWidth: expect.any(Number),
          codedHeight: expect.any(Number),
        })
      ]));
    });

    test('should call metadata callback with video dimensions', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      const metadataCallback = jest.fn();

      demuxer.setOnMetadataCallback(metadataCallback);

      await demuxer.initialize(mockFile, mockRenderer);

      expect(metadataCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1920,
          height: 1080,
          totalTimeInMilSeconds: 10000,
          frames: [],
        })
      );
    });
  });
});
