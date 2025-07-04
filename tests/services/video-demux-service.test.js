import { VideoDemuxService } from '../../assets/js/demux/video-demux.js';
import { mockFn } from '../utils/mock-fn.js';

// Mock HTMLVideoDemuxer
class MockHTMLVideoDemuxer {
  constructor() {
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
    this.onMetadataCallback = null;
  }

  setOnProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  setOnCompleteCallback(callback) {
    this.onCompleteCallback = callback;
  }

  setOnMetadataCallback(callback) {
    this.onMetadataCallback = callback;
  }

  initialize(fileSrc, renderer) {
    this.fileSrc = fileSrc;
    this.renderer = renderer;
  }
}

describe('VideoDemuxService', () => {
  let videoDemuxService;
  let mockRenderer;

  beforeEach(() => {
    videoDemuxService = new VideoDemuxService();
    // Replace the demuxer with our mock
    videoDemuxService.htmlVideoDemuxer = new MockHTMLVideoDemuxer();
    mockRenderer = {
      render: mockFn(),
      clear: mockFn()
    };
  });

  afterEach(() => {
    // Mock functions reset individually
  });

  describe('constructor', () => {
    test('should create instance with HTMLVideoDemuxer', () => {
      expect(videoDemuxService).toBeInstanceOf(VideoDemuxService);
      expect(videoDemuxService.htmlVideoDemuxer).toBeInstanceOf(MockHTMLVideoDemuxer);
    });
  });

  describe('setOnProgressCallback', () => {
    test('should set progress callback on HTMLVideoDemuxer', () => {
      const mockCallback = mockFn();
      const setCallbackSpy = mockFn();
      videoDemuxService.htmlVideoDemuxer.setOnProgressCallback = setCallbackSpy;

      videoDemuxService.setOnProgressCallback(mockCallback);

      expect(setCallbackSpy).toHaveBeenCalledWith(mockCallback);
    });

    test('should handle null callback', () => {
      const setCallbackSpy = mockFn();
      videoDemuxService.htmlVideoDemuxer.setOnProgressCallback = setCallbackSpy;

      videoDemuxService.setOnProgressCallback(null);

      expect(setCallbackSpy).toHaveBeenCalledWith(null);
    });

    test('should handle undefined callback', () => {
      const setCallbackSpy = mockFn();
      videoDemuxService.htmlVideoDemuxer.setOnProgressCallback = setCallbackSpy;

      videoDemuxService.setOnProgressCallback(undefined);

      expect(setCallbackSpy).toHaveBeenCalledWith(undefined);
    });
  });

  describe('setOnCompleteCallback', () => {
    test('should set complete callback on HTMLVideoDemuxer', () => {
      const mockCallback = mockFn();
      const setCallbackSpy = mockFn();
      videoDemuxService.htmlVideoDemuxer.setOnCompleteCallback = setCallbackSpy;

      videoDemuxService.setOnCompleteCallback(mockCallback);

      expect(setCallbackSpy).toHaveBeenCalledWith(mockCallback);
    });

    test('should handle function callback', () => {
      function mockCallback() {
        return 'test';
      }
      const setCallbackSpy = mockFn();
      videoDemuxService.htmlVideoDemuxer.setOnCompleteCallback = setCallbackSpy;

      videoDemuxService.setOnCompleteCallback(mockCallback);

      expect(setCallbackSpy).toHaveBeenCalledWith(mockCallback);
    });
  });

  describe('setOnMetadataCallback', () => {
    test('should set metadata callback on HTMLVideoDemuxer', () => {
      const mockCallback = mockFn((metadata) => {
        console.log('Metadata received:', metadata);
      });
      const setCallbackSpy = mockFn();
      videoDemuxService.htmlVideoDemuxer.setOnMetadataCallback = setCallbackSpy;

      videoDemuxService.setOnMetadataCallback(mockCallback);

      expect(setCallbackSpy).toHaveBeenCalledWith(mockCallback);
    });
  });

  describe('initDemux', () => {
    test('should initialize HTMLVideoDemuxer with file source and renderer', () => {
      const fileSrc = 'test-video.mp4';
      const initializeSpy = mockFn();
      videoDemuxService.htmlVideoDemuxer.initialize = initializeSpy;

      videoDemuxService.initDemux(fileSrc, mockRenderer);

      expect(initializeSpy).toHaveBeenCalledWith(fileSrc, mockRenderer);
    });

    test('should handle null file source', () => {
      const initializeSpy = mockFn();
      videoDemuxService.htmlVideoDemuxer.initialize = initializeSpy;

      videoDemuxService.initDemux(null, mockRenderer);

      expect(initializeSpy).toHaveBeenCalledWith(null, mockRenderer);
    });

    test('should handle null renderer', () => {
      const fileSrc = 'test-video.mp4';
      const initializeSpy = mockFn();
      videoDemuxService.htmlVideoDemuxer.initialize = initializeSpy;

      videoDemuxService.initDemux(fileSrc, null);

      expect(initializeSpy).toHaveBeenCalledWith(fileSrc, null);
    });
  });

  describe('integration tests', () => {
    test('should complete full initialization workflow', () => {
      const fileSrc = 'integration-test.mp4';
      const progressCallback = mockFn();
      const completeCallback = mockFn();
      const metadataCallback = mockFn();

      // Set up all callbacks
      videoDemuxService.setOnProgressCallback(progressCallback);
      videoDemuxService.setOnCompleteCallback(completeCallback);
      videoDemuxService.setOnMetadataCallback(metadataCallback);

      // Initialize
      videoDemuxService.initDemux(fileSrc, mockRenderer);

      // Verify all callbacks were set
      expect(videoDemuxService.htmlVideoDemuxer.onProgressCallback).toBe(progressCallback);
      expect(videoDemuxService.htmlVideoDemuxer.onCompleteCallback).toBe(completeCallback);
      expect(videoDemuxService.htmlVideoDemuxer.onMetadataCallback).toBe(metadataCallback);

      // Verify initialization
      expect(videoDemuxService.htmlVideoDemuxer.fileSrc).toBe(fileSrc);
      expect(videoDemuxService.htmlVideoDemuxer.renderer).toBe(mockRenderer);
    });
  });
});
