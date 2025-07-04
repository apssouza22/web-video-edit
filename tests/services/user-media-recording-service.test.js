import { UserMediaRecordingService } from '../../assets/js/record/service.js';
import { mockFn } from '../utils/mock-fn.js';

// Mock RecordingPreview
class MockRecordingPreview {
  constructor() {
    this.show = mockFn();
    this.hide = mockFn();
    this.update = mockFn();
  }
}

describe('UserMediaRecordingService', () => {
  let recordingService;
  let mockMediaStream;
  let mockMediaRecorder;
  let mockVideoTrack;
  let mockAudioTrack;

  beforeEach(() => {
    recordingService = new UserMediaRecordingService();
    // Replace the preview with our mock
    recordingService.preview = new MockRecordingPreview();

    // Mock MediaStream
    mockVideoTrack = {
      addEventListener: mockFn(),
      kind: 'video'
    };
    mockAudioTrack = {
      addEventListener: mockFn(),
      kind: 'audio'
    };
    mockMediaStream = {
      getVideoTracks: () => [mockVideoTrack],
      getAudioTracks: () => [mockAudioTrack],
      getTracks: () => [mockVideoTrack, mockAudioTrack]
    };

    // Mock MediaRecorder
    mockMediaRecorder = {
      state: 'inactive',
      addEventListener: mockFn(),
      start: () => {
        mockMediaRecorder.state = 'recording';
      },
      stop: () => {
        mockMediaRecorder.state = 'inactive';
      },
      ondataavailable: null,
      onstop: null,
      onerror: null
    };

    // Mock navigator.mediaDevices
    global.navigator.mediaDevices = {
      getDisplayMedia: () => Promise.resolve(mockMediaStream),
      getUserMedia: () => Promise.resolve(mockMediaStream)
    };

    // Mock MediaRecorder constructor
    global.MediaRecorder = () => mockMediaRecorder;
    global.MediaRecorder.isTypeSupported = () => true;

    // Mock document and window
    global.document = {
      addEventListener: mockFn(),
      hidden: false,
      visibilityState: 'visible'
    };

    global.window = {
      addEventListener: mockFn()
    };

    // Mock console methods
    global.console = {
      log: mockFn(),
      warn: mockFn(),
      error: mockFn()
    };
  });

  afterEach(() => {
    // Mock functions reset individually
  });

  describe('constructor', () => {
    test('should create instance with default properties', () => {
      expect(recordingService).toBeInstanceOf(UserMediaRecordingService);
      expect(recordingService.isRecording).toBe(false);
    });

    test('should initialize private properties correctly', () => {
      // Test that private properties are initialized (indirectly through behavior)
      expect(recordingService.isRecording).toBe(false);
    });
  });

  describe('addOnVideoFileCreatedListener', () => {
    test('should set callback function', () => {
      const mockCallback = mockFn();

      recordingService.addOnVideoFileCreatedListener(mockCallback);

      // Since the callback is private, we can't directly test it
      // but we can verify it doesn't throw
      expect(() => recordingService.addOnVideoFileCreatedListener(mockCallback)).not.toThrow();
    });

    test('should throw error for non-function callback', () => {
      expect(() => {
        recordingService.addOnVideoFileCreatedListener('not a function');
      }).toThrow('Callback must be a function');

      expect(() => {
        recordingService.addOnVideoFileCreatedListener(null);
      }).toThrow('Callback must be a function');

      expect(() => {
        recordingService.addOnVideoFileCreatedListener(123);
      }).toThrow('Callback must be a function');
    });

    test('should accept arrow function callback', () => {
      const arrowCallback = (file) => console.log('File created:', file);

      expect(() => {
        recordingService.addOnVideoFileCreatedListener(arrowCallback);
      }).not.toThrow();
    });
  });

  describe('startScreenCapture', () => {
    test('should request display media and start recording', async () => {
      await recordingService.startScreenCapture();

      expect(global.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledTimes(1);
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    });

    test('should handle microphone access denial gracefully', async () => {
      global.navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('Permission denied'));

      await recordingService.startScreenCapture();

      expect(global.console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Microphone access denied'),
        'Permission denied'
      );
      expect(global.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledTimes(1);
    });

    test('should throw error when display media fails', async () => {
      const displayError = new Error('Display media failed');
      global.navigator.mediaDevices.getDisplayMedia = () => Promise.reject(displayError);

      await expect(recordingService.startScreenCapture()).rejects.toThrow('Display media failed');
      expect(global.console.error).toHaveBeenCalledWith(
        'Error starting screen capture:',
        displayError
      );
    });

    test('should add event listeners to tracks', async () => {
      await recordingService.startScreenCapture();

      expect(mockVideoTrack.addEventListener).toHaveBeenCalledTimes(1);
      expect(mockAudioTrack.addEventListener).toHaveBeenCalledTimes(1);
    });

    test('should handle browser support check', async () => {
      // Mock missing MediaRecorder
      const originalMediaRecorder = global.MediaRecorder;
      delete global.MediaRecorder;

      await expect(recordingService.startScreenCapture()).rejects.toThrow();

      // Restore MediaRecorder
      global.MediaRecorder = originalMediaRecorder;
    });
  });

  describe('startCameraCapture', () => {
    test('should request camera media and start recording', async () => {
      await recordingService.startCameraCapture();

      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    });

    test('should handle camera access failure', async () => {
      const cameraError = new Error('Camera not available');
      global.navigator.mediaDevices.getUserMedia = () => Promise.reject(cameraError);

      await expect(recordingService.startCameraCapture()).rejects.toThrow('Camera not available');
    });

    test('should set up recording with camera stream', async () => {
      await recordingService.startCameraCapture();

      expect(global.MediaRecorder).toHaveBeenCalledTimes(1);
    });
  });

  describe('browser support checks', () => {
    test('should check for MediaRecorder support', async () => {
      delete global.MediaRecorder;

      await expect(recordingService.startScreenCapture()).rejects.toThrow();
    });

    test('should check for navigator.mediaDevices support', async () => {
      delete global.navigator.mediaDevices;

      await expect(recordingService.startScreenCapture()).rejects.toThrow();
    });

    test('should handle partial browser support', async () => {
      global.navigator.mediaDevices.getDisplayMedia = undefined;

      await expect(recordingService.startScreenCapture()).rejects.toThrow();
    });
  });

  describe('event handling', () => {
    test('should handle video track ended event', async () => {
      await recordingService.startScreenCapture();

      // Get the event handler that was added to the video track
      const endedHandler = mockVideoTrack.addEventListener.mock.calls.find(
        call => call[0] === 'ended'
      )[1];

      // Simulate track ending
      endedHandler();

      expect(global.console.log).toHaveBeenCalledWith(
        'Video track ended - Screen sharing stopped by user'
      );
    });

    test('should handle audio track ended event', async () => {
      await recordingService.startScreenCapture();

      // Get the event handler that was added to the audio track
      const endedHandler = mockAudioTrack.addEventListener.mock.calls.find(
        call => call[0] === 'ended'
      )[1];

      // Simulate track ending
      endedHandler();

      expect(global.console.warn).toHaveBeenCalledWith(
        'Audio recording interrupted, continuing with video only'
      );
    });

    test('should handle MediaRecorder error events', async () => {
      await recordingService.startScreenCapture();

      // Get the error handler that was added to MediaRecorder
      const errorHandler = mockMediaRecorder.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const mockError = new Error('Recording error');
      errorHandler({ error: mockError });

      expect(global.console.error).toHaveBeenCalledWith(
        'MediaRecorder error:',
        mockError
      );
    });

    test('should handle page visibility changes', async () => {
      await recordingService.startScreenCapture();
      recordingService.isRecording = true;

      // Get the visibility change handler
      const visibilityHandler = global.document.addEventListener.mock.calls.find(
        call => call[0] === 'visibilitychange'
      )[1];

      global.document.hidden = true;
      visibilityHandler();

      expect(global.console.log).toHaveBeenCalledWith(
        'Page hidden during recording, continuing...'
      );
    });

    test('should handle page unload during recording', async () => {
      await recordingService.startScreenCapture();
      recordingService.isRecording = true;

      // Get the beforeunload handler
      const unloadHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'beforeunload'
      )[1];

      unloadHandler();

      expect(global.console.log).toHaveBeenCalledWith(
        'Page unloading during recording'
      );
    });
  });

  describe('stream combination', () => {
    test('should combine screen and microphone streams', async () => {
      const mockScreenStream = {
        getVideoTracks: () => [mockVideoTrack],
        getAudioTracks: () => []
      };
      const mockMicStream = {
        getVideoTracks: () => [],
        getAudioTracks: () => [mockAudioTrack]
      };

      global.navigator.mediaDevices.getDisplayMedia = () => Promise.resolve(mockScreenStream);
      global.navigator.mediaDevices.getUserMedia = () => Promise.resolve(mockMicStream);

      await recordingService.startScreenCapture();

      expect(global.MediaRecorder).toHaveBeenCalledTimes(1);
    });

    test('should handle screen-only recording when microphone fails', async () => {
      global.navigator.mediaDevices.getUserMedia = () => Promise.reject(
        new Error('Microphone denied')
      );

      await recordingService.startScreenCapture();

      expect(global.console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Microphone access denied'),
        'Microphone denied'
      );
      expect(global.MediaRecorder).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration tests', () => {
    test('should complete full screen recording workflow', async () => {
      const mockCallback = mockFn();
      recordingService.addOnVideoFileCreatedListener(mockCallback);

      await recordingService.startScreenCapture();

      expect(global.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledTimes(1);
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
      expect(global.MediaRecorder).toHaveBeenCalledTimes(1);
      expect(mockVideoTrack.addEventListener).toHaveBeenCalledTimes(1);
      expect(mockAudioTrack.addEventListener).toHaveBeenCalledTimes(1);
    });

    test('should complete full camera recording workflow', async () => {
      const mockCallback = mockFn();
      recordingService.addOnVideoFileCreatedListener(mockCallback);

      await recordingService.startCameraCapture();

      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
      expect(global.MediaRecorder).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple recording attempts', async () => {
      await recordingService.startScreenCapture();
      expect(global.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledTimes(1);

      await recordingService.startCameraCapture();
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
    });
  });

  describe('error scenarios', () => {
    test('should handle undefined media devices', async () => {
      global.navigator.mediaDevices = undefined;

      await expect(recordingService.startScreenCapture()).rejects.toThrow();
    });

    test('should handle MediaRecorder constructor failure', async () => {
      global.MediaRecorder = () => {
        throw new Error('MediaRecorder failed');
      };

      await expect(recordingService.startScreenCapture()).rejects.toThrow();
    });

    test('should handle stream with no tracks', async () => {
      const emptyStream = {
        getVideoTracks: () => [],
        getAudioTracks: () => [],
        getTracks: () => []
      };
      global.navigator.mediaDevices.getDisplayMedia = () => Promise.resolve(emptyStream);

      await recordingService.startScreenCapture();

      expect(global.MediaRecorder).toHaveBeenCalledTimes(1);
    });
  });
});
