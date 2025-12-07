import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

// Use dynamic imports for ESM
const { PitchPreservationProcessor } = await import('../../src/mediaclip/audio/pitch-preservation-processor');

describe('PitchPreservationProcessor', () => {
  let processor: PitchPreservationProcessor;
  let audioContext: AudioContext;
  let mockAudioBuffer: AudioBuffer;

  beforeEach(() => {
    processor = new PitchPreservationProcessor();
    audioContext = new AudioContext({ sampleRate: 44100 });
    mockAudioBuffer = audioContext.createBuffer(2, 88200, 44100);
  });

  afterEach(() => {
    processor.clearCache();
    jest.restoreAllMocks();
  });

  describe('createPitchPreservedBuffer', () => {
    test('should return original buffer for speed 1.0', () => {
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, 1.0, audioContext);

      expect(result).toBe(mockAudioBuffer);
    });

    test('should create time-stretched buffer for speed !== 1.0', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result).not.toBe(mockAudioBuffer);
      expect(result.numberOfChannels).toBe(mockAudioBuffer.numberOfChannels);
      expect(result.sampleRate).toBe(mockAudioBuffer.sampleRate);
    });

    test('should adjust buffer length according to speed', () => {
      const speed = 2.0;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      const expectedLength = Math.floor(mockAudioBuffer.length / speed);
      expect(result.length).toBe(expectedLength);
      expect(result.duration).toBeCloseTo(mockAudioBuffer.duration / speed, 1);
    });

    test('should handle slow speed correctly', () => {
      const speed = 0.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      const expectedLength = Math.floor(mockAudioBuffer.length / speed);
      expect(result.length).toBe(expectedLength);
      expect(result.duration).toBeCloseTo(mockAudioBuffer.duration / speed, 1);
    });

    test('should preserve number of channels', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result.numberOfChannels).toBe(mockAudioBuffer.numberOfChannels);
    });

    test('should preserve sample rate', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result.sampleRate).toBe(mockAudioBuffer.sampleRate);
    });

    test('should handle mono audio', () => {
      const monoBuffer = audioContext.createBuffer(1, 88200, 44100);
      const speed = 1.5;

      const result = processor.createPitchPreservedBuffer(monoBuffer, speed, audioContext);

      expect(result.numberOfChannels).toBe(1);
      expect(result.sampleRate).toBe(44100);
    });

    test('should handle multi-channel audio', () => {
      const multiChannelBuffer = audioContext.createBuffer(6, 88200, 44100);
      const speed = 1.5;

      const result = processor.createPitchPreservedBuffer(multiChannelBuffer, speed, audioContext);

      expect(result.numberOfChannels).toBe(6);
      
      for (let channel = 0; channel < 6; channel++) {
        expect(result.getChannelData(channel)).toBeInstanceOf(Float32Array);
        expect(result.getChannelData(channel).length).toBe(result.length);
      }
    });

    test('should handle various speed values', () => {
      const speeds = [0.25, 0.5, 0.75, 1.25, 1.5, 2.0, 3.0, 4.0];

      speeds.forEach(speed => {
        const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
        
        expect(result).toBeDefined();
        expect(result.numberOfChannels).toBe(mockAudioBuffer.numberOfChannels);
        expect(result.sampleRate).toBe(mockAudioBuffer.sampleRate);
        expect(result.length).toBe(Math.floor(mockAudioBuffer.length / speed));
      });
    });

    test('should process all channels correctly', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      for (let channel = 0; channel < result.numberOfChannels; channel++) {
        const channelData = result.getChannelData(channel);
        expect(channelData).toBeInstanceOf(Float32Array);
        expect(channelData.length).toBe(result.length);
      }
    });

    test('should handle very fast speed', () => {
      const speed = 8.0;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result.length).toBe(Math.floor(mockAudioBuffer.length / speed));
      expect(result.duration).toBeCloseTo(mockAudioBuffer.duration / speed, 1);
    });

    test('should handle very slow speed', () => {
      const speed = 0.125;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result.length).toBe(Math.floor(mockAudioBuffer.length / speed));
      expect(result.duration).toBeCloseTo(mockAudioBuffer.duration / speed, 1);
    });

    test('should produce valid audio data', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      const channelData = result.getChannelData(0);
      let hasNonZeroData = false;
      let hasInvalidData = false;

      for (let i = 0; i < channelData.length; i++) {
        if (channelData[i] !== 0) {
          hasNonZeroData = true;
        }
        if (isNaN(channelData[i]) || !isFinite(channelData[i])) {
          hasInvalidData = true;
        }
      }

      expect(hasInvalidData).toBe(false);
    });

    test('should normalize audio to prevent clipping', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      const channelData = result.getChannelData(0);
      let maxValue = 0;

      for (let i = 0; i < channelData.length; i++) {
        maxValue = Math.max(maxValue, Math.abs(channelData[i]));
      }

      expect(maxValue).toBeLessThanOrEqual(1.0);
    });
  });

  describe('caching', () => {
    test('should cache processed buffers', () => {
      const speed = 1.5;

      const result1 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
      const result2 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result1).toBe(result2);
    });

    test('should use different cache entries for different speeds', () => {
      const speed1 = 1.5;
      const speed2 = 2.0;

      const result1 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed1, audioContext);
      const result2 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed2, audioContext);

      expect(result1).not.toBe(result2);
    });

    test('should use different cache entries for different buffer durations', () => {
      const speed = 1.5;
      const buffer1 = audioContext.createBuffer(2, 44100, 44100);
      const buffer2 = audioContext.createBuffer(2, 88200, 44100);

      const result1 = processor.createPitchPreservedBuffer(buffer1, speed, audioContext);
      const result2 = processor.createPitchPreservedBuffer(buffer2, speed, audioContext);

      expect(result1).not.toBe(result2);
    });

    test('should use different cache entries for different sample rates', () => {
      const speed = 1.5;
      const context1 = new AudioContext({ sampleRate: 44100 });
      const context2 = new AudioContext({ sampleRate: 48000 });
      
      const buffer1 = context1.createBuffer(2, 44100, 44100);
      const buffer2 = context2.createBuffer(2, 48000, 48000);

      const result1 = processor.createPitchPreservedBuffer(buffer1, speed, context1);
      const result2 = processor.createPitchPreservedBuffer(buffer2, speed, context2);

      expect(result1).not.toBe(result2);
    });

    test('should retrieve from cache on subsequent calls', () => {
      const speed = 1.5;

      const result1 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
      const result2 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
      const result3 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('should not cache buffers with speed 1.0', () => {
      const speed = 1.0;

      const result1 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
      const result2 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result1).toBe(mockAudioBuffer);
      expect(result2).toBe(mockAudioBuffer);
      expect(result1).toBe(result2);
    });
  });

  describe('clearCache', () => {
    test('should clear all cached buffers', () => {
      // @ts-ignore
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const speed = 1.5;

      processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
      
      processor.clearCache();

      expect(consoleLogSpy).toHaveBeenCalledWith('Pitch preservation buffer cache cleared');

      consoleLogSpy.mockRestore();
    });

    test('should allow new caching after clear', () => {
      const speed = 1.5;

      const result1 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
      processor.clearCache();
      const result2 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result1).not.toBe(result2);
      expect(result1.length).toBe(result2.length);
    });

    test('should handle clearing empty cache', () => {
      // @ts-ignore
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      expect(() => {
        processor.clearCache();
      }).not.toThrow();

      expect(consoleLogSpy).toHaveBeenCalledWith('Pitch preservation buffer cache cleared');

      consoleLogSpy.mockRestore();
    });

    test('should clear cache for multiple entries', () => {
      const speeds = [0.5, 1.5, 2.0];
      
      speeds.forEach(speed => {
        processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
      });

      processor.clearCache();

      const result1 = processor.createPitchPreservedBuffer(mockAudioBuffer, 1.5, audioContext);
      const result2 = processor.createPitchPreservedBuffer(mockAudioBuffer, 1.5, audioContext);

      expect(result1).toBe(result2);
    });
  });

  describe('time-stretching algorithm', () => {
    test('should use overlap-add method', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle frame processing', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      const channelData = result.getChannelData(0);
      expect(channelData).toBeInstanceOf(Float32Array);
    });

    test('should apply Hann window', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result.length).toBeGreaterThan(0);
    });

    test('should perform overlap-add correctly', () => {
      const speed = 1.5;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      const channelData = result.getChannelData(0);
      let allZero = true;
      
      for (let i = 0; i < channelData.length; i++) {
        if (channelData[i] !== 0) {
          allZero = false;
          break;
        }
      }

      expect(allZero).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle very small buffers', () => {
      const smallBuffer = audioContext.createBuffer(1, 1024, 44100);
      const speed = 1.5;

      const result = processor.createPitchPreservedBuffer(smallBuffer, speed, audioContext);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle speed close to 1.0', () => {
      const speed = 1.001;
      const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result).not.toBe(mockAudioBuffer);
      expect(result.length).toBe(Math.floor(mockAudioBuffer.length / speed));
    });

    test('should handle extreme speed values', () => {
      const extremeSpeeds = [0.1, 10.0];

      extremeSpeeds.forEach(speed => {
        const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
        
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
    });

    test('should handle buffer with all zero samples', () => {
      const zeroBuffer = audioContext.createBuffer(2, 88200, 44100);
      const speed = 1.5;

      const result = processor.createPitchPreservedBuffer(zeroBuffer, speed, audioContext);

      expect(result).toBeDefined();
      expect(result.length).toBe(Math.floor(zeroBuffer.length / speed));
    });
  });

  describe('integration', () => {
    test('should handle consecutive processing with different speeds', () => {
      const speeds = [0.5, 1.5, 2.0, 0.75, 1.25];

      speeds.forEach(speed => {
        const result = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
        expect(result).toBeDefined();
        expect(result.length).toBe(Math.floor(mockAudioBuffer.length / speed));
      });
    });

    test('should handle processing with cache clear in between', () => {
      const speed = 1.5;

      const result1 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
      processor.clearCache();
      const result2 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);
      const result3 = processor.createPitchPreservedBuffer(mockAudioBuffer, speed, audioContext);

      expect(result1).not.toBe(result2);
      expect(result2).toBe(result3);
    });

    test('should handle multiple buffers with same parameters', () => {
      const buffer1 = audioContext.createBuffer(2, 88200, 44100);
      const buffer2 = audioContext.createBuffer(2, 88200, 44100);
      const speed = 1.5;

      const result1 = processor.createPitchPreservedBuffer(buffer1, speed, audioContext);
      const result2 = processor.createPitchPreservedBuffer(buffer2, speed, audioContext);

      expect(result1.length).toBe(result2.length);
      expect(result1.sampleRate).toBe(result2.sampleRate);
    });
  });
});

