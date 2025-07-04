import { TranscriptionService } from '../../assets/js/transcription/transcription.js';
import { mockFn } from '../utils/mock-fn.js';

// Mock TranscriptionView
class MockTranscriptionView {
  constructor(service) {
    this.service = service;
    this.updateTranscription = mockFn();
    this.showLoading = mockFn();
    this.hideLoading = mockFn();
  }
}

// Mock Worker
class MockWorker {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.onmessage = null;
    this.onerror = null;
    this.postMessage = mockFn();
    this.terminate = mockFn();
    this.addEventListener = mockFn();
  }

  // Simulate worker message
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
    // Also trigger addEventListener handlers
    const messageHandlers = this.addEventListener.mock.calls
      .filter(call => call[0] === 'message')
      .map(call => call[1]);
    messageHandlers.forEach(handler => handler({ data }));
  }

  simulateError(error) {
    if (this.onerror) {
      this.onerror({ error });
    }
  }
}

// Mock transformAudioBuffer function
global.transformAudioBuffer = mockFn((audioBuffer) => ({
  sampleRate: audioBuffer.sampleRate,
  channelData: [new Float32Array(1024)]
}));

// Override global Worker
global.Worker = MockWorker;

describe('TranscriptionService', () => {
  let transcriptionService;
  let mockWorker;

  beforeEach(() => {
    transcriptionService = new TranscriptionService();
    transcriptionService.view = new MockTranscriptionView(transcriptionService);
    mockWorker = transcriptionService.worker;

    // Mock console methods
    global.console = {
      log: mockFn(),
      warn: mockFn(),
      error: mockFn()
    };

    // Mock alert
    global.alert = mockFn();
  });

  afterEach(() => {
    // Mock functions reset individually
  });

  describe('constructor', () => {
    test('should create instance with worker and transcription view', () => {
      expect(transcriptionService).toBeInstanceOf(TranscriptionService);
      expect(transcriptionService.worker).toBeInstanceOf(MockWorker);
      expect(transcriptionService.view).toBeInstanceOf(MockTranscriptionView);
    });

    test('should initialize callback functions', () => {
      expect(typeof transcriptionService.onRemoveIntervalListener).toBe('function');
      expect(typeof transcriptionService.onSeekListener).toBe('function');
    });

    test('should add event listeners to worker', () => {
      expect(mockWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    test('should create worker with correct URL and options', () => {
      expect(mockWorker.url).toContain('worker.js');
      expect(mockWorker.options).toEqual({ type: 'module' });
    });
  });

  describe('addRemoveIntervalListener', () => {
    test('should set callback function', () => {
      const mockCallback = mockFn();

      transcriptionService.addRemoveIntervalListener(mockCallback);

      expect(transcriptionService.onRemoveIntervalListener).toBe(mockCallback);
    });

    test('should handle non-function callback', () => {
      const consoleSpy = mockFn();
      const originalConsoleError = console.error;
      console.error = consoleSpy;

      transcriptionService.addRemoveIntervalListener('not a function');

      expect(consoleSpy).toHaveBeenCalledWith('Callback must be a function');
      expect(transcriptionService.onRemoveIntervalListener).not.toBe('not a function');
      
      // Restore console.error
      console.error = originalConsoleError;
    });

    test('should handle null callback', () => {
      const consoleSpy = mockFn();
      const originalConsoleError = console.error;
      console.error = consoleSpy;

      transcriptionService.addRemoveIntervalListener(null);

      expect(consoleSpy).toHaveBeenCalledWith('Callback must be a function');
      expect(transcriptionService.onRemoveIntervalListener).not.toBe(null);
      
      // Restore console.error
      console.error = originalConsoleError;
    });

    test('should accept arrow function callback', () => {
      const arrowCallback = (start, end) => console.log(`Remove ${start}-${end}`);

      transcriptionService.addRemoveIntervalListener(arrowCallback);

      expect(transcriptionService.onRemoveIntervalListener).toBe(arrowCallback);
    });
  });

  describe('addSeekListener', () => {
    test('should set callback function', () => {
      const mockCallback = mockFn();

      transcriptionService.addSeekListener(mockCallback);

      expect(transcriptionService.onSeekListener).toBe(mockCallback);
    });

    test('should handle non-function callback', () => {
      const consoleSpy = mockFn();
      const originalConsoleError = console.error;
      console.error = consoleSpy;

      transcriptionService.addSeekListener(123);

      expect(consoleSpy).toHaveBeenCalledWith('Callback must be a function');
      expect(transcriptionService.onSeekListener).not.toBe(123);
      
      // Restore console.error
      console.error = originalConsoleError;
    });

    test('should handle function callback', () => {
      const functionCallback = function(timestamp) {
        return timestamp * 1000;
      };

      transcriptionService.addSeekListener(functionCallback);

      expect(transcriptionService.onSeekListener).toBe(functionCallback);
    });
  });

  describe('removeInterval', () => {
    test('should call onRemoveIntervalListener with correct parameters', () => {
      const mockCallback = mockFn();
      transcriptionService.addRemoveIntervalListener(mockCallback);

      const startTime = 10.5;
      const endTime = 25.3;

      transcriptionService.removeInterval(startTime, endTime);

      expect(mockCallback).toHaveBeenCalledWith(startTime, endTime);
    });

    test('should handle default callback', () => {
      // Default callback should not throw
      expect(() => {
        transcriptionService.removeInterval(5, 10);
      }).not.toThrow();
    });

    test('should handle multiple calls', () => {
      const mockCallback = mockFn();
      transcriptionService.addRemoveIntervalListener(mockCallback);

      transcriptionService.removeInterval(1, 2);
      transcriptionService.removeInterval(3, 4);
      transcriptionService.removeInterval(5, 6);

      expect(mockCallback).toHaveBeenCalledTimes(3);
      expect(mockCallback).toHaveBeenNthCalledWith(1, 1, 2);
      expect(mockCallback).toHaveBeenNthCalledWith(2, 3, 4);
      expect(mockCallback).toHaveBeenNthCalledWith(3, 5, 6);
    });
  });

  describe('seekToTimestamp', () => {
    test('should call onSeekListener with correct timestamp', () => {
      const mockCallback = mockFn();
      transcriptionService.addSeekListener(mockCallback);

      const timestamp = 42.5;

      transcriptionService.seekToTimestamp(timestamp);

      expect(mockCallback).toHaveBeenCalledWith(timestamp);
    });

    test('should handle default callback', () => {
      // Default callback should not throw
      expect(() => {
        transcriptionService.seekToTimestamp(15.7);
      }).not.toThrow();
    });

    test('should handle zero timestamp', () => {
      const mockCallback = mockFn();
      transcriptionService.addSeekListener(mockCallback);

      transcriptionService.seekToTimestamp(0);

      expect(mockCallback).toHaveBeenCalledWith(0);
    });

    test('should handle negative timestamp', () => {
      const mockCallback = mockFn();
      transcriptionService.addSeekListener(mockCallback);

      transcriptionService.seekToTimestamp(-5);

      expect(mockCallback).toHaveBeenCalledWith(-5);
    });
  });

  describe('loadModel', () => {
    test('should post load-model message to worker', () => {
      transcriptionService.loadModel();

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        task: 'load-model'
      });
    });

    test('should handle multiple load model calls', () => {
      transcriptionService.loadModel();
      transcriptionService.loadModel();

      expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);
      expect(mockWorker.postMessage).toHaveBeenNthCalledWith(1, { task: 'load-model' });
      expect(mockWorker.postMessage).toHaveBeenNthCalledWith(2, { task: 'load-model' });
    });
  });

  describe('startTranscription', () => {
    test('should show loading and post audio to worker', () => {
      const mockAudioBuffer = {
        length: 1024,
        sampleRate: 44100,
        numberOfChannels: 2,
        getChannelData: mockFn(() => new Float32Array(1024))
      };

      transcriptionService.startTranscription(mockAudioBuffer);

      expect(transcriptionService.view.showLoading).toHaveBeenCalled();
      expect(global.transformAudioBuffer).toHaveBeenCalledWith(mockAudioBuffer);
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          sampleRate: 44100,
          channelData: expect.any(Array)
        })
      });
    });

    test('should handle null audio buffer', () => {
      expect(() => {
        transcriptionService.startTranscription(null);
      }).not.toThrow();

      expect(transcriptionService.view.showLoading).toHaveBeenCalled();
      expect(global.transformAudioBuffer).toHaveBeenCalledWith(null);
    });

    test('should handle empty audio buffer', () => {
      const emptyAudioBuffer = {
        length: 0,
        sampleRate: 44100,
        numberOfChannels: 0,
        getChannelData: mockFn(() => new Float32Array(0))
      };

      transcriptionService.startTranscription(emptyAudioBuffer);

      expect(transcriptionService.view.showLoading).toHaveBeenCalled();
      expect(global.transformAudioBuffer).toHaveBeenCalledWith(emptyAudioBuffer);
    });
  });

  describe('worker message handling', () => {
    test('should handle progress message', () => {
      const progressMessage = {
        status: 'progress',
        progress: 0.5
      };

      mockWorker.simulateMessage(progressMessage);

      expect(global.console.log).toHaveBeenCalledWith(
        'Loading model progress',
        0.5
      );
    });

    test('should handle complete message', () => {
      const transcriptionData = {
        text: 'Hello world',
        segments: [
          { start: 0, end: 1, text: 'Hello' },
          { start: 1, end: 2, text: 'world' }
        ]
      };
      const completeMessage = {
        status: 'complete',
        data: transcriptionData
      };

      mockWorker.simulateMessage(completeMessage);

      expect(global.console.log).toHaveBeenCalledWith(
        'Transcription complete:',
        transcriptionData
      );
      expect(transcriptionService.view.updateTranscription).toHaveBeenCalledWith(
        transcriptionData
      );
    });

    test('should handle initiate message', () => {
      const initiateMessage = {
        status: 'initiate'
      };

      mockWorker.simulateMessage(initiateMessage);

      expect(global.console.log).toHaveBeenCalledWith('Initiating model loading');
    });

    test('should handle ready message', () => {
      const readyMessage = {
        status: 'ready'
      };

      mockWorker.simulateMessage(readyMessage);

      expect(global.console.log).toHaveBeenCalledWith('Model ready');
    });

    test('should handle error message', () => {
      const errorMessage = {
        status: 'error',
        data: {
          message: 'Model loading failed'
        }
      };

      mockWorker.simulateMessage(errorMessage);

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Model loading failed')
      );
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Safari on an M1/M2 Mac')
      );
    });

    test('should handle done message', () => {
      const doneMessage = {
        status: 'done',
        file: 'model.bin'
      };

      mockWorker.simulateMessage(doneMessage);

      expect(global.console.log).toHaveBeenCalledWith(
        'Model file done loaded:',
        'model.bin'
      );
    });

    test('should handle unknown message status', () => {
      const consoleSpy = mockFn();
      const originalConsoleError = console.error;
      console.error = consoleSpy;

      mockWorker.simulateMessage({ status: 'unknown', data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith('Unknown transcription status:', 'unknown');
      
      // Restore console.error
      console.error = originalConsoleError;
    });

    test('should handle message without status', () => {
      expect(() => {
        mockWorker.simulateMessage({ data: 'some data' });
      }).not.toThrow();
    });

    test('should handle worker error', () => {
      const consoleSpy = mockFn();
      const originalConsoleError = console.error;
      console.error = consoleSpy;

      const errorMessage = 'Worker failed';
      mockWorker.simulateError(new Error(errorMessage));

      expect(consoleSpy).toHaveBeenCalledWith('Transcription error:', expect.any(Error));
      
      // Restore console.error
      console.error = originalConsoleError;
    });

    test('should handle worker message error', () => {
      const consoleSpy = mockFn();
      const originalConsoleError = console.error;
      console.error = consoleSpy;

      const errorData = { error: 'Processing failed' };
      mockWorker.simulateMessage({ status: 'error', error: errorData });

      expect(consoleSpy).toHaveBeenCalledWith('Transcription error:', errorData);
      
      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('integration tests', () => {
    test('should complete full transcription workflow', () => {
      const mockRemoveCallback = mockFn();
      const mockSeekCallback = mockFn();
      const mockAudioBuffer = {
        length: 2048,
        sampleRate: 48000,
        numberOfChannels: 2,
        getChannelData: mockFn(() => new Float32Array(2048))
      };

      // Setup callbacks
      transcriptionService.addRemoveIntervalListener(mockRemoveCallback);
      transcriptionService.addSeekListener(mockSeekCallback);

      // Load model
      transcriptionService.loadModel();
      expect(mockWorker.postMessage).toHaveBeenCalledWith({ task: 'load-model' });

      // Simulate model ready
      mockWorker.simulateMessage({ status: 'ready' });
      expect(global.console.log).toHaveBeenCalledWith('Model ready');

      // Start transcription
      transcriptionService.startTranscription(mockAudioBuffer);
      expect(transcriptionService.view.showLoading).toHaveBeenCalled();

      // Simulate transcription complete
      const transcriptionData = {
        text: 'This is a test transcription',
        segments: [
          { start: 0, end: 2, text: 'This is' },
          { start: 2, end: 4, text: 'a test' },
          { start: 4, end: 6, text: 'transcription' }
        ]
      };
      mockWorker.simulateMessage({ status: 'complete', data: transcriptionData });

      expect(transcriptionService.view.updateTranscription).toHaveBeenCalledWith(
        transcriptionData
      );

      // Test callback functionality
      transcriptionService.removeInterval(1, 3);
      expect(mockRemoveCallback).toHaveBeenCalledWith(1, 3);

      transcriptionService.seekToTimestamp(2.5);
      expect(mockSeekCallback).toHaveBeenCalledWith(2.5);
    });

    test('should handle error during transcription workflow', () => {
      const mockAudioBuffer = {
        length: 1024,
        sampleRate: 44100,
        numberOfChannels: 1,
        getChannelData: mockFn(() => new Float32Array(1024))
      };

      // Start transcription
      transcriptionService.startTranscription(mockAudioBuffer);

      // Simulate error
      mockWorker.simulateMessage({
        status: 'error',
        data: { message: 'Transcription failed' }
      });

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Transcription failed')
      );
    });

    test('should handle multiple transcription sessions', () => {
      const audioBuffer1 = {
        length: 1024,
        sampleRate: 44100,
        numberOfChannels: 1,
        getChannelData: mockFn(() => new Float32Array(1024))
      };

      const audioBuffer2 = {
        length: 2048,
        sampleRate: 48000,
        numberOfChannels: 2,
        getChannelData: mockFn(() => new Float32Array(2048))
      };

      // First transcription
      transcriptionService.startTranscription(audioBuffer1);
      expect(transcriptionService.view.showLoading).toHaveBeenCalledTimes(1);

      // Second transcription
      transcriptionService.startTranscription(audioBuffer2);
      expect(transcriptionService.view.showLoading).toHaveBeenCalledTimes(2);

      expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('callback management', () => {
    test('should allow callback replacement', () => {
      const firstCallback = mockFn();
      const secondCallback = mockFn();

      transcriptionService.addRemoveIntervalListener(firstCallback);
      transcriptionService.removeInterval(1, 2);
      expect(firstCallback).toHaveBeenCalledWith(1, 2);

      transcriptionService.addRemoveIntervalListener(secondCallback);
      transcriptionService.removeInterval(3, 4);
      expect(secondCallback).toHaveBeenCalledWith(3, 4);
      expect(firstCallback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    test('should handle callback with return values', () => {
      const callbackWithReturn = mockFn((start, end) => end - start);

      transcriptionService.addRemoveIntervalListener(callbackWithReturn);
      transcriptionService.removeInterval(5, 10);

      expect(callbackWithReturn).toHaveBeenCalledWith(5, 10);
      expect(callbackWithReturn).toHaveReturnedWith(5);
    });
  });
});
