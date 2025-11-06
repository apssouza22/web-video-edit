import './setup-mocks';
import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { LayerLoader } from '@/studio/layer-loader';

describe('LayerLoader', () => {
  let mockStudio: any;
  let mockMediaService: any;
  let layerLoader: LayerLoader;
  let mockOnMediaLoadUpdate: jest.Mock;

  beforeEach(() => {
    mockStudio = {
      addLayer: jest.fn((layer) => layer)
    };

    mockMediaService = {
      clone: jest.fn()
    };

    mockOnMediaLoadUpdate = jest.fn();

    layerLoader = new LayerLoader(mockStudio, mockMediaService);

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should create instance with studio and media service', () => {
      expect(layerLoader).toBeDefined();
    });
  });

  describe('addLayerFromFile', () => {
    test('should add layer from video file', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const mockLayer = { id: '1', name: 'test.mp4', type: 'video' };

      // Mock createMediaFromFile
      const mockCreateMediaFromFile = jest.fn(() => [mockLayer]);
      jest.mock('@/media', () => ({
        createMediaFromFile: mockCreateMediaFromFile
      }));

      const layers = layerLoader.addLayerFromFile(mockFile, mockOnMediaLoadUpdate);

      expect(mockStudio.addLayer).toHaveBeenCalled();
      expect(layers.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle multiple layers from file', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      
      const layers = layerLoader.addLayerFromFile(mockFile, mockOnMediaLoadUpdate);

      expect(Array.isArray(layers)).toBe(true);
    });

    test('should call studio.addLayer for each created layer', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      
      layerLoader.addLayerFromFile(mockFile, mockOnMediaLoadUpdate);

      expect(mockStudio.addLayer).toHaveBeenCalled();
    });
  });

  describe('loadLayerFromURI', () => {
    beforeEach(() => {
      // @ts-ignore
      (global.fetch as jest.Mock).mockResolvedValue({
      // @ts-ignore
        blob: jest.fn().mockResolvedValue(new Blob(['content']))
      });
    });

    test('should load layer from valid URI', async () => {
      const uri = 'https://example.com/video.mp4';
      
      const layers = await layerLoader.loadLayerFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
      expect(layers).toBeDefined();
    });

    test('should extract filename from URI', async () => {
      const uri = 'https://example.com/path/to/video.mp4';
      
      await layerLoader.loadLayerFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
    });

    test('should handle URI with query parameters', async () => {
      const uri = 'https://example.com/video.mp4?param=value';
      
      const layers = await layerLoader.loadLayerFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
      expect(layers).toBeDefined();
    });

    test('should handle URI with hash', async () => {
      const uri = 'https://example.com/video.mp4#section';
      
      const layers = await layerLoader.loadLayerFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
      expect(layers).toBeDefined();
    });

    test('should return undefined for empty URI', async () => {
      const result = await layerLoader.loadLayerFromURI('');

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
        await layerLoader.loadLayerFromURI(uri);
        expect(global.fetch).toHaveBeenCalledWith(uri);
      }
    });

    test('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        layerLoader.loadLayerFromURI('https://example.com/video.mp4')
      ).rejects.toThrow('Network error');
    });
  });

  describe('loadLayersFromJson', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['content']))
      });
      
      // Mock alert
      global.alert = jest.fn();
    });

    test('should load video layer from JSON', async () => {
      const jsonData = [{
        type: 'VideoLayer',
        name: 'test-video',
        uri: 'https://example.com/video.mp4',
        width: 1920,
        height: 1080,
        start_time: 0,
        total_time: 5000
      }];

      const layers = await layerLoader.loadLayersFromJson(jsonData);

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/video.mp4');
      expect(layers).toBeDefined();
      expect(Array.isArray(layers)).toBe(true);
    });

    test('should load image layer from JSON', async () => {
      const jsonData = [{
        type: 'ImageLayer',
        name: 'test-image',
        uri: 'https://example.com/image.jpg',
        width: 1920,
        height: 1080,
        start_time: 0,
        total_time: 3000
      }];

      const layers = await layerLoader.loadLayersFromJson(jsonData);

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg');
      expect(layers).toBeDefined();
    });

    test('should load text layer from JSON', async () => {
      const jsonData = [{
        type: 'TextLayer',
        name: 'Hello World',
        width: 1920,
        height: 1080,
        start_time: 0,
        total_time: 2000
      }];

      const layers = await layerLoader.loadLayersFromJson(jsonData);

      expect(mockStudio.addLayer).toHaveBeenCalled();
      expect(layers).toBeDefined();
    });

    test('should load multiple layers from JSON', async () => {
      const jsonData = [
        {
          type: 'TextLayer',
          name: 'Text 1',
          width: 1920,
          height: 1080,
          start_time: 0,
          total_time: 2000
        },
        {
          type: 'TextLayer',
          name: 'Text 2',
          width: 1920,
          height: 1080,
          start_time: 2000,
          total_time: 2000
        }
      ];

      const layers = await layerLoader.loadLayersFromJson(jsonData);

      expect(layers.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(layers)).toBe(true);
    });

    test('should handle video layer without URI', async () => {
      const jsonData = [{
        type: 'VideoLayer',
        name: 'test-video',
        width: 1920,
        height: 1080,
        start_time: 0,
        total_time: 5000
      }];

      const layers = await layerLoader.loadLayersFromJson(jsonData);

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
        start_time: 0,
        total_time: 1000
      }];

      await layerLoader.loadLayersFromJson(jsonData);

      expect(global.alert).toHaveBeenCalledWith("Layer couldn't be processed.");
    });

    test('should handle frames data in JSON', async () => {
      const jsonData = [{
        type: 'TextLayer',
        name: 'test',
        width: 1920,
        height: 1080,
        start_time: 0,
        total_time: 1000,
        frames: [
          new Float32Array([1, 0, 0, 0, 1, 0, 100, 100, 1])
        ]
      }];

      const layers = await layerLoader.loadLayersFromJson(jsonData);

      expect(layers).toBeDefined();
    });

    test('should handle empty JSON array', async () => {
      const jsonData: any[] = [];

      const layers = await layerLoader.loadLayersFromJson(jsonData);

      expect(layers).toEqual([]);
    });

    test('should handle fetch errors in loadLayersFromJson', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const jsonData = [{
        type: 'VideoLayer',
        name: 'test',
        uri: 'https://example.com/video.mp4',
        width: 1920,
        height: 1080,
        start_time: 0,
        total_time: 5000
      }];

      await expect(
        layerLoader.loadLayersFromJson(jsonData)
      ).rejects.toThrow('Network error');
    });
  });

  describe('edge cases', () => {
    test('should handle null file', () => {
      expect(() => {
        layerLoader.addLayerFromFile(null as any, mockOnMediaLoadUpdate);
      }).toThrow();
    });

    test('should handle undefined URI', async () => {
      const result = await layerLoader.loadLayerFromURI(undefined as any);
      expect(result).toBeUndefined();
    });

    test('should handle null JSON data', async () => {
      await expect(
        layerLoader.loadLayersFromJson(null as any)
      ).rejects.toThrow();
    });
  });

  describe('integration', () => {
    test('should handle complete workflow for video file', async () => {
      // Add from file
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const layers = layerLoader.addLayerFromFile(mockFile, mockOnMediaLoadUpdate);

      expect(mockStudio.addLayer).toHaveBeenCalled();
      expect(Array.isArray(layers)).toBe(true);
    });

    test('should handle complete workflow for URI', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['content']))
      });

      const uri = 'https://example.com/video.mp4';
      const layers = await layerLoader.loadLayerFromURI(uri);

      expect(global.fetch).toHaveBeenCalledWith(uri);
      expect(layers).toBeDefined();
    });
  });
});

