import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AudioCutter } from '@/audio/audio-cutter';

describe('AudioCutter', () => {
  let audioCutter: AudioCutter;
  let audioContext: AudioContext;
  let mockAudioBuffer: AudioBuffer;

  beforeEach(() => {
    audioCutter = new AudioCutter();
    audioContext = new AudioContext({ sampleRate: 44100 });
    mockAudioBuffer = audioContext.createBuffer(2, 88200, 44100);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('removeInterval', () => {
    test('should remove interval from audio buffer successfully', () => {
      const startTime = 0.5;
      const endTime = 1.0;
      const originalDuration = mockAudioBuffer.duration;

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.numberOfChannels).toBe(mockAudioBuffer.numberOfChannels);
      expect(result!.sampleRate).toBe(mockAudioBuffer.sampleRate);
      expect(result!.duration).toBeCloseTo(originalDuration - (endTime - startTime), 2);
    });

    test('should handle removal at the start of buffer', () => {
      const startTime = 0;
      const endTime = 0.5;
      const originalDuration = mockAudioBuffer.duration;

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.duration).toBeCloseTo(originalDuration - endTime, 2);
    });

    test('should handle removal at the end of buffer', () => {
      const originalDuration = mockAudioBuffer.duration;
      const startTime = originalDuration - 0.5;
      const endTime = originalDuration;

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.duration).toBeCloseTo(startTime, 2);
    });

    test('should handle removal in the middle of buffer', () => {
      const startTime = 0.5;
      const endTime = 1.0;
      const originalDuration = mockAudioBuffer.duration;

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.duration).toBeCloseTo(originalDuration - (endTime - startTime), 2);
    });

    test('should preserve audio data before and after removed interval', () => {
      const startTime = 0.5;
      const endTime = 1.0;

      const originalFirstChannelData = mockAudioBuffer.getChannelData(0);
      const beforeRemoval = Array.from(originalFirstChannelData.slice(0, 100));
      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      
      const resultFirstChannelData = result!.getChannelData(0);
      const resultBefore = Array.from(resultFirstChannelData.slice(0, 100));
      expect(resultBefore).toEqual(beforeRemoval);
    });

    test('should handle multi-channel audio correctly', () => {
      const multiChannelBuffer = audioContext.createBuffer(6, 88200, 44100);
      const startTime = 0.5;
      const endTime = 1.0;

      const result = audioCutter.removeInterval(multiChannelBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.numberOfChannels).toBe(6);
      
      for (let channel = 0; channel < 6; channel++) {
        expect(result!.getChannelData(channel)).toBeInstanceOf(Float32Array);
      }
    });


    test('should return small buffer when removing entire audio', () => {
      // @ts-ignore
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const startTime = 0;
      const endTime = mockAudioBuffer.duration + 1;

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Removing interval would result in empty audio buffer'
      );

      consoleWarnSpy.mockRestore();
    });

    test('should log success message on successful removal', () => {
      // @ts-ignore
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const startTime = 0.5;
      const endTime = 1.0;

      audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed audio interval')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('validation', () => {
    test('should return null when audio buffer is not provided', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = audioCutter.removeInterval(null as any, audioContext, 0.5, 1.0);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('AudioCutter: No audio buffer provided');

      consoleErrorSpy.mockRestore();
    });

    test('should return null when audio context is not provided', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = audioCutter.removeInterval(mockAudioBuffer, null as any, 0.5, 1.0);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('AudioCutter: No audio context provided');

      consoleErrorSpy.mockRestore();
    });

    test('should return null when startTime is greater than or equal to endTime', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, 1.5, 1.0);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'AudioCutter: Invalid parameters for removeInterval - startTime:',
        1.5,
        'endTime:',
        1.0
      );

      consoleErrorSpy.mockRestore();
    });

    test('should return null when startTime equals endTime', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, 1.0, 1.0);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'AudioCutter: Invalid parameters for removeInterval - startTime:',
        1.0,
        'endTime:',
        1.0
      );

      consoleErrorSpy.mockRestore();
    });

    test('should return null when startTime is negative', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, -0.5, 1.0);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'AudioCutter: Invalid parameters for removeInterval - startTime:',
        -0.5,
        'endTime:',
        1.0
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    test('should handle very small intervals', () => {
      const startTime = 0.5;
      const endTime = 0.501;

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.duration).toBeCloseTo(mockAudioBuffer.duration - 0.001, 2);
    });

    test('should handle intervals at sample boundaries', () => {
      const sampleDuration = 1 / mockAudioBuffer.sampleRate;
      const startTime = sampleDuration * 1000;
      const endTime = sampleDuration * 2000;

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(mockAudioBuffer.length - 1000);
    });

    test('should handle mono audio correctly', () => {
      const monoBuffer = audioContext.createBuffer(1, 88200, 44100);
      const startTime = 0.5;
      const endTime = 1.0;

      const result = audioCutter.removeInterval(monoBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.numberOfChannels).toBe(1);
    });

    test('should handle removal of entire middle section', () => {
      const startTime = 0.1;
      const endTime = mockAudioBuffer.duration - 0.1;

      const result = audioCutter.removeInterval(mockAudioBuffer, audioContext, startTime, endTime);

      expect(result).not.toBeNull();
      expect(result!.duration).toBeCloseTo(0.2, 2);
    });
  });
});

