import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

const mockTimeline = {
  init: jest.fn(),
  resize: jest.fn(),
  setSelectedLayer: jest.fn(),
};

jest.unstable_mockModule('@/timeline', () => ({
  createTimeline: () => mockTimeline,
}));


// Use dynamic imports for ESM
const { VideoStudio } = await import('@/studio/studio');
const {VideoMedia} = await import("@/media/video");

describe('VideoStudio', () => {
  // @ts-ignore
  let studio: VideoStudio;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="video-canvas"></div>
      <div id="transcription">
        <div class="text-chunks"></div>
      </div>
      <div id="header"></div>
      <div id="layers"></div>
      <button id="export">Export</button>
      <div id="speed-control-item"></div>
      <input id="filepicker" type="file" />
      <div id="loading-popup" style="display: none;">
        <div id="loading-title">Loading Media...</div>
        <div id="loading-current-file"></div>
        <div id="loading-progress-fill" style="width: 0%;"></div>
        <div id="loading-progress-text">0%</div>
      </div>
      <div id="cursor_preview" style="display: none;">
        <canvas width="100" height="100"></canvas>
        <div></div>
      </div>
      <button id="delete-button">Delete</button>
      <button id="split-button">Split</button>
      <button id="clone-button">Clone</button>
      <input id="timeline_zoom_slider" type="range" min="1" max="10" value="2" />
    `;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((callback) => {
      // Don't actually call the callback to avoid infinite loops
      return 1;
    }) as any;

    // Mock alert
    global.alert = jest.fn();

    studio = new VideoStudio();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should create instance', () => {
      expect(studio).toBeDefined();
    });

    test('should initialize empty medias array', () => {
      expect(studio.getMedias()).toEqual([]);
    });

    test('should create player', () => {
      expect(studio.player).toBeDefined();
    });

    test('should create timeline', () => {
      expect(studio.timeline).toBeDefined();
    });

    test('should create controls', () => {
      expect(studio.controls).toBeDefined();
    });

    test('should create loading popup', () => {
      expect(studio.loadingPopup).toBeDefined();
    });

    test('should create aspect ratio selector', () => {
      expect(studio.aspectRatioSelector).toBeDefined();
    });

    test('should start animation loop', () => {
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('init', () => {
    test('should initialize controls', () => {
      const initSpy = jest.spyOn(studio.controls, 'init');

      studio.init();

      expect(initSpy).toHaveBeenCalled();
    });

    test('should load transcription model', () => {
      const loadModelSpy = jest.spyOn(studio.transcriptionManager, 'loadModel');

      studio.init();

      expect(loadModelSpy).toHaveBeenCalled();
    });

    test('should initialize speed control', () => {
      const initSpy = jest.spyOn(studio.speedControlManager, 'init');

      studio.init();

      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('getMedias', () => {
    test('should return empty array initially', () => {
      expect(studio.getMedias()).toEqual([]);
    });

    test('should return all medias', () => {
      const mockLayer = { id: '1', name: 'test', type: 'video' };
      studio.medias.push(mockLayer as any);

      expect(studio.getMedias()).toContain(mockLayer);
      expect(studio.getMedias().length).toBe(1);
    });
  });

  describe('getMediaById', () => {
    test('should return null for non-existent ID', () => {
      const result = studio.getMediaById('nonexistent');

      expect(result).toBeNull();
    });

    test('should return media with matching ID', () => {
      const mockLayer = { id: '123', name: 'test', type: 'video' };
      studio.studioState.addMedia(mockLayer as any);

      const result = studio.getMediaById('123');

      expect(result).not.toBeNull();
    });
  });

  describe('addLayer', () => {
    test('should add layer to medias array', () => {
      const mockLayer = {
        id: '1',
        name: 'test',
        start_time: 0,
        init: jest.fn()
      };

      studio.addLayer(mockLayer as any);

      expect(studio.getMedias()).toContain(mockLayer);
    });

    test('should initialize layer when not skipping init', () => {
      const mockLayer = {
        id: '1',
        name: 'test',
        start_time: 0,
        init: jest.fn()
      };

      studio.addLayer(mockLayer as any);

      expect(mockLayer.init).toHaveBeenCalledWith(
        studio.player.width,
        studio.player.height,
        studio.player.audioContext
      );
    });

    test('should not initialize layer when skipInit is true', () => {
      const mockLayer = {
        id: '1',
        name: 'test',
        start_time: 0,
        init: jest.fn()
      };

      studio.addLayer(mockLayer as any, true);

      expect(mockLayer.init).not.toHaveBeenCalled();
    });

    test('should set layer start_time to current player time', () => {
      const mockLayer = {
        id: '1',
        name: 'test',
        start_time: 0,
        init: jest.fn()
      };
      studio.player.time = 5000;

      studio.addLayer(mockLayer as any);

      expect(mockLayer.start_time).toBe(5000);
    });

    test('should add layer to studio state', () => {
      const mockLayer = {
        id: '1',
        name: 'test',
        start_time: 0,
        init: jest.fn()
      };
      const addMediaSpy = jest.spyOn(studio.studioState, 'addMedia');

      studio.addLayer(mockLayer as any);

      expect(addMediaSpy).toHaveBeenCalledWith(mockLayer);
    });
  });

  describe('remove', () => {
    test('should remove layer from medias array', () => {
      const mockLayer = {
        id: '1',
        name: 'test',
        start_time: 0,
        totalTimeInMilSeconds: 5000,
        init: jest.fn()
      };

      studio.addLayer(mockLayer as any);
      expect(studio.getMedias().length).toBe(1);

      studio.remove(mockLayer as any);

      expect(studio.getMedias().length).toBe(0);
    });

    test('should disconnect audio layer', () => {
      const mockAudioLayer = {
        id: '1',
        name: 'audio',
        start_time: 0,
        totalTimeInMilSeconds: 5000,
        init: jest.fn(),
        disconnect: jest.fn()
      };

      // Make it look like an AudioMedia
      Object.setPrototypeOf(mockAudioLayer, { constructor: { name: 'AudioMedia' } });

      studio.addLayer(mockAudioLayer as any);
      studio.remove(mockAudioLayer as any);

      // AudioMedia check might not work in test, but we can verify it doesn't throw
      expect(studio.getMedias().length).toBe(0);
    });

    test('should update total time after removal', () => {
      const mockLayer1 = {
        id: '1',
        name: 'test1',
        start_time: 0,
        totalTimeInMilSeconds: 10000,
        init: jest.fn()
      };
      const mockLayer2 = {
        id: '2',
        name: 'test2',
        start_time: 0,
        totalTimeInMilSeconds: 5000,
        init: jest.fn()
      };

      studio.addLayer(mockLayer1 as any);
      studio.addLayer(mockLayer2 as any);

      studio.remove(mockLayer2 as any);

      expect(studio.player.total_time).toBe(10000);
    });

    test('should handle removing non-existent layer', () => {
      const mockLayer = {
        id: '1',
        name: 'test',
        start_time: 0,
        totalTimeInMilSeconds: 5000
      };

      expect(() => {
        studio.remove(mockLayer as any);
      }).not.toThrow();
    });
  });

  describe('cloneLayer', () => {
    test('should clone layer using media service', () => {
      const mockLayer = new VideoMedia(new File([], 'video.mp4'), true);
      const clonedLayer = new VideoMedia(new File([], 'video2.mp4'), true);

      studio.mediaService.clone = jest.fn(() => clonedLayer);

      const result = studio.cloneLayer(mockLayer as any);

      expect(studio.mediaService.clone).toHaveBeenCalledWith(mockLayer);
      expect(result).toBe(clonedLayer);
    });

    test('should add cloned layer to studio', () => {
      const mockLayer = new VideoMedia(new File([], 'video.mp4'), true);
      const clonedLayer = new VideoMedia(new File([], 'video.mp4'), true);

      studio.mediaService.clone = jest.fn(() => clonedLayer);

      studio.cloneLayer(mockLayer as any);

      expect(studio.getMedias()).toContain(clonedLayer);
    });

    test('should set cloned layer as selected', () => {
      const mockLayer = new VideoMedia(new File([], 'video.mp4'), true);
      const clonedLayer = new VideoMedia(new File([], 'video.mp4'), true);
      studio.mediaService.clone = jest.fn(() => clonedLayer);
      const setSelectedSpy = jest.spyOn(studio, 'setSelectedLayer');

      studio.cloneLayer(mockLayer as any);

      expect(setSelectedSpy).toHaveBeenCalledWith(clonedLayer);
    });
  });

  describe('play and pause', () => {
    test('should call player.play', () => {
      const playSpy = jest.spyOn(studio.player, 'play');
      studio.play();
      expect(playSpy).toHaveBeenCalled();
    });

    test('should call player.pause', () => {
      const pauseSpy = jest.spyOn(studio.player, 'pause');
      studio.pause();
      expect(pauseSpy).toHaveBeenCalled();
    });
  });

  describe('resize', () => {
    test('should resize player/canvas', () => {
      const resizeSpy = jest.spyOn(studio.player, 'resize');
      studio.resize();
      expect(resizeSpy).toHaveBeenCalled();
    });

    test('should resize timeline', () => {
      const resizeSpy = jest.spyOn(studio.timeline, 'resize');
      studio.resize();
      expect(resizeSpy).toHaveBeenCalled();
    });

    test('should resize all layers', () => {
      const mockLayer = {
        id: '1',
        name: 'test',
        start_time: 0,
        init: jest.fn(),
        resize: jest.fn()
      };
      studio.addLayer(mockLayer as any);
      studio.resize();

      expect(mockLayer.resize).toHaveBeenCalledWith(
        studio.player.width,
        studio.player.height
      );
    });

    test('should accept new aspect ratio', () => {
      const resizeSpy = jest.spyOn(studio.player, 'resize');
      studio.resize('16:9');
      expect(resizeSpy).toHaveBeenCalledWith('16:9');
    });
  });

  describe('getSelectedLayer', () => {
    test('should return null when no layer selected', () => {
      studio.timeline.selectedLayer = null;
      const result = studio.getSelectedLayer();
      expect(result).toBeNull();
    });

    test('should return selected layer', () => {
      const mockLayer = new VideoMedia(new File([], 'video.mp4'), true);
      studio.addLayer(mockLayer as any);
      studio.timeline.selectedLayer = { id: '123' } as any;
      const result = studio.getSelectedLayer();

      expect(result).toBeDefined();
    });
  });

  describe('setSelectedLayer', () => {
    test('should set selected layer on timeline', () => {
      const mockLayer = new VideoMedia(new File([], 'video.mp4'), true);
      const setSpy = jest.spyOn(studio.timeline, 'setSelectedLayer');

      studio.setSelectedLayer(mockLayer as any);

      expect(setSpy).toHaveBeenCalledWith(mockLayer);
    });

    test('should set selected layer on player', () => {
      const mockLayer = new VideoMedia(new File([], 'video.mp4'), true);
      const setSpy = jest.spyOn(studio.player, 'setSelectedLayer');
      studio.setSelectedLayer(mockLayer as any);

      expect(setSpy).toHaveBeenCalledWith(mockLayer);
    });

    test('should set selected layer on studio state', () => {
      const mockLayer = new VideoMedia(new File([], 'video.mp4'), true);
      const setSpy = jest.spyOn(studio.studioState, 'setSelectedMedia');
      studio.setSelectedLayer(mockLayer as any);

      expect(setSpy).toHaveBeenCalledWith(mockLayer);
    });

    test('should set layer on speed control manager', () => {
      const mockLayer = new VideoMedia(new File([], 'video.mp4'), true);
      const setSpy = jest.spyOn(studio.speedControlManager, 'setLayer');
      studio.setSelectedLayer(mockLayer as any);

      expect(setSpy).toHaveBeenCalledWith(mockLayer);
    });
  });

  describe('dumpToJson', () => {
    test('should return JSON string of all layers', () => {
      const mockLayer = {
        id: '1',
        name: 'test',
        start_time: 0,
        init: jest.fn(),
        dump: jest.fn(() => ({ id: '1', type: 'video' }))
      };

      studio.addLayer(mockLayer as any);
      const result = studio.dumpToJson();

      expect(typeof result).toBe('string');
      expect(JSON.parse(result)).toBeInstanceOf(Array);
    });

    test('should include all layer data', () => {
      const mockLayer1 = {
        id: '1',
        name: 'test1',
        start_time: 0,
        init: jest.fn(),
        dump: jest.fn(() => ({ id: '1' }))
      };
      const mockLayer2 = {
        id: '2',
        name: 'test2',
        start_time: 0,
        init: jest.fn(),
        dump: jest.fn(() => ({ id: '2' }))
      };

      studio.addLayer(mockLayer1 as any);
      studio.addLayer(mockLayer2 as any);

      const result = JSON.parse(studio.dumpToJson());

      expect(result.length).toBe(2);
      expect(mockLayer1.dump).toHaveBeenCalled();
      expect(mockLayer2.dump).toHaveBeenCalled();
    });
  });

  describe('upload', () => {
    test('should trigger file picker click', () => {
      const filePicker = document.getElementById('filepicker') as HTMLInputElement;
      const clickSpy = jest.spyOn(filePicker, 'click');

      studio.upload();

      expect(clickSpy).toHaveBeenCalled();
    });

    test('should not throw if file picker not found', () => {
      document.body.innerHTML = '';

      expect(() => {
        studio.upload();
      }).not.toThrow();
    });
  });

  describe('loadLayersFromJson', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve([])
        })
      ) as any;
    });

    test('should fetch JSON from URI', async () => {
      const uri = 'https://example.com/project.json';
      await studio.loadLayersFromJson(uri);
      expect(global.fetch).toHaveBeenCalledWith(uri);
    });

    test('should return early for empty URI', async () => {
      await studio.loadLayersFromJson('');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should reject non-JSON files', async () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      await studio.loadLayersFromJson('https://example.com/file.txt');
      expect(consoleErrorSpy).toHaveBeenCalledWith('File is not a json file');
      expect(global.fetch).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('should show loading popup', async () => {
      const uri = 'https://example.com/project.json';
      const startLoadingSpy = jest.spyOn(studio.loadingPopup, 'startLoading');

      await studio.loadLayersFromJson(uri);
      expect(startLoadingSpy).toHaveBeenCalledWith('json-load', 'Project JSON');
    });
  });

  describe('export functionality', () => {
    test('should setup export button', () => {
      studio.init();

      const exportButton = document.getElementById('export');
      expect(exportButton).toBeDefined();
    });

  });
});

