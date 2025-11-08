import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

// Since this test uses dependency injection (passing mock instances to constructor),
// we don't need to mock the module imports. We just import types.
const { VideoDemuxService } = await import('@/video/demux/video-demux');

// Type imports for test setup
type MediaBunnyDemuxer = {
  setOnProgressCallback: jest.Mock;
  setOnCompleteCallback: jest.Mock;
  setOnMetadataCallback: jest.Mock;
  initialize: jest.Mock;
  cleanup: jest.Mock;
};

type CodecDemuxer = {
  setOnProgressCallback: jest.Mock;
  setOnCompleteCallback: jest.Mock;
  setOnMetadataCallback: jest.Mock;
  initialize: jest.Mock;
  cleanup: jest.Mock;
};

type HTMLVideoDemuxer = {
  setOnProgressCallback: jest.Mock;
  setOnCompleteCallback: jest.Mock;
  setOnMetadataCallback: jest.Mock;
  initialize: jest.Mock;
  cleanup: jest.Mock;
};

type Canvas2DRender = {
  context: any;
};

describe('VideoDemuxService', () => {
  let videoDemuxService: InstanceType<typeof VideoDemuxService>;
  let mockMediaBunnyDemuxer: MediaBunnyDemuxer;
  let mockCodecDemuxer: CodecDemuxer;
  let mockHTMLVideoDemuxer: HTMLVideoDemuxer;
  let mockRenderer: Canvas2DRender;

  beforeEach(() => {
    mockMediaBunnyDemuxer = {
      setOnProgressCallback: jest.fn(),
      setOnCompleteCallback: jest.fn(),
      setOnMetadataCallback: jest.fn(),
      initialize: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    mockCodecDemuxer = {
      setOnProgressCallback: jest.fn(),
      setOnCompleteCallback: jest.fn(),
      setOnMetadataCallback: jest.fn(),
      initialize: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    mockHTMLVideoDemuxer = {
      setOnProgressCallback: jest.fn(),
      setOnCompleteCallback: jest.fn(),
      setOnMetadataCallback: jest.fn(),
      initialize: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    mockRenderer = {
      context: {},
    } as any;

    videoDemuxService = new VideoDemuxService(
      mockMediaBunnyDemuxer,
      mockCodecDemuxer,
      mockHTMLVideoDemuxer
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setOnProgressCallback', () => {
    test('should set progress callback on all demuxers', () => {
      const mockCallback = jest.fn();

      videoDemuxService.setOnProgressCallback(mockCallback);

      expect(mockMediaBunnyDemuxer.setOnProgressCallback).toHaveBeenCalledWith(mockCallback);
      expect(mockCodecDemuxer.setOnProgressCallback).toHaveBeenCalledWith(mockCallback);
      expect(mockHTMLVideoDemuxer.setOnProgressCallback).toHaveBeenCalledWith(mockCallback);
    });

    test('should set progress callback on all demuxers multiple times', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      videoDemuxService.setOnProgressCallback(mockCallback1);
      videoDemuxService.setOnProgressCallback(mockCallback2);

      expect(mockMediaBunnyDemuxer.setOnProgressCallback).toHaveBeenCalledTimes(2);
      expect(mockCodecDemuxer.setOnProgressCallback).toHaveBeenCalledTimes(2);
      expect(mockHTMLVideoDemuxer.setOnProgressCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('setOnCompleteCallback', () => {
    test('should set complete callback on all demuxers', () => {
      const mockCallback = jest.fn();

      videoDemuxService.setOnCompleteCallback(mockCallback);

      expect(mockMediaBunnyDemuxer.setOnCompleteCallback).toHaveBeenCalledWith(mockCallback);
      expect(mockCodecDemuxer.setOnCompleteCallback).toHaveBeenCalledWith(mockCallback);
      expect(mockHTMLVideoDemuxer.setOnCompleteCallback).toHaveBeenCalledWith(mockCallback);
    });

    test('should set complete callback on all demuxers multiple times', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      videoDemuxService.setOnCompleteCallback(mockCallback1);
      videoDemuxService.setOnCompleteCallback(mockCallback2);

      expect(mockMediaBunnyDemuxer.setOnCompleteCallback).toHaveBeenCalledTimes(2);
      expect(mockCodecDemuxer.setOnCompleteCallback).toHaveBeenCalledTimes(2);
      expect(mockHTMLVideoDemuxer.setOnCompleteCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('setOnMetadataCallback', () => {
    test('should set metadata callback on all demuxers', () => {
      const mockCallback = jest.fn();

      videoDemuxService.setOnMetadataCallback(mockCallback);

      expect(mockMediaBunnyDemuxer.setOnMetadataCallback).toHaveBeenCalledWith(mockCallback);
      expect(mockCodecDemuxer.setOnMetadataCallback).toHaveBeenCalledWith(mockCallback);
      expect(mockHTMLVideoDemuxer.setOnMetadataCallback).toHaveBeenCalledWith(mockCallback);
    });

    test('should set metadata callback on all demuxers multiple times', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      videoDemuxService.setOnMetadataCallback(mockCallback1);
      videoDemuxService.setOnMetadataCallback(mockCallback2);

      expect(mockMediaBunnyDemuxer.setOnMetadataCallback).toHaveBeenCalledTimes(2);
      expect(mockCodecDemuxer.setOnMetadataCallback).toHaveBeenCalledTimes(2);
      expect(mockHTMLVideoDemuxer.setOnMetadataCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('initDemux', () => {
    test('should use HTMLVideoDemuxer when WebCodecs is not supported', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' }) as any;
      
      global.VideoDecoder = undefined as any;
      global.VideoFrame = undefined as any;
      global.EncodedVideoChunk = undefined as any;

      await videoDemuxService.initDemux(mockFile, mockRenderer);

      expect(mockHTMLVideoDemuxer.initialize).toHaveBeenCalledWith(mockFile, mockRenderer);
      expect(mockMediaBunnyDemuxer.initialize).not.toHaveBeenCalled();
      expect(mockCodecDemuxer.initialize).not.toHaveBeenCalled();
    });

    test('should use MediaBunnyDemuxer for supported file extensions when WebCodecs is supported', async () => {
      const supportedFiles = [
        new File(['test'], 'test.mp4', { type: 'video/mp4' }),
        new File(['test'], 'test.webm', { type: 'video/webm' }),
        new File(['test'], 'test.mkv', { type: 'video/x-matroska' }),
        new File(['test'], 'test.mov', { type: 'video/quicktime' }),
        new File(['test'], 'test.avi', { type: 'video/x-msvideo' }),
      ];

      global.VideoDecoder = jest.fn() as any;
      global.VideoFrame = jest.fn() as any;
      global.EncodedVideoChunk = jest.fn() as any;

      for (const mockFile of supportedFiles) {
        mockMediaBunnyDemuxer.initialize.mockClear();
        mockCodecDemuxer.initialize.mockClear();

        await videoDemuxService.initDemux(mockFile as any, mockRenderer);

        expect(mockMediaBunnyDemuxer.initialize).toHaveBeenCalledWith(mockFile, mockRenderer);
        expect(mockCodecDemuxer.initialize).not.toHaveBeenCalled();
        expect(mockHTMLVideoDemuxer.initialize).not.toHaveBeenCalled();
      }
    });

    test('should use CodecDemuxer for unsupported file extensions when WebCodecs is supported', async () => {
      const unsupportedFile = new File(['test'], 'test.flv', { type: 'video/x-flv' }) as any;

      global.VideoDecoder = jest.fn() as any;
      global.VideoFrame = jest.fn() as any;
      global.EncodedVideoChunk = jest.fn() as any;

      await videoDemuxService.initDemux(unsupportedFile, mockRenderer);

      expect(mockCodecDemuxer.initialize).toHaveBeenCalledWith(unsupportedFile, mockRenderer);
      expect(mockMediaBunnyDemuxer.initialize).not.toHaveBeenCalled();
      expect(mockHTMLVideoDemuxer.initialize).not.toHaveBeenCalled();
    });

    test('should handle file names with uppercase extensions', async () => {
      const mockFile = new File(['test'], 'test.MP4', { type: 'video/mp4' }) as any;

      global.VideoDecoder = jest.fn() as any;
      global.VideoFrame = jest.fn() as any;
      global.EncodedVideoChunk = jest.fn() as any;

      await videoDemuxService.initDemux(mockFile, mockRenderer);

      expect(mockMediaBunnyDemuxer.initialize).toHaveBeenCalledWith(mockFile, mockRenderer);
      expect(mockCodecDemuxer.initialize).not.toHaveBeenCalled();
    });

    test('should handle file names with mixed case extensions', async () => {
      const mockFile = new File(['test'], 'test.WeBm', { type: 'video/webm' }) as any;

      global.VideoDecoder = jest.fn() as any;
      global.VideoFrame = jest.fn() as any;
      global.EncodedVideoChunk = jest.fn() as any;

      await videoDemuxService.initDemux(mockFile, mockRenderer);

      expect(mockMediaBunnyDemuxer.initialize).toHaveBeenCalledWith(mockFile, mockRenderer);
    });

    test('should handle empty file name', async () => {
      const mockFile = new File(['test'], '', { type: 'video/mp4' }) as any;

      global.VideoDecoder = jest.fn() as any;
      global.VideoFrame = jest.fn() as any;
      global.EncodedVideoChunk = jest.fn() as any;

      await videoDemuxService.initDemux(mockFile, mockRenderer);

      expect(mockCodecDemuxer.initialize).toHaveBeenCalledWith(mockFile, mockRenderer);
    });
  });

  describe('cleanup', () => {
    test('should call cleanup on MediaBunnyDemuxer and CodecDemuxer', () => {
      videoDemuxService.cleanup();

      expect(mockMediaBunnyDemuxer.cleanup).toHaveBeenCalled();
      expect(mockCodecDemuxer.cleanup).toHaveBeenCalled();
    });

    test('should handle multiple cleanup calls', () => {
      videoDemuxService.cleanup();
      videoDemuxService.cleanup();
      videoDemuxService.cleanup();

      expect(mockMediaBunnyDemuxer.cleanup).toHaveBeenCalledTimes(3);
      expect(mockCodecDemuxer.cleanup).toHaveBeenCalledTimes(3);
    });

    test('should not throw error if demuxers cleanup throws', () => {
      mockMediaBunnyDemuxer.cleanup.mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      expect(() => videoDemuxService.cleanup()).toThrow();
    });
  });

  describe('WebCodecs support detection', () => {
    test('should detect WebCodecs support when all APIs are available', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' }) as any;

      global.VideoDecoder = jest.fn() as any;
      global.VideoFrame = jest.fn() as any;
      global.EncodedVideoChunk = jest.fn() as any;

      await videoDemuxService.initDemux(mockFile, mockRenderer);

      expect(mockHTMLVideoDemuxer.initialize).not.toHaveBeenCalled();
    });

    test('should detect lack of WebCodecs support when VideoDecoder is missing', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' }) as any;

      global.VideoDecoder = undefined as any;
      global.VideoFrame = jest.fn() as any;
      global.EncodedVideoChunk = jest.fn() as any;

      await videoDemuxService.initDemux(mockFile, mockRenderer);

      expect(mockHTMLVideoDemuxer.initialize).toHaveBeenCalled();
    });

    test('should detect lack of WebCodecs support when VideoFrame is missing', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' }) as any;

      global.VideoDecoder = jest.fn() as any;
      global.VideoFrame = undefined as any;
      global.EncodedVideoChunk = jest.fn() as any;

      await videoDemuxService.initDemux(mockFile, mockRenderer);

      expect(mockHTMLVideoDemuxer.initialize).toHaveBeenCalled();
    });

    test('should detect lack of WebCodecs support when EncodedVideoChunk is missing', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' }) as any;

      global.VideoDecoder = jest.fn() as any;
      global.VideoFrame = jest.fn() as any;
      global.EncodedVideoChunk = undefined as any;

      await videoDemuxService.initDemux(mockFile, mockRenderer);

      expect(mockHTMLVideoDemuxer.initialize).toHaveBeenCalled();
    });
  });
});
