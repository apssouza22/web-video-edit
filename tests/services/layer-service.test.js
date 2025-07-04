import { LayerService } from '../../assets/js/layer/operations.js';
import { MockVideoLayer, MockAudioLayer, MockImageLayer, MockTextLayer } from '../mocks/layer-mocks.js';
import { mockFn } from '../utils/mock-fn.js';

describe('LayerService', () => {
  let layerService;
  let mockOnLayerLoadUpdate;

  beforeEach(() => {
    mockOnLayerLoadUpdate = mockFn();
    layerService = new LayerService(mockOnLayerLoadUpdate);
  });

  afterEach(() => {
    // Reset mock calls
    mockOnLayerLoadUpdate.mockReset();
  });

  describe('constructor', () => {
    test('should create instance with onLayerLoadUpdate callback', () => {
      expect(layerService).toBeInstanceOf(LayerService);
      expect(layerService.onLayerLoadUpdate).toBe(mockOnLayerLoadUpdate);
    });

    test('should handle null callback', () => {
      const serviceWithNullCallback = new LayerService(null);
      expect(serviceWithNullCallback.onLayerLoadUpdate).toBe(null);
    });
  });

  describe('clone - VideoLayer', () => {
    test('should successfully clone a ready VideoLayer', () => {
      const mockFile = { name: 'test-video.mp4', type: 'video/mp4' };
      const originalLayer = new MockVideoLayer(mockFile);
      originalLayer.ready = true;
      originalLayer.id = 'video-layer-1';
      originalLayer.start_time = 1000;
      originalLayer.color = '#ff0000';
      originalLayer.shadow = true;
      originalLayer.totalTimeInMilSeconds = 10000;
      originalLayer.width = 1280;
      originalLayer.height = 720;

      const clonedLayer = layerService.clone(originalLayer);

      expect(clonedLayer).toBeInstanceOf(MockVideoLayer);
      expect(clonedLayer.name).toBe('test-video.mp4 [Clone]');
      expect(clonedLayer.id).toBe('video-layer-1-clone');
      expect(clonedLayer.start_time).toBe(1100); // 100ms offset
      expect(clonedLayer.color).toBe('#ff0000');
      expect(clonedLayer.shadow).toBe(true);
      expect(clonedLayer.totalTimeInMilSeconds).toBe(10000);
      expect(clonedLayer.width).toBe(1280);
      expect(clonedLayer.height).toBe(720);
      expect(clonedLayer.ready).toBe(true);
    });

    test('should not clone VideoLayer that is not ready', () => {
      const mockFile = { name: 'test-video.mp4', type: 'video/mp4' };
      const originalLayer = new MockVideoLayer(mockFile);
      originalLayer.ready = false;

      const consoleSpy = mockFn();
      const clonedLayer = layerService.clone(originalLayer);

      expect(clonedLayer).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Cannot clone VideoLayer that is not ready');
      
      consoleSpy.mockReset();
    });

    test('should copy frames collection from original VideoLayer', () => {
      const mockFile = { name: 'test-video.mp4', type: 'video/mp4' };
      const originalLayer = new MockVideoLayer(mockFile);
      originalLayer.ready = true;
      originalLayer.framesCollection.frames = [
        new Float32Array([1, 2, 3, 4, 5]),
        new Float32Array([6, 7, 8, 9, 10])
      ];

      const clonedLayer = layerService.clone(originalLayer);

      expect(clonedLayer.framesCollection.frames).toEqual(originalLayer.framesCollection.frames);
      expect(clonedLayer.framesCollection.frames).not.toBe(originalLayer.framesCollection.frames);
    });
  });

  describe('clone - AudioLayer', () => {
    test('should successfully clone a ready AudioLayer', () => {
      const mockFile = { name: 'test-audio.mp3', type: 'audio/mp3' };
      const originalLayer = new MockAudioLayer(mockFile);
      originalLayer.ready = true;
      originalLayer.id = 'audio-layer-1';
      originalLayer.start_time = 2000;
      originalLayer.playerAudioContext = { sampleRate: 44100 };

      const clonedLayer = layerService.clone(originalLayer);

      expect(clonedLayer).toBeInstanceOf(MockAudioLayer);
      expect(clonedLayer.name).toBe('test-audio.mp3 [Clone]');
      expect(clonedLayer.id).toBe('audio-layer-1-clone');
      expect(clonedLayer.start_time).toBe(2100); // 100ms offset
      expect(clonedLayer.playerAudioContext).toBe(originalLayer.playerAudioContext);
      expect(clonedLayer.audioBuffer).toBe(originalLayer.audioBuffer);
      expect(clonedLayer.ready).toBe(true);
    });

    test('should preserve audio buffer in cloned AudioLayer', () => {
      const mockFile = { name: 'test-audio.mp3', type: 'audio/mp3' };
      const originalLayer = new MockAudioLayer(mockFile);
      originalLayer.ready = true;
      const mockAudioBuffer = {
        length: 2048,
        sampleRate: 48000,
        numberOfChannels: 2,
        getChannelData: mockFn(() => new Float32Array(2048))
      };
      originalLayer.audioBuffer = mockAudioBuffer;

      const clonedLayer = layerService.clone(originalLayer);

      expect(clonedLayer.audioBuffer).toBe(mockAudioBuffer);
    });
  });

  describe('clone - ImageLayer', () => {
    test('should successfully clone an ImageLayer', () => {
      const mockFile = { name: 'test-image.jpg', type: 'image/jpeg' };
      const originalLayer = new MockImageLayer(mockFile);
      originalLayer.ready = true;
      originalLayer.id = 'image-layer-1';
      originalLayer.start_time = 3000;

      const clonedLayer = layerService.clone(originalLayer);

      expect(clonedLayer).toBeInstanceOf(MockImageLayer);
      expect(clonedLayer.name).toBe('test-image.jpg [Clone]');
      expect(clonedLayer.id).toBe('image-layer-1-clone');
      expect(clonedLayer.start_time).toBe(3100); // 100ms offset
      expect(clonedLayer.ready).toBe(true);
    });
  });

  describe('clone - TextLayer', () => {
    test('should successfully clone a TextLayer', () => {
      const originalLayer = new MockTextLayer('Custom Text');
      originalLayer.ready = true;
      originalLayer.id = 'text-layer-1';
      originalLayer.start_time = 4000;

      const clonedLayer = layerService.clone(originalLayer);

      expect(clonedLayer).toBeInstanceOf(MockTextLayer);
      expect(clonedLayer.name).toBe('Custom Text [Clone]');
      expect(clonedLayer.id).toBe('text-layer-1-clone');
      expect(clonedLayer.start_time).toBe(4100); // 100ms offset
      expect(clonedLayer.ready).toBe(true);
    });
  });

  describe('clone - Error handling', () => {
    test('should return null for unknown layer type', () => {
      const unknownLayer = {
        ready: true,
        constructor: { name: 'UnknownLayer' },
        start_time: 1000,
        id: 'unknown-1',
        name: 'Unknown Layer'
      };

      const consoleSpy = mockFn();
      const clonedLayer = layerService.clone(unknownLayer);

      expect(clonedLayer).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Cannot clone layer of type:', 'UnknownLayer');
      
      consoleSpy.mockReset();
    });

    test('should handle layer without constructor name', () => {
      const layerWithoutConstructor = {
        ready: true,
        start_time: 1000,
        id: 'no-constructor-1',
        name: 'No Constructor Layer'
      };

      const consoleSpy = mockFn();
      const clonedLayer = layerService.clone(layerWithoutConstructor);

      expect(clonedLayer).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockReset();
    });
  });

  describe('clone - Load update listener', () => {
    test('should add load update listener to cloned layer', () => {
      const mockFile = { name: 'test-video.mp4', type: 'video/mp4' };
      const originalLayer = new MockVideoLayer(mockFile);
      originalLayer.ready = true;

      const clonedLayer = layerService.clone(originalLayer);

      expect(clonedLayer.loadUpdateListener).toHaveBeenCalledWith(
        clonedLayer,
        100,
        clonedLayer.ctx,
        clonedLayer.audioBuffer
      );
    });

    test('should call onLayerLoadUpdate when cloned layer updates', () => {
      const mockFile = { name: 'test-video.mp4', type: 'video/mp4' };
      const originalLayer = new MockVideoLayer(mockFile);
      originalLayer.ready = true;

      const clonedLayer = layerService.clone(originalLayer);

      // Simulate the load update listener being called
      const mockProgress = 75;
      const mockCtx = {};
      const mockAudioBuffer = {};
      
      // The addLoadUpdateListener should have been called with a function
      // that calls this.onLayerLoadUpdate
      expect(clonedLayer.addLoadUpdateListener).toHaveBeenCalled();
      
      // Get the callback that was passed to addLoadUpdateListener
      const callback = clonedLayer.addLoadUpdateListener.mock.calls[0][0];
      callback(clonedLayer, mockProgress, mockCtx, mockAudioBuffer);

      expect(mockOnLayerLoadUpdate).toHaveBeenCalledWith(
        clonedLayer,
        mockProgress,
        mockCtx,
        mockAudioBuffer
      );
    });
  });

  describe('integration tests', () => {
    test('should clone multiple different layer types', () => {
      const videoFile = { name: 'video.mp4', type: 'video/mp4' };
      const audioFile = { name: 'audio.mp3', type: 'audio/mp3' };
      const imageFile = { name: 'image.jpg', type: 'image/jpeg' };

      const videoLayer = new MockVideoLayer(videoFile);
      const audioLayer = new MockAudioLayer(audioFile);
      const imageLayer = new MockImageLayer(imageFile);
      const textLayer = new MockTextLayer('Test Text');

      // Make all layers ready
      [videoLayer, audioLayer, imageLayer, textLayer].forEach(layer => {
        layer.ready = true;
        layer.start_time = 1000;
      });

      const clonedVideo = layerService.clone(videoLayer);
      const clonedAudio = layerService.clone(audioLayer);
      const clonedImage = layerService.clone(imageLayer);
      const clonedText = layerService.clone(textLayer);

      expect(clonedVideo).toBeInstanceOf(MockVideoLayer);
      expect(clonedAudio).toBeInstanceOf(MockAudioLayer);
      expect(clonedImage).toBeInstanceOf(MockImageLayer);
      expect(clonedText).toBeInstanceOf(MockTextLayer);

      // All should have offset start times
      expect(clonedVideo.start_time).toBe(1100);
      expect(clonedAudio.start_time).toBe(1100);
      expect(clonedImage.start_time).toBe(1100);
      expect(clonedText.start_time).toBe(1100);
    });

    test('should maintain layer properties after cloning', () => {
      const mockFile = { name: 'complex-video.mp4', type: 'video/mp4' };
      const originalLayer = new MockVideoLayer(mockFile);
      
      // Set up complex layer state
      originalLayer.ready = true;
      originalLayer.start_time = 5000;
      originalLayer.color = '#123456';
      originalLayer.shadow = true;
      originalLayer.totalTimeInMilSeconds = 15000;
      originalLayer.width = 1920;
      originalLayer.height = 1080;
      originalLayer.canvas.width = 1920;
      originalLayer.canvas.height = 1080;
      originalLayer.framesCollection.frames = [
        new Float32Array([10, 20, 1.5, 0.5, 1]),
        new Float32Array([30, 40, 2.0, 1.0, 0])
      ];

      const clonedLayer = layerService.clone(originalLayer);

      // Verify all properties are correctly copied
      expect(clonedLayer.color).toBe('#123456');
      expect(clonedLayer.shadow).toBe(true);
      expect(clonedLayer.totalTimeInMilSeconds).toBe(15000);
      expect(clonedLayer.width).toBe(1920);
      expect(clonedLayer.height).toBe(1080);
      expect(clonedLayer.canvas.width).toBe(1920);
      expect(clonedLayer.canvas.height).toBe(1080);
      expect(clonedLayer.framesCollection.frames).toHaveLength(2);
      expect(clonedLayer.ready).toBe(true);
    });
  });
});
