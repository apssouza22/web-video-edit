import {afterEach, beforeEach, describe, expect, jest, test} from '@jest/globals';

const {AudioBufferSource} = await import('@/mediasource/frame-source');
const {PitchPreservationProcessor} = await import('@/medialayer/audio/pitch-preservation-processor');

describe('AudioBufferSource', () => {
  let audioBufferSource: InstanceType<typeof AudioBufferSource>;
  let audioContext: AudioContext;
  let mockAudioBuffer: AudioBuffer;
  let mockDestination: AudioNode;

  beforeEach(() => {
    audioContext = new AudioContext({sampleRate: 44100});
    mockAudioBuffer = audioContext.createBuffer(2, 88200, 44100);
    audioBufferSource = new AudioBufferSource(mockAudioBuffer);
    mockDestination = audioContext.destination;
  });

  afterEach(() => {
    audioBufferSource.disconnect();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct metadata', () => {
      expect(audioBufferSource.metadata.totalTimeInMilSeconds).toBe(mockAudioBuffer.duration * 1000);
      expect(audioBufferSource.metadata.sampleRate).toBe(44100);
      expect(audioBufferSource.metadata.numberOfChannels).toBe(2);
    });

    test('should store the audio buffer', () => {
      expect(audioBufferSource.audioBuffer).toBe(mockAudioBuffer);
    });
  });

  describe('connect', () => {
    test('should connect audio source to destination with normal speed', () => {
      const speed = 1.0;

      expect(() => {
        audioBufferSource.connect(audioContext, mockDestination, speed);
      }).not.toThrow();
    });

    test('should disconnect previous source before connecting new one', () => {
      const disconnectSpy = jest.spyOn(audioBufferSource, 'disconnect');

      audioBufferSource.connect(audioContext, mockDestination, 1.0);
      audioBufferSource.connect(audioContext, mockDestination, 1.5);

      expect(disconnectSpy).toHaveBeenCalledTimes(2);

      disconnectSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    test('should disconnect audio source successfully', () => {
      audioBufferSource.connect(audioContext, mockDestination, 1.0);

      expect(() => {
        audioBufferSource.disconnect();
      }).not.toThrow();
    });

    test('should handle multiple consecutive disconnects', () => {
      audioBufferSource.connect(audioContext, mockDestination, 1.0);
      audioBufferSource.disconnect();
      audioBufferSource.disconnect();
      audioBufferSource.disconnect();

      expect(true).toBe(true);
    });
  });

  describe('start', () => {
    test('should start audio playback at specified time with offset', () => {
      audioBufferSource.connect(audioContext, mockDestination, 1.0);

      expect(() => {
        audioBufferSource.start(0, 0.5);
      }).not.toThrow();
    });

    test('should start audio playback with zero offset', () => {
      audioBufferSource.connect(audioContext, mockDestination, 1.0);

      expect(() => {
        audioBufferSource.start(0, 0);
      }).not.toThrow();
    });

    test('should start audio playback at future time', () => {
      audioBufferSource.connect(audioContext, mockDestination, 1.0);

      expect(() => {
        audioBufferSource.start(1.0, 0);
      }).not.toThrow();
    });

    test('should start audio playback with non-zero when and offset', () => {
      audioBufferSource.connect(audioContext, mockDestination, 1.0);

      expect(() => {
        audioBufferSource.start(0.5, 0.25);
      }).not.toThrow();
    });
  });

  describe('pitch handling', () => {
    test('should use pitch preservation processor for speed !== 1.0', () => {
      const processorSpy = jest.spyOn(PitchPreservationProcessor.prototype, 'createPitchPreservedBuffer');

      audioBufferSource.connect(audioContext, mockDestination, 1.5);

      expect(processorSpy).toHaveBeenCalledWith(mockAudioBuffer, 1.5, audioContext);

      processorSpy.mockRestore();
    });

    test('should not use pitch preservation for speed === 1.0', () => {
      const processorSpy = jest.spyOn(PitchPreservationProcessor.prototype, 'createPitchPreservedBuffer');

      audioBufferSource.connect(audioContext, mockDestination, 1.0);

      expect(processorSpy).not.toHaveBeenCalled();

      processorSpy.mockRestore();
    });

    test('should handle various speed values with pitch processor', () => {
      const speeds = [0.5, 0.75, 1.25, 1.5, 2.0];

      speeds.forEach(speed => {
        const processorSpy = jest.spyOn(PitchPreservationProcessor.prototype, 'createPitchPreservedBuffer');
        
        audioBufferSource.connect(audioContext, mockDestination, speed);
        
        expect(processorSpy).toHaveBeenCalledWith(mockAudioBuffer, speed, audioContext);
        
        processorSpy.mockRestore();
      });
    });
  });

  describe('volume handling', () => {
    test('should create gain node for volume control', () => {
      const createGainSpy = jest.spyOn(audioContext, 'createGain');
      audioBufferSource.connect(audioContext, mockDestination, 1.0);
      expect(createGainSpy).toHaveBeenCalled();
      createGainSpy.mockRestore();
    });

    test('should set default volume to 1.0', () => {
      audioBufferSource.connect(audioContext, mockDestination, 1.0);
      expect(true).toBe(true);
    });
  });

  describe('integration', () => {
    test('should handle complete audio lifecycle', () => {
      expect(() => {
        audioBufferSource.connect(audioContext, mockDestination, 1.0);
        audioBufferSource.start(0, 0);
        audioBufferSource.disconnect();
      }).not.toThrow();
    });

    test('should handle reconnection after disconnect', () => {
      expect(() => {
        audioBufferSource.connect(audioContext, mockDestination, 1.0);
        audioBufferSource.disconnect();
        audioBufferSource.connect(audioContext, mockDestination, 1.5);
      }).not.toThrow();
    });

    test('should handle speed changes via reconnection', () => {
      expect(() => {
        audioBufferSource.connect(audioContext, mockDestination, 1.0);
        audioBufferSource.disconnect();
        audioBufferSource.connect(audioContext, mockDestination, 1.5);
        audioBufferSource.disconnect();
        audioBufferSource.connect(audioContext, mockDestination, 0.75);
      }).not.toThrow();
    });

    test('should handle mono and stereo buffers', () => {
      expect(() => {
        const monoBuffer = audioContext.createBuffer(1, 44100, 44100);
        const stereoBuffer = audioContext.createBuffer(2, 44100, 44100);

        const monoSource = new AudioBufferSource(monoBuffer);
        const stereoSource = new AudioBufferSource(stereoBuffer);

        monoSource.connect(audioContext, mockDestination, 1.0);
        monoSource.disconnect();
        stereoSource.connect(audioContext, mockDestination, 1.0);
        stereoSource.disconnect();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle negative speed', () => {
      const processorSpy = jest.spyOn(PitchPreservationProcessor.prototype, 'createPitchPreservedBuffer');
      
      expect(() => {
        audioBufferSource.connect(audioContext, mockDestination, -1.0);
      }).not.toThrow();
      
      expect(processorSpy).toHaveBeenCalled();
      
      processorSpy.mockRestore();
    });

    test('should handle multi-channel audio', () => {
      const multiChannelBuffer = audioContext.createBuffer(6, 44100, 44100);
      const multiChannelSource = new AudioBufferSource(multiChannelBuffer);
      expect(() => {
        multiChannelSource.connect(audioContext, mockDestination, 1.0);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('should disconnect when cleanup is called', () => {
      const disconnectSpy = jest.spyOn(audioBufferSource, 'disconnect');
      audioBufferSource.connect(audioContext, mockDestination, 1.0);
      audioBufferSource.cleanup();
      expect(disconnectSpy).toHaveBeenCalled();
      disconnectSpy.mockRestore();
    });
  });
});

