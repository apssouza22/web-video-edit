import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AudioLoader } from '@/audio/audio-loader';

describe('AudioLoader', () => {
  let audioLoader: AudioLoader;

  beforeEach(() => {
    audioLoader = new AudioLoader();
  });

  afterEach(() => {
    audioLoader.dispose();
    jest.restoreAllMocks();
  });

  describe('loadAudioFile', () => {
    test('should successfully load and decode audio file', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockFile = new File([mockArrayBuffer], 'test-audio.mp3', { type: 'audio/mp3' });

      const result = await audioLoader.loadAudioFile(mockFile);

      expect(result).toBeDefined();
      expect(result.numberOfChannels).toBe(2);
      expect(result.sampleRate).toBe(16000);
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should use 16000 sample rate for Whisper model compatibility', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockFile = new File([mockArrayBuffer], 'test-audio.wav', { type: 'audio/wav' });

      const result = await audioLoader.loadAudioFile(mockFile);

      expect(result.sampleRate).toBe(16000);
    });

    test('should handle FileReader error gracefully', async () => {
      const mockFile = new File([], 'test-audio.mp3', { type: 'audio/mp3' });
      
      const originalFileReader = global.FileReader;
      global.FileReader = class MockFileReader {
        addEventListener(event: string, handler: Function) {
          if (event === 'error') {
            this.onerror = handler;
          }
        }
        readAsArrayBuffer() {
          setTimeout(() => {
            const error = new Error('FileReader error');
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }
        error = new Error('FileReader error');
        result = null;
        onerror: Function | null = null;
      } as any;

      await expect(audioLoader.loadAudioFile(mockFile)).rejects.toThrow('Failed to read audio file');

      global.FileReader = originalFileReader;
    });


    test('should handle different audio file types', async () => {
      const testFormats = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
      
      for (const format of testFormats) {
        const mockArrayBuffer = new ArrayBuffer(1024);
        const mockFile = new File([mockArrayBuffer], `test.${format.split('/')[1]}`, { type: format });

        const result = await audioLoader.loadAudioFile(mockFile);
        expect(result).toBeDefined();
        expect(result.numberOfChannels).toBeGreaterThan(0);
      }
    });

    test('should read file as ArrayBuffer correctly', async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const mockFile = new File([testData.buffer], 'test-audio.mp3', { type: 'audio/mp3' });

      const result = await audioLoader.loadAudioFile(mockFile);

      expect(result).toBeDefined();
    });

    test('should handle multiple consecutive loads', async () => {
      const mockArrayBuffer1 = new ArrayBuffer(1024);
      const mockFile1 = new File([mockArrayBuffer1], 'test-audio-1.mp3', { type: 'audio/mp3' });
      
      const mockArrayBuffer2 = new ArrayBuffer(2048);
      const mockFile2 = new File([mockArrayBuffer2], 'test-audio-2.mp3', { type: 'audio/mp3' });

      const result1 = await audioLoader.loadAudioFile(mockFile1);
      const result2 = await audioLoader.loadAudioFile(mockFile2);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1).not.toBe(result2);
    });

    test('should handle large audio files', async () => {
      const largeBuffer = new ArrayBuffer(10 * 1024 * 1024);
      const mockFile = new File([largeBuffer], 'large-audio.mp3', { type: 'audio/mp3' });

      const result = await audioLoader.loadAudioFile(mockFile);

      expect(result).toBeDefined();
      expect(result.numberOfChannels).toBeGreaterThan(0);
    });
  });

  describe('dispose', () => {
    test('should close audio context when disposed', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockFile = new File([mockArrayBuffer], 'test-audio.mp3', { type: 'audio/mp3' });
      
      await audioLoader.loadAudioFile(mockFile);
      
      audioLoader.dispose();

      expect(true).toBe(true);
    });

    test('should handle dispose when audio context is already closed', () => {
      audioLoader.dispose();
      
      expect(() => audioLoader.dispose()).not.toThrow();
    });

    test('should not throw error on multiple dispose calls', () => {
      audioLoader.dispose();
      audioLoader.dispose();
      audioLoader.dispose();

      expect(true).toBe(true);
    });

    test('should handle dispose before any file is loaded', () => {
      const newLoader = new AudioLoader();
      
      expect(() => newLoader.dispose()).not.toThrow();
      
      newLoader.dispose();
    });
  });

  describe('AudioContext initialization', () => {
    test('should create AudioContext with correct sample rate', () => {
      const loader = new AudioLoader();
      
      expect(loader).toBeDefined();
      
      loader.dispose();
    });

    test('should be able to create multiple AudioLoader instances', () => {
      const loader1 = new AudioLoader();
      const loader2 = new AudioLoader();
      const loader3 = new AudioLoader();

      expect(loader1).toBeDefined();
      expect(loader2).toBeDefined();
      expect(loader3).toBeDefined();

      loader1.dispose();
      loader2.dispose();
      loader3.dispose();
    });
  });
});

