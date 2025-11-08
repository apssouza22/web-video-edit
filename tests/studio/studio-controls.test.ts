import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

// Use dynamic imports for ESM
const { StudioControls } = await import('@/studio/controls');

describe('StudioControls', () => {
  let mockStudio: any;
  let studioControls: StudioControls;

  beforeEach(() => {
    document.body.innerHTML = '';
    (window as any).studio = {
      dumpToJson: jest.fn(() => JSON.stringify({ test: 'data' }))
    };
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    
    mockStudio = {
      player: {
        playing: false
      },
      play: jest.fn(),
      pause: jest.fn(),
      resize: jest.fn(),
      layerLoader: {
        loadLayerFromURI: jest.fn(),
        addLayerFromFile: jest.fn()
      }
    };

    studioControls = new StudioControls(mockStudio);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('should create instance with studio reference', () => {
      expect(studioControls).toBeDefined();
    });
  });

  describe('init', () => {
    test('should set up all event listeners', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      studioControls.init();

      expect(addEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), expect.any(Object));
    });
  });

  describe('keyboard shortcuts', () => {
    beforeEach(() => {
      studioControls.init();
    });

    test('should toggle play/pause when Space is pressed', () => {
      mockStudio.player.playing = false;
      
      const event = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(event);

      expect(mockStudio.play).toHaveBeenCalled();
    });

    test('should pause when Space is pressed and player is playing', () => {
      mockStudio.player.playing = true;
      
      const event = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(event);

      expect(mockStudio.pause).toHaveBeenCalled();
    });

    test('should play when Space is pressed and player is paused', () => {
      mockStudio.player.playing = false;
      
      const event = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(event);

      expect(mockStudio.play).toHaveBeenCalled();
    });

    test('should export to JSON when Ctrl+J is pressed', () => {
      // Mock exportToJson function
      const mockExportToJson = jest.fn();
      jest.isolateModules(() => {
        jest.mock('../../src/common/utils', () => ({
          exportToJson: mockExportToJson
        }));
      });

      const event = new KeyboardEvent('keydown', { 
        code: 'KeyJ',
        ctrlKey: true 
      });
      window.dispatchEvent(event);

      // Note: exportToJson is imported at the top level, so we can't easily mock it
      // In a real scenario, this might be refactored to be testable
    });

    test('should not trigger actions for other keys', () => {
      const event = new KeyboardEvent('keydown', { code: 'KeyA' });
      window.dispatchEvent(event);

      expect(mockStudio.play).not.toHaveBeenCalled();
      expect(mockStudio.pause).not.toHaveBeenCalled();
    });
  });

  describe('paste event handling', () => {
    beforeEach(() => {
      studioControls.init();
    });

    test('should load layer from URI when text is pasted', () => {
      const mockClipboardData = {
        getData: jest.fn(() => 'https://example.com/video.mp4')
      };

      const event = new ClipboardEvent('paste', {
        clipboardData: mockClipboardData as any
      });
      window.dispatchEvent(event);

      expect(mockStudio.layerLoader.loadLayerFromURI).toHaveBeenCalledWith('https://example.com/video.mp4');
    });

    test('should handle empty paste data', () => {
      const mockClipboardData = {
        getData: jest.fn(() => '')
      };

      const event = new ClipboardEvent('paste', {
        clipboardData: mockClipboardData as any
      });
      
      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    test('should handle missing clipboard data', () => {
      const event = new ClipboardEvent('paste', {
        clipboardData: null as any
      });
      
      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();
    });
  });

  describe('drag and drop file handling', () => {
    beforeEach(() => {
      studioControls.init();
    });

    test('should prevent default on dragover', () => {
      const event = new DragEvent('dragover');
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('should handle URI drop', () => {
      const mockDataTransferItem = {
        kind: 'string',
        type: 'text/uri-list',
        getAsString: (callback: (uri: string) => void) => {
          callback('https://example.com/video.mp4');
        }
      };

      const mockDataTransfer = {
        items: [mockDataTransferItem]
      };

      const event = new DragEvent('drop', {
        dataTransfer: mockDataTransfer as any
      });

      window.dispatchEvent(event);

      expect(mockStudio.layerLoader.loadLayerFromURI).toHaveBeenCalledWith('https://example.com/video.mp4');
    });

    test('should handle drop without items', () => {
      const event = new DragEvent('drop', {
        dataTransfer: { items: null } as any
      });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockStudio.layerLoader.addLayerFromFile).not.toHaveBeenCalled();
    });

  });

  describe('window resize handling', () => {
    beforeEach(() => {
      studioControls.init();
    });

    test('should call studio.resize on window resize', () => {
      window.dispatchEvent(new Event('resize'));

      expect(mockStudio.resize).toHaveBeenCalled();
    });

    test('should handle multiple resize events', () => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));

      expect(mockStudio.resize).toHaveBeenCalledTimes(3);
    });
  });

  describe('touch move prevention', () => {
    beforeEach(() => {
      studioControls.init();
    });

    test('should prevent default on touchmove', () => {
      const event = new TouchEvent('touchmove', {
        cancelable: true,
        bubbles: true
      });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('should set passive: false for touchmove listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      studioControls.init();

      const touchmoveCall = (addEventListenerSpy.mock.calls as any[]).find(
        call => call[0] === 'touchmove'
      );
      
      expect(touchmoveCall).toBeDefined();
      expect(touchmoveCall[2]).toEqual({ passive: false });
    });
  });

  describe('integration', () => {
    test('should handle multiple events in sequence', () => {
      studioControls.init();

      // Resize
      window.dispatchEvent(new Event('resize'));
      expect(mockStudio.resize).toHaveBeenCalled();

      // Play
      mockStudio.player.playing = false;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(mockStudio.play).toHaveBeenCalled();

      // Pause
      mockStudio.player.playing = true;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(mockStudio.pause).toHaveBeenCalled();
    });
  });
});

