import { VideoExportService } from '../../assets/js/muxer/video-export.js';
import { mockFn } from '../utils/mock-fn.js';

// Mock VideoStudio
class MockVideoStudio {
  constructor() {
    this.layers = [];
    this.loadingPopup = {
      startLoading: mockFn(),
      updateProgress: mockFn()
    };
  }

  getLayers() {
    return this.layers;
  }

  addLayer(layer) {
    this.layers.push(layer);
  }
}

// Mock MediaRecorderExporter
class MockMediaRecorderExporter {
  constructor(studio) {
    this.studio = studio;
  }

  export(exportButton, tempText, progressCallback, completionCallback) {
    // Simulate export process
    setTimeout(() => {
      if (progressCallback) progressCallback(0.5);
      setTimeout(() => {
        if (progressCallback) progressCallback(1.0);
        if (completionCallback) completionCallback();
      }, 100);
    }, 100);
  }
}

// Mock WebCodecExporter
class MockWebCodecExporter {
  constructor(studio) {
    this.studio = studio;
  }

  export(exportButton, tempText, progressCallback, completionCallback) {
    // Simulate export process
    setTimeout(() => {
      if (progressCallback) progressCallback(0.3);
      setTimeout(() => {
        if (progressCallback) progressCallback(1.0);
        if (completionCallback) completionCallback();
      }, 150);
    }, 100);
  }
}

// Mock exportToJson function
global.exportToJson = mockFn();

describe('VideoExportService', () => {
  let videoExportService;
  let mockStudio;
  let mockExportButton;

  beforeEach(() => {
    mockStudio = new MockVideoStudio();
    videoExportService = new VideoExportService(mockStudio);
    // Replace exporters with our mocks
    videoExportService.mediaRecorderExporter = new MockMediaRecorderExporter(mockStudio);
    videoExportService.webCodecExporter = new MockWebCodecExporter(mockStudio);
    
    // Mock DOM elements
    mockExportButton = {
      textContent: 'Export',
      disabled: false,
      style: { display: 'block' }
    };

    // Mock alert
    global.alert = mockFn();

    // Mock document
    global.document = {
      getElementById: mockFn((id) => {
        if (id === 'export') return mockExportButton;
        return null;
      })
    };
  });

  afterEach(() => {
    // Mock functions reset individually
  });

  describe('constructor', () => {
    test('should create instance with studio reference', () => {
      expect(videoExportService).toBeInstanceOf(VideoExportService);
      expect(videoExportService.studio).toBe(mockStudio);
      expect(videoExportService.exportId).toBe('video-export');
    });

    test('should check codec support and set to false', () => {
      expect(videoExportService.codecSupported).toBe(false);
    });

    test('should handle studio with different configuration', () => {
      const customStudio = new MockVideoStudio();
      customStudio.customProperty = 'test';
      
      const customService = new VideoExportService(customStudio);
      expect(customService.studio).toBe(customStudio);
      expect(customService.studio.customProperty).toBe('test');
    });
  });

  describe('init', () => {
    test('should add click event listener to export button', () => {
      videoExportService.init();

      expect(global.document.getElementById).toHaveBeenCalledWith('export');
      expect(mockExportButton.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    test('should bind export method correctly', () => {
      videoExportService.init();

      const addedCallback = mockExportButton.addEventListener.mock.calls[0][1];
      expect(addedCallback).toBeDefined();
    });

    test('should handle missing export button', () => {
      global.document.getElementById.mockReturnValue(null);
      
      expect(() => videoExportService.init()).not.toThrow();
    });
  });

  describe('export', () => {
    beforeEach(() => {
      videoExportService.init();
    });

    test('should call exportToJson when shift key is pressed', () => {
      const mockEvent = { shiftKey: true };

      videoExportService.export(mockEvent);

      expect(global.exportToJson).toHaveBeenCalled();
      expect(mockStudio.loadingPopup.startLoading).not.toHaveBeenCalled();
    });

    test('should show alert when no layers to export', () => {
      const mockEvent = { shiftKey: false };
      mockStudio.layers = []; // Empty layers

      videoExportService.export(mockEvent);

      expect(global.alert).toHaveBeenCalledWith('Nothing to export.');
      expect(mockStudio.loadingPopup.startLoading).not.toHaveBeenCalled();
    });

    test('should start loading popup when layers exist', () => {
      const mockEvent = { shiftKey: false };
      mockStudio.layers = [{ name: 'test-layer' }]; // Add a layer

      videoExportService.export(mockEvent);

      expect(mockStudio.loadingPopup.startLoading).toHaveBeenCalledWith(
        'video-export',
        '',
        'Exporting Video...'
      );
    });

    test('should change export button text during export', () => {
      const mockEvent = { shiftKey: false };
      mockStudio.layers = [{ name: 'test-layer' }];

      videoExportService.export(mockEvent);

      expect(mockExportButton.textContent).toBe('Exporting...');
    });

    test('should use MediaRecorderExporter when codec not supported', (done) => {
      const mockEvent = { shiftKey: false };
      mockStudio.layers = [{ name: 'test-layer' }];
      videoExportService.codecSupported = false;

      videoExportService.export(mockEvent);

      // Wait for async operations
      setTimeout(() => {
        expect(mockStudio.loadingPopup.updateProgress).toHaveBeenCalledWith('video-export', 0.5);
        setTimeout(() => {
          expect(mockStudio.loadingPopup.updateProgress).toHaveBeenCalledWith('video-export', 1.0);
          expect(mockExportButton.textContent).toBe('Export');
          done();
        }, 150);
      }, 150);
    });

    test('should use WebCodecExporter when codec is supported', (done) => {
      const mockEvent = { shiftKey: false };
      mockStudio.layers = [{ name: 'test-layer' }];
      videoExportService.codecSupported = true;

      videoExportService.export(mockEvent);

      // Wait for async operations
      setTimeout(() => {
        expect(mockStudio.loadingPopup.updateProgress).toHaveBeenCalledWith('video-export', 0.3);
        setTimeout(() => {
          expect(mockStudio.loadingPopup.updateProgress).toHaveBeenCalledWith('video-export', 1.0);
          expect(mockExportButton.textContent).toBe('Export');
          done();
        }, 150);
      }, 150);
    });

    test('should handle progress callback correctly', (done) => {
      const mockEvent = { shiftKey: false };
      mockStudio.layers = [{ name: 'test-layer' }];

      videoExportService.export(mockEvent);

      setTimeout(() => {
        expect(mockStudio.loadingPopup.updateProgress).toHaveBeenCalledWith('video-export', 0.5);
        done();
      }, 150);
    });

    test('should handle completion callback correctly', (done) => {
      const mockEvent = { shiftKey: false };
      mockStudio.layers = [{ name: 'test-layer' }];
      const originalText = mockExportButton.textContent;

      videoExportService.export(mockEvent);

      setTimeout(() => {
        expect(mockExportButton.textContent).toBe(originalText);
        expect(mockStudio.loadingPopup.updateProgress).toHaveBeenCalledWith('video-export', 1.0);
        done();
      }, 250);
    });
  });

  describe('codec support detection', () => {
    test('should return false for codec support', () => {
      // The private method #checkCodecSupport always returns false
      expect(videoExportService.codecSupported).toBe(false);
    });

    test('should handle different codec support scenarios', () => {
      // Test with mocked VideoEncoder
      global.VideoEncoder = class MockVideoEncoder {};
      global.AudioEncoder = class MockAudioEncoder {};

      const serviceWithCodecs = new VideoExportService(mockStudio);
      // Should still be false due to the disabled check
      expect(serviceWithCodecs.codecSupported).toBe(false);

      // Clean up
      delete global.VideoEncoder;
      delete global.AudioEncoder;
    });
  });

  describe('integration tests', () => {
    test('should handle complete export workflow', (done) => {
      // Setup
      mockStudio.layers = [
        { name: 'video-layer' },
        { name: 'audio-layer' }
      ];
      videoExportService.init();

      // Simulate button click
      const mockEvent = { shiftKey: false };
      videoExportService.export(mockEvent);

      // Verify initial state
      expect(mockStudio.loadingPopup.startLoading).toHaveBeenCalled();
      expect(mockExportButton.textContent).toBe('Exporting...');

      // Wait for completion
      setTimeout(() => {
        expect(mockStudio.loadingPopup.updateProgress).toHaveBeenCalledWith('video-export', 1.0);
        expect(mockExportButton.textContent).toBe('Export');
        done();
      }, 300);
    });

    test('should handle multiple export attempts', () => {
      mockStudio.layers = [{ name: 'test-layer' }];
      videoExportService.init();

      const mockEvent = { shiftKey: false };
      
      // First export
      videoExportService.export(mockEvent);
      expect(mockStudio.loadingPopup.startLoading).toHaveBeenCalledTimes(1);

      // Second export (should work independently)
      videoExportService.export(mockEvent);
      expect(mockStudio.loadingPopup.startLoading).toHaveBeenCalledTimes(2);
    });

    test('should handle mixed export types', () => {
      mockStudio.layers = [{ name: 'test-layer' }];
      videoExportService.init();

      // JSON export
      const jsonEvent = { shiftKey: true };
      videoExportService.export(jsonEvent);
      expect(global.exportToJson).toHaveBeenCalled();

      // Regular export
      const regularEvent = { shiftKey: false };
      videoExportService.export(regularEvent);
      expect(mockStudio.loadingPopup.startLoading).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle undefined event object', () => {
      mockStudio.layers = [{ name: 'test-layer' }];
      
      expect(() => videoExportService.export(undefined)).not.toThrow();
    });

    test('should handle null studio layers', () => {
      mockStudio.getLayers = mockFn().mockReturnValue(null);
      const mockEvent = { shiftKey: false };

      expect(() => videoExportService.export(mockEvent)).not.toThrow();
    });

    test('should handle missing loading popup', () => {
      mockStudio.loadingPopup = null;
      mockStudio.layers = [{ name: 'test-layer' }];
      const mockEvent = { shiftKey: false };

      expect(() => videoExportService.export(mockEvent)).not.toThrow();
    });
  });
});
