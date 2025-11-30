import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

// Use dynamic imports for ESM
const { AudioSplitHandler } = await import('@/audio/AudioSplitHandler');
const { AbstractMedia } = await import('@/medialayer/media-common');

class MockMedia extends AbstractMedia {
  constructor() {
    super();
    this.name = 'MockMedia';
    this.audioBuffer = null;
    this.playerAudioContext = null;
    this.startTime = 0;
    this.totalTimeInMilSeconds = 0;
  }
}

describe('AudioSplitHandler', () => {
  let audioSplitHandler: AudioSplitHandler;
  let audioContext: AudioContext;
  let mockMediaOriginal: MockMedia;
  let mockMediaClone: MockMedia;
  let mockAudioBuffer: AudioBuffer;

  beforeEach(() => {
    audioSplitHandler = new AudioSplitHandler();
    audioContext = new AudioContext({ sampleRate: 44100 });
    mockMediaOriginal = new MockMedia();
    mockMediaClone = new MockMedia();
    
    mockAudioBuffer = audioContext.createBuffer(2, 88200, 44100);
    mockMediaOriginal.audioBuffer = mockAudioBuffer;
    mockMediaOriginal.playerAudioContext = audioContext;
    mockMediaOriginal.totalTimeInMilSeconds = mockAudioBuffer.duration * 1000;
    mockMediaOriginal.startTime = 1000;
    mockMediaOriginal.name = 'Test Audio';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('split', () => {
    test('should split audio buffer successfully at middle point', () => {
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaClone.audioBuffer).not.toBeNull();
      expect(mockMediaOriginal.audioBuffer).not.toBeNull();
      expect(mockMediaClone.audioBuffer!.duration).toBeCloseTo(1.0, 1);
      expect(mockMediaOriginal.audioBuffer!.duration).toBeCloseTo(1.0, 1);
      expect(mockMediaClone.name).toBe('Test Audio [Split]');
    });

    test('should update clone total time correctly', () => {
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaClone.totalTimeInMilSeconds).toBeCloseTo(1000, 0);
    });

    test('should update original total time correctly', () => {
      const splitTime = mockMediaOriginal.startTime + 1000;
      const originalDuration = mockMediaOriginal.totalTimeInMilSeconds;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaOriginal.totalTimeInMilSeconds).toBeCloseTo(originalDuration - 1000, 0);
    });

    test('should update original start time correctly', () => {
      const originalStartTime = mockMediaOriginal.startTime;
      const splitTime = originalStartTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaOriginal.startTime).toBe(originalStartTime + 1000);
    });

    test('should handle split at different positions', () => {
      const positions = [0.25, 0.5, 0.75];

      positions.forEach(position => {
        const media = new MockMedia();
        const clone = new MockMedia();
        media.audioBuffer = audioContext.createBuffer(2, 88200, 44100);
        media.playerAudioContext = audioContext;
        media.totalTimeInMilSeconds = media.audioBuffer.duration * 1000;
        media.startTime = 0;

        const splitTime = position * media.totalTimeInMilSeconds;

        audioSplitHandler.split(media, clone, splitTime);

        expect(clone.audioBuffer).not.toBeNull();
        expect(media.audioBuffer).not.toBeNull();
        expect(clone.audioBuffer!.duration + media.audioBuffer!.duration).toBeCloseTo(2.0, 1);
      });
    });

    test('should preserve audio channels count', () => {
      const multiChannelBuffer = audioContext.createBuffer(6, 88200, 44100);
      mockMediaOriginal.audioBuffer = multiChannelBuffer;
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaClone.audioBuffer!.numberOfChannels).toBe(6);
      expect(mockMediaOriginal.audioBuffer!.numberOfChannels).toBe(6);
    });

    test('should preserve sample rate', () => {
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaClone.audioBuffer!.sampleRate).toBe(44100);
      expect(mockMediaOriginal.audioBuffer!.sampleRate).toBe(44100);
    });

    test('should set clone name with [Split] suffix', () => {
      const splitTime = mockMediaOriginal.startTime + 1000;
      mockMediaOriginal.name = 'My Audio Track';

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaClone.name).toBe('My Audio Track [Split]');
    });
  });

  describe('validation', () => {
    test('should handle missing audioBuffer gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMediaOriginal.audioBuffer = null;
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'AudioMedia missing audioBuffer or playerAudioContext'
      );
      expect(mockMediaClone.audioBuffer).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    test('should handle missing playerAudioContext gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMediaOriginal.playerAudioContext = null;
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'AudioMedia missing audioBuffer or playerAudioContext'
      );
      expect(mockMediaClone.audioBuffer).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    test('should reject split time at or before start', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const splitTime = mockMediaOriginal.startTime;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Split time is outside mediaOriginal bounds'
      );
      expect(mockMediaClone.audioBuffer).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    test('should reject split time before start', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const splitTime = mockMediaOriginal.startTime - 100;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Split time is outside mediaOriginal bounds'
      );
      expect(mockMediaClone.audioBuffer).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    test('should reject split time at or after end', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const splitTime = mockMediaOriginal.startTime + mockMediaOriginal.totalTimeInMilSeconds;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Split time is outside mediaOriginal bounds'
      );
      expect(mockMediaClone.audioBuffer).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    test('should reject split time after end', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const splitTime = mockMediaOriginal.startTime + mockMediaOriginal.totalTimeInMilSeconds + 100;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Split time is outside mediaOriginal bounds'
      );
      expect(mockMediaClone.audioBuffer).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createAudioBufferSegment', () => {
    test('should handle segment creation failure', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidTime = mockMediaOriginal.startTime + 100000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, invalidTime);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('should log segment creation success', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created audio buffer segment')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    test('should handle very small first segment', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const splitTime = mockMediaOriginal.startTime + 10;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaClone.audioBuffer).not.toBeNull();
      expect(mockMediaClone.audioBuffer!.duration).toBeCloseTo(0.01, 2);

      consoleLogSpy.mockRestore();
    });

    test('should handle very small second segment', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const splitTime = mockMediaOriginal.startTime + mockMediaOriginal.totalTimeInMilSeconds - 10;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaOriginal.audioBuffer).not.toBeNull();
      expect(mockMediaOriginal.audioBuffer!.duration).toBeCloseTo(0.01, 2);

      consoleLogSpy.mockRestore();
    });

    test('should handle mono audio', () => {
      const monoBuffer = audioContext.createBuffer(1, 88200, 44100);
      mockMediaOriginal.audioBuffer = monoBuffer;
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaClone.audioBuffer!.numberOfChannels).toBe(1);
      expect(mockMediaOriginal.audioBuffer!.numberOfChannels).toBe(1);
    });

    test('should handle high sample rate audio', () => {
      const highSampleRateContext = new AudioContext({ sampleRate: 96000 });
      const highSampleBuffer = highSampleRateContext.createBuffer(2, 192000, 96000);
      mockMediaOriginal.audioBuffer = highSampleBuffer;
      mockMediaOriginal.playerAudioContext = highSampleRateContext;
      mockMediaOriginal.totalTimeInMilSeconds = 2000;
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaClone.audioBuffer!.sampleRate).toBe(96000);
      expect(mockMediaOriginal.audioBuffer!.sampleRate).toBe(96000);
    });

    test('should handle split at sample boundary', () => {
      const sampleDuration = 1 / mockAudioBuffer.sampleRate;
      const exactSampleTime = Math.floor(1000 / sampleDuration) * sampleDuration;
      const splitTime = mockMediaOriginal.startTime + exactSampleTime;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      expect(mockMediaClone.audioBuffer).not.toBeNull();
      expect(mockMediaOriginal.audioBuffer).not.toBeNull();
    });
  });

  describe('audio data integrity', () => {
    test('should preserve audio data in segments', () => {
      const originalData = mockAudioBuffer.getChannelData(0);
      const firstSamples = Array.from(originalData.slice(0, 100));
      const middleSamples = Array.from(originalData.slice(44100, 44200));

      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      const cloneData = mockMediaClone.audioBuffer!.getChannelData(0);
      const cloneFirstSamples = Array.from(cloneData.slice(0, 100));

      const originalNewData = mockMediaOriginal.audioBuffer!.getChannelData(0);
      const originalFirstSamples = Array.from(originalNewData.slice(0, 100));

      expect(cloneFirstSamples).toEqual(firstSamples);
      expect(originalFirstSamples).toEqual(middleSamples);
    });

    test('should handle all channels correctly', () => {
      const splitTime = mockMediaOriginal.startTime + 1000;

      audioSplitHandler.split(mockMediaOriginal, mockMediaClone, splitTime);

      for (let channel = 0; channel < mockMediaClone.audioBuffer!.numberOfChannels; channel++) {
        expect(mockMediaClone.audioBuffer!.getChannelData(channel)).toBeInstanceOf(Float32Array);
        expect(mockMediaClone.audioBuffer!.getChannelData(channel).length).toBeGreaterThan(0);
      }

      for (let channel = 0; channel < mockMediaOriginal.audioBuffer!.numberOfChannels; channel++) {
        expect(mockMediaOriginal.audioBuffer!.getChannelData(channel)).toBeInstanceOf(Float32Array);
        expect(mockMediaOriginal.audioBuffer!.getChannelData(channel).length).toBeGreaterThan(0);
      }
    });
  });

  describe('multiple splits', () => {
    test('should handle consecutive splits', () => {
      const media1 = new MockMedia();
      media1.audioBuffer = audioContext.createBuffer(2, 176400, 44100);
      media1.playerAudioContext = audioContext;
      media1.totalTimeInMilSeconds = 4000;
      media1.startTime = 0;

      const clone1 = new MockMedia();
      audioSplitHandler.split(media1, clone1, 1000);

      const clone2 = new MockMedia();
      audioSplitHandler.split(media1, clone2, media1.startTime + 1000);

      expect(clone1.audioBuffer).not.toBeNull();
      expect(clone2.audioBuffer).not.toBeNull();
      expect(media1.audioBuffer).not.toBeNull();
    });
  });
});

