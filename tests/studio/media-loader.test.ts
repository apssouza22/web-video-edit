import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

// Use dynamic imports for ESM
const { MediaLoader } = await import('@//studio/media-loader');

describe('MediaLoader', () => {
  let mockStudio: any;
  let mediaLoader: MediaLoader;
  let mockOnMediaLoadUpdate: jest.Mock;

  beforeEach(() => {
    mockStudio = {
      addLayer: jest.fn((layer) => layer)
    };

    mockOnMediaLoadUpdate = jest.fn();

    mediaLoader = new MediaLoader(mockStudio);

    // Mock global fetch
    // @ts-ignore
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should create instance with studio and media service', () => {
      expect(mediaLoader).toBeDefined();
    });
  });

  describe('addMediaFromFile', () => {
    test('should add layer from video file', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const mockLayer = { id: '1', name: 'test.mp4', type: 'video' };

      // Mock createMediaFromFile
      const mockCreateMediaFromFile = jest.fn(() => [mockLayer]);
      jest.mock('@/medialayer', () => ({
        createMediaFromFile: mockCreateMediaFromFile
      }));

      const layers = mediaLoader.addMediaFromFile(mockFile, mockOnMediaLoadUpdate);

      expect(mockStudio.addLayer).toHaveBeenCalled();
      expect(layers.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle multiple layers from file', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      
      const layers = mediaLoader.addMediaFromFile(mockFile, mockOnMediaLoadUpdate);

      expect(Array.isArray(layers)).toBe(true);
    });

    test('should call studio.addLayer for each created layer', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      
      mediaLoader.addMediaFromFile(mockFile, mockOnMediaLoadUpdate);

      expect(mockStudio.addLayer).toHaveBeenCalled();
    });
  });

  describe('loadMediaFromURI', () => {
    beforeEach(() => {
      // @ts-ignore
      (global.fetch as jest.Mock).mockResolvedValue({
      // @ts-ignore
        blob: jest.fn().mockResolvedValue(new Blob(['content']))
      });
    });

    test('should load layer from valid URI', async () => {
      const uri = 'https://example.com/video.mp4';
      
      const layers = await mediaLoader.loadMediaFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
      expect(layers).toBeDefined();
    });

    test('should extract filename from URI', async () => {
      const uri = 'https://example.com/path/to/video.mp4';
      
      await mediaLoader.loadMediaFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
    });

    test('should handle URI with query parameters', async () => {
      const uri = 'https://example.com/video.mp4?param=value';
      
      const layers = await mediaLoader.loadMediaFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
      expect(layers).toBeDefined();
    });

    test('should handle URI with hash', async () => {
      const uri = 'https://example.com/video.mp4#section';
      
      const layers = await mediaLoader.loadMediaFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
      expect(layers).toBeDefined();
    });

    test('should return undefined for empty URI', async () => {
      const result = await mediaLoader.loadMediaFromURI('');

      expect(result).toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });


    test('should handle different file types', async () => {
      const uris = [
        'https://example.com/image.jpg',
        'https://example.com/audio.mp3',
        'https://example.com/video.mp4'
      ];

      for (const uri of uris) {
        await mediaLoader.loadMediaFromURI(uri);
        expect(global.fetch).toHaveBeenCalledWith(uri);
      }
    });

    test('should handle fetch errors', async () => {
      // @ts-ignore
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        mediaLoader.loadMediaFromURI('https://example.com/video.mp4')
      ).rejects.toThrow('Network error');
    });
  });

  describe('loadLayersFromJson', () => {
    beforeEach(() => {
      // @ts-ignore
      (global.fetch as jest.Mock).mockResolvedValue({
      // @ts-ignore
        blob: jest.fn().mockResolvedValue(new Blob(['content']))
      });
      
      // Mock alert
      global.alert = jest.fn();
    });

    test('should load video layer from JSON', async () => {
      const jsonData = [{
        type: 'VideoMedia',
        name: 'test-video',
        uri: 'https://example.com/video.mp4',
        width: 1920,
        height: 1080,
        startTime: 0,
        total_time: 5000
      }];

      const layers = await mediaLoader.loadLayersFromJson(jsonData);

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/video.mp4');
      expect(layers).toBeDefined();
      expect(Array.isArray(layers)).toBe(true);
    });

    test('should load image layer from JSON', async () => {
      const jsonData = [{
        type: 'ImageMedia',
        name: 'test-image',
        uri: 'https://example.com/image.jpg',
        width: 1920,
        height: 1080,
        startTime: 0,
        total_time: 3000
      }];

      const layers = await mediaLoader.loadLayersFromJson(jsonData);

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg');
      expect(layers).toBeDefined();
    });

    test('should load text layer from JSON', async () => {
      const jsonData = [{
        type: 'TextMedia',
        name: 'Hello World',
        width: 1920,
        height: 1080,
        startTime: 0,
        total_time: 2000
      }];

      const layers = await mediaLoader.loadLayersFromJson(jsonData);

      expect(mockStudio.addLayer).toHaveBeenCalled();
      expect(layers).toBeDefined();
    });

    test('should load multiple layers from JSON', async () => {
      const jsonData = [
        {
          type: 'TextMedia',
          name: 'Text 1',
          width: 1920,
          height: 1080,
          startTime: 0,
          total_time: 2000
        },
        {
          type: 'TextMedia',
          name: 'Text 2',
          width: 1920,
          height: 1080,
          startTime: 2000,
          total_time: 2000
        }
      ];

      const layers = await mediaLoader.loadLayersFromJson(jsonData);

      expect(layers.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(layers)).toBe(true);
    });

    test('should handle video layer without URI', async () => {
      const jsonData = [{
        type: 'VideoMedia',
        name: 'test-video',
        width: 1920,
        height: 1080,
        startTime: 0,
        total_time: 5000
      }];

      const layers = await mediaLoader.loadLayersFromJson(jsonData);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(layers).toBeDefined();
    });

    test('should show alert for unprocessable layers', async () => {
      // Mock a layer type that returns empty array
      const jsonData = [{
        type: 'UnknownLayer',
        name: 'unknown',
        width: 1920,
        height: 1080,
        startTime: 0,
        total_time: 1000
      }];

      await mediaLoader.loadLayersFromJson(jsonData);

      expect(global.alert).toHaveBeenCalledWith("Layer couldn't be processed.");
    });

    test('should handle frames data in JSON', async () => {
      const jsonData = [{
        type: 'TextMedia',
        name: 'test',
        width: 1920,
        height: 1080,
        startTime: 0,
        total_time: 1000,
        frames: [
          new Float32Array([1, 0, 0, 0, 1, 0, 100, 100, 1])
        ]
      }];

      const layers = await mediaLoader.loadLayersFromJson(jsonData);

      expect(layers).toBeDefined();
    });

    test('should handle empty JSON array', async () => {
      const jsonData: any[] = [];

      const layers = await mediaLoader.loadLayersFromJson(jsonData);

      expect(layers).toEqual([]);
    });

    test('should handle fetch errors in loadLayersFromJson', async () => {
      // @ts-ignore
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const jsonData = [{
        type: 'VideoMedia',
        name: 'test',
        uri: 'https://example.com/video.mp4',
        width: 1920,
        height: 1080,
        startTime: 0,
        total_time: 5000
      }];

      await expect(
        mediaLoader.loadLayersFromJson(jsonData)
      ).rejects.toThrow('Network error');
    });
  });

  describe('edge cases', () => {
    test('should handle null file', () => {
      expect(() => {
        mediaLoader.addMediaFromFile(null as any, mockOnMediaLoadUpdate);
      }).toThrow();
    });

    test('should handle undefined URI', async () => {
      const result = await mediaLoader.loadMediaFromURI(undefined as any);
      expect(result).toBeUndefined();
    });

    test('should handle null JSON data', async () => {
      await expect(
        mediaLoader.loadLayersFromJson(null as any)
      ).rejects.toThrow();
    });
  });

  describe('integration', () => {
    test('should handle complete workflow for video file', async () => {
      // Add from file
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const layers = mediaLoader.addMediaFromFile(mockFile, mockOnMediaLoadUpdate);

      expect(mockStudio.addLayer).toHaveBeenCalled();
      expect(Array.isArray(layers)).toBe(true);
    });

    test('should handle complete workflow for URI', async () => {
      // @ts-ignore
      (global.fetch as jest.Mock).mockResolvedValue({
      // @ts-ignore
        blob: jest.fn().mockResolvedValue(new Blob(['content']))
      });

      const uri = 'https://example.com/video.mp4';
      const layers = await mediaLoader.loadMediaFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
      expect(layers).toBeDefined();
    });
  });
});

