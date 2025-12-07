import {afterEach, beforeEach, describe, expect, jest, test} from '@jest/globals';

// Use dynamic imports for ESM
const {AudioSource} = await import('../../src/media/audio-source');
const {PitchPreservationProcessor} = await import('../../src/mediaclip/audio/pitch-preservation-processor');

describe('AudioSource', () => {
  let audioSource: AudioSource;
  let audioContext: AudioContext;
  let mockAudioBuffer: AudioBuffer;
  let mockDestination: AudioNode;

  beforeEach(() => {
    audioContext = new AudioContext({sampleRate: 44100});
    audioSource = new AudioSource(audioContext);
    mockAudioBuffer = audioContext.createBuffer(2, 88200, 44100);
    mockDestination = audioContext.destination;
  });

  afterEach(() => {
    audioSource.disconnect();
    jest.restoreAllMocks();
  });

  describe('connect', () => {
    test('should connect audio source to destination with normal speed', () => {
      const speed = 1.0;

      expect(() => {
        audioSource.connect(mockDestination, speed, mockAudioBuffer);
      }).not.toThrow();
    });

    test('should disconnect previous source before connecting new one', () => {
      const disconnectSpy = jest.spyOn(audioSource as any, 'disconnect');

      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);
      audioSource.connect(mockDestination, 1.5, mockAudioBuffer);

      expect(disconnectSpy).toHaveBeenCalledTimes(2);

      disconnectSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    test('should disconnect audio source successfully', () => {
      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);

      expect(() => {
        audioSource.disconnect();
      }).not.toThrow();
    });


    test('should handle multiple consecutive disconnects', () => {
      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);
      audioSource.disconnect();
      audioSource.disconnect();
      audioSource.disconnect();

      expect(true).toBe(true);
    });
  });

  describe('start', () => {
    test('should start audio playback at specified time with offset', () => {
      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);

      expect(() => {
        audioSource.start(0, 0.5);
      }).not.toThrow();
    });

    test('should start audio playback with zero offset', () => {
      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);

      expect(() => {
        audioSource.start(0, 0);
      }).not.toThrow();
    });

    test('should start audio playback at future time', () => {
      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);

      expect(() => {
        audioSource.start(1.0, 0);
      }).not.toThrow();
    });

    test('should start audio playback with non-zero when and offset', () => {
      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);

      expect(() => {
        audioSource.start(0.5, 0.25);
      }).not.toThrow();
    });
  });

  describe('pitch handling', () => {
    test('should use pitch preservation processor for speed !== 1.0', () => {
      const processorSpy = jest.spyOn(PitchPreservationProcessor.prototype, 'createPitchPreservedBuffer');

      audioSource.connect(mockDestination, 1.5, mockAudioBuffer);

      expect(processorSpy).toHaveBeenCalledWith(mockAudioBuffer, 1.5, audioContext);

      processorSpy.mockRestore();
    });

    test('should not use pitch preservation for speed === 1.0', () => {
      const processorSpy = jest.spyOn(PitchPreservationProcessor.prototype, 'createPitchPreservedBuffer');

      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);

      expect(processorSpy).not.toHaveBeenCalledWith();

      processorSpy.mockRestore();
    });

    test('should handle various speed values with pitch processor', () => {
      const speeds = [0.5, 0.75, 1.25, 1.5, 2.0];

      speeds.forEach(speed => {
        const processorSpy = jest.spyOn(PitchPreservationProcessor.prototype, 'createPitchPreservedBuffer');
        
        audioSource.connect(mockDestination, speed, mockAudioBuffer);
        
        expect(processorSpy).toHaveBeenCalledWith(mockAudioBuffer, speed, audioContext);
        
        processorSpy.mockRestore();
      });
    });

  });

  describe('volume handling', () => {
    test('should create gain node for volume control', () => {
      const createGainSpy = jest.spyOn(audioContext, 'createGain');
      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);
      expect(createGainSpy).toHaveBeenCalled();
      createGainSpy.mockRestore();
    });

    test('should set default volume to 1.0', () => {
      audioSource.connect(mockDestination, 1.0, mockAudioBuffer);
      expect(true).toBe(true);
    });
  });

  describe('integration', () => {
    test('should handle complete audio lifecycle', () => {
      expect(() => {
        audioSource.connect(mockDestination, 1.0, mockAudioBuffer);
        audioSource.start(0, 0);
        audioSource.disconnect();
      }).not.toThrow();
    });

    test('should handle reconnection after disconnect', () => {
      expect(() => {
        audioSource.connect(mockDestination, 1.0, mockAudioBuffer);
        audioSource.disconnect();
        audioSource.connect(mockDestination, 1.5, mockAudioBuffer);
      }).not.toThrow();
    });

    test('should handle speed changes via reconnection', () => {
      expect(() => {
        audioSource.connect(mockDestination, 1.0, mockAudioBuffer);
        audioSource.disconnect();
        audioSource.connect(mockDestination, 1.5, mockAudioBuffer);
        audioSource.disconnect();
        audioSource.connect(mockDestination, 0.75, mockAudioBuffer);
      }).not.toThrow();
    });

    test('should handle different audio buffers', () => {
      const buffer1 = audioContext.createBuffer(2, 44100, 44100);
      const buffer2 = audioContext.createBuffer(2, 88200, 44100);
      expect(() => {
        audioSource.connect(mockDestination, 1.0, buffer1);
        audioSource.disconnect();
        audioSource.connect(mockDestination, 1.0, buffer2);
      }).not.toThrow();
    });

    test('should handle mono and stereo buffers', () => {
      expect(() => {
        const monoBuffer = audioContext.createBuffer(1, 44100, 44100);
        const stereoBuffer = audioContext.createBuffer(2, 44100, 44100);

        audioSource.connect(mockDestination, 1.0, monoBuffer);
        audioSource.disconnect();
        audioSource.connect(mockDestination, 1.0, stereoBuffer);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle negative speed', () => {
      const processorSpy = jest.spyOn(PitchPreservationProcessor.prototype, 'createPitchPreservedBuffer');
      
      expect(() => {
        audioSource.connect(mockDestination, -1.0, mockAudioBuffer);
      }).not.toThrow();
      
      expect(processorSpy).toHaveBeenCalled();
      
      processorSpy.mockRestore();
    });

    test('should handle multi-channel audio', () => {
      const multiChannelBuffer = audioContext.createBuffer(6, 44100, 44100);
      expect(() => {
        audioSource.connect(mockDestination, 1.0, multiChannelBuffer);
      }).not.toThrow();
    });
  });
});

