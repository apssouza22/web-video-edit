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
  // @ts-ignore
  let demuxer: MediaBunnyDemuxer;
  // @ts-ignore
  let mockRenderer: jest.Mocked<Canvas2DRender>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset to default implementations
    // @ts-ignore
    mockComputeDuration.mockResolvedValue(10);
    // @ts-ignore
    mockCanDecode.mockResolvedValue(true);
    // @ts-ignore
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
      expect(demuxer['onMetadataCallback']).toBeDefined();
    });


    test('should throw error when no video track is found', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      // @ts-ignore
      mockGetPrimaryVideoTrack.mockResolvedValueOnce(null);
      await expect(demuxer.initialize(mockFile, mockRenderer)).rejects.toThrow('No video track found in the file');
    });

    test('should handle initialization errors gracefully', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      // @ts-ignore
      mockComputeDuration.mockRejectedValueOnce(new Error('Input has an unsupported or unrecognizable format'));
      await expect(demuxer.initialize(mockFile, mockRenderer)).rejects.toThrow();
      expect(demuxer['isProcessing']).toBe(false);
    });
  });

  describe('cleanup', () => {
    test('should cleanup resources', () => {
      demuxer['frames'] = [{ width: 1920, height: 1080 }] as any;
      demuxer['timestamps'] = [0.033, 0.066, 0.099];
      demuxer['isProcessing'] = true;
      demuxer.cleanup();

      expect(demuxer['isProcessing']).toBe(false);
      expect(demuxer['frames']).toEqual([]);
      expect(demuxer['timestamps']).toEqual([]);
      expect(demuxer['input']).toBeNull();
    });

    test('should reset all state on cleanup', () => {
      demuxer['frames'] = [{ width: 1920, height: 1080 }] as any;
      demuxer['timestamps'] = [0.033, 0.066, 0.099];
      demuxer['isProcessing'] = true;
      demuxer['totalDuration'] = 10;

      demuxer.cleanup();

      expect(demuxer['frames']).toEqual([]);
      expect(demuxer['timestamps']).toEqual([]);
      expect(demuxer['isProcessing']).toBe(false);
      expect(demuxer['input']).toBeNull();
    });
  });

  describe('timestamp extraction', () => {
    test('should extract timestamps and call progress callback', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      const progressCallback = jest.fn();
      const completeCallback = jest.fn();
      demuxer.setOnProgressCallback(progressCallback);
      demuxer.setOnCompleteCallback(completeCallback);

      await demuxer.initialize(mockFile, mockRenderer);

      expect(progressCallback).toHaveBeenCalled();
      expect(completeCallback).toHaveBeenCalled();
      expect(completeCallback).toHaveBeenCalledWith([]);
    });

    test('should extract timestamps based on target FPS', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      const metadataCallback = jest.fn();
      demuxer.setTargetFps(30);
      demuxer.setOnMetadataCallback(metadataCallback);

      await demuxer.initialize(mockFile, mockRenderer);

      // Should have extracted timestamps
      expect(metadataCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamps: expect.any(Array),
          videoSink: expect.any(Object),
        })
      );
    });

    test('should call metadata callback with video dimensions, timestamps and videoSink', async () => {
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
          timestamps: expect.any(Array),
          videoSink: expect.any(Object),
        })
      );
    });
  });
});
