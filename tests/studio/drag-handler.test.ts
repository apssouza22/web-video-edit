import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { DragItemHandler } from '@/studio/drag-handler';

describe('DragItemHandler', () => {
  let element: HTMLElement;
  let callback: jest.Mock;
  let mockStudio: any;
  let dragHandler: DragItemHandler;

  beforeEach(() => {
    element = document.createElement('div');
    element.style.width = '800px';
    element.style.height = '600px';
    document.body.appendChild(element);

    callback = jest.fn();

    mockStudio = {
      player: {
        width: 1920,
        height: 1080,
        time: 0
      },
      pinchHandler: null,
      getSelectedLayer: jest.fn()
    };

    dragHandler = new DragItemHandler(element, callback, mockStudio);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('should initialize with correct properties', () => {
      expect(dragHandler).toBeDefined();
    });

    test('should bind event handlers', () => {
      expect(dragHandler.pointerdown).toBeDefined();
      expect(dragHandler.pointermove).toBeDefined();
      expect(dragHandler.pointerup).toBeDefined();
    });
  });

  describe('setupEventListeners', () => {
    test('should add event listeners to element', () => {
      const addEventListenerSpy = jest.spyOn(element, 'addEventListener');
      
      dragHandler.setupEventListeners();

      expect(addEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: false });
    });
  });

  describe('get_ratio', () => {
    test('should calculate correct ratio when client is wider', () => {
      const testElement = document.createElement('div');
      Object.defineProperty(testElement, 'clientWidth', { value: 1600, writable: true });
      Object.defineProperty(testElement, 'clientHeight', { value: 800, writable: true });

      const ratio = dragHandler.get_ratio(testElement);

      // Client ratio: 1600/800 = 2
      // Player ratio: 1920/1080 = 1.777...
      // Client is wider, so use height: 1080 / 800 = 1.35
      expect(ratio).toBeCloseTo(1.35, 2);
    });

    test('should calculate correct ratio when player is wider', () => {
      const testElement = document.createElement('div');
      Object.defineProperty(testElement, 'clientWidth', { value: 800, writable: true });
      Object.defineProperty(testElement, 'clientHeight', { value: 600, writable: true });

      const ratio = dragHandler.get_ratio(testElement);

      // Client ratio: 800/600 = 1.333...
      // Player ratio: 1920/1080 = 1.777...
      // Player is wider, so use width: 1920 / 800 = 2.4
      expect(ratio).toBeCloseTo(2.4, 2);
    });
  });

  describe('pointerdown', () => {
    beforeEach(() => {
      dragHandler.setupEventListeners();
    });

    test('should not start dragging when no layer is selected', () => {
      mockStudio.getSelectedLayer.mockReturnValue(null);

      const event = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100
      });

      element.dispatchEvent(event);

      expect(mockStudio.getSelectedLayer).toHaveBeenCalled();
    });

    test('should start dragging when layer is selected', () => {
      const mockLayer = {
        getFrame: jest.fn(() => ({ x: 50, y: 50 }))
      };
      mockStudio.getSelectedLayer.mockReturnValue(mockLayer);

      const event = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      Object.defineProperty(event, 'offsetX', { value: 100 });
      Object.defineProperty(event, 'offsetY', { value: 100 });

      element.dispatchEvent(event);

      expect(mockLayer.getFrame).toHaveBeenCalledWith(0);
    });

    test('should not start dragging when layer has no frame at current time', () => {
      const mockLayer = {
        getFrame: jest.fn(() => null)
      };
      mockStudio.getSelectedLayer.mockReturnValue(mockLayer);

      const event = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });

      element.dispatchEvent(event);

      expect(mockLayer.getFrame).toHaveBeenCalled();
    });

    test('should prevent default when starting drag', () => {
      const mockLayer = {
        getFrame: jest.fn(() => ({ x: 50, y: 50 }))
      };
      mockStudio.getSelectedLayer.mockReturnValue(mockLayer);

      const event = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      Object.defineProperty(event, 'offsetX', { value: 100 });
      Object.defineProperty(event, 'offsetY', { value: 100 });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      element.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('should add pointerup listener to window', () => {
      const mockLayer = {
        getFrame: jest.fn(() => ({ x: 50, y: 50 }))
      };
      mockStudio.getSelectedLayer.mockReturnValue(mockLayer);

      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      const event = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      Object.defineProperty(event, 'offsetX', { value: 100 });
      Object.defineProperty(event, 'offsetY', { value: 100 });

      element.dispatchEvent(event);

      expect(addEventListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function), { once: true });
    });
  });

  describe('pointermove', () => {
    beforeEach(() => {
      dragHandler.setupEventListeners();
    });

    test('should not move when not dragging', () => {
      const event = new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 150,
        bubbles: true
      });
      Object.defineProperty(event, 'offsetX', { value: 150 });
      Object.defineProperty(event, 'offsetY', { value: 150 });

      element.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    test('should call callback with coordinates when dragging', () => {
      // Start dragging
      const mockLayer = {
        getFrame: jest.fn(() => ({ x: 100, y: 100 }))
      };
      mockStudio.getSelectedLayer.mockReturnValue(mockLayer);

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      Object.defineProperty(downEvent, 'offsetX', { value: 100 });
      Object.defineProperty(downEvent, 'offsetY', { value: 100 });

      element.dispatchEvent(downEvent);

      // Move
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 150,
        bubbles: true
      });
      Object.defineProperty(moveEvent, 'offsetX', { value: 150 });
      Object.defineProperty(moveEvent, 'offsetY', { value: 150 });

      element.dispatchEvent(moveEvent);

      expect(callback).toHaveBeenCalled();
    });

    test('should not move when pinch handler is gesturing', () => {
      mockStudio.pinchHandler = {
        isGesturing: jest.fn(() => true)
      };

      // Start dragging
      const mockLayer = {
        getFrame: jest.fn(() => ({ x: 100, y: 100 }))
      };
      mockStudio.getSelectedLayer.mockReturnValue(mockLayer);

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      Object.defineProperty(downEvent, 'offsetX', { value: 100 });
      Object.defineProperty(downEvent, 'offsetY', { value: 100 });

      element.dispatchEvent(downEvent);

      // Try to move while gesturing
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 150,
        bubbles: true
      });

      element.dispatchEvent(moveEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    test('should prevent default and stop propagation when dragging', () => {
      // Start dragging
      const mockLayer = {
        getFrame: jest.fn(() => ({ x: 100, y: 100 }))
      };
      mockStudio.getSelectedLayer.mockReturnValue(mockLayer);

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      Object.defineProperty(downEvent, 'offsetX', { value: 100 });
      Object.defineProperty(downEvent, 'offsetY', { value: 100 });

      element.dispatchEvent(downEvent);

      // Move
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 150,
        bubbles: true
      });
      Object.defineProperty(moveEvent, 'offsetX', { value: 150 });
      Object.defineProperty(moveEvent, 'offsetY', { value: 150 });
      const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(moveEvent, 'stopPropagation');

      element.dispatchEvent(moveEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('pointerup', () => {
    test('should stop dragging', () => {
      // Start dragging
      const mockLayer = {
        getFrame: jest.fn(() => ({ x: 100, y: 100 }))
      };
      mockStudio.getSelectedLayer.mockReturnValue(mockLayer);

      dragHandler.setupEventListeners();

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      Object.defineProperty(downEvent, 'offsetX', { value: 100 });
      Object.defineProperty(downEvent, 'offsetY', { value: 100 });

      element.dispatchEvent(downEvent);

      // Release
      const upEvent = new PointerEvent('pointerup', {
        bubbles: true
      });
      const preventDefaultSpy = jest.spyOn(upEvent, 'preventDefault');

      window.dispatchEvent(upEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();

      // Try to move after release - should not call callback
      callback.mockClear();
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 200,
        clientY: 200,
        bubbles: true
      });
      Object.defineProperty(moveEvent, 'offsetX', { value: 200 });
      Object.defineProperty(moveEvent, 'offsetY', { value: 200 });

      element.dispatchEvent(moveEvent);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('drag sequence', () => {
    test('should handle complete drag sequence', () => {
      const mockLayer = {
        getFrame: jest.fn(() => ({ x: 100, y: 100 }))
      };
      mockStudio.getSelectedLayer.mockReturnValue(mockLayer);

      dragHandler.setupEventListeners();

      // Start drag
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      Object.defineProperty(downEvent, 'offsetX', { value: 100 });
      Object.defineProperty(downEvent, 'offsetY', { value: 100 });
      element.dispatchEvent(downEvent);

      // Move multiple times
      for (let i = 1; i <= 3; i++) {
        const moveEvent = new PointerEvent('pointermove', {
          clientX: 100 + i * 10,
          clientY: 100 + i * 10,
          bubbles: true
        });
        Object.defineProperty(moveEvent, 'offsetX', { value: 100 + i * 10 });
        Object.defineProperty(moveEvent, 'offsetY', { value: 100 + i * 10 });
        element.dispatchEvent(moveEvent);
      }

      expect(callback).toHaveBeenCalledTimes(3);

      // End drag
      const upEvent = new PointerEvent('pointerup', { bubbles: true });
      window.dispatchEvent(upEvent);

      // Try to move after drag ended
      callback.mockClear();
      const postMoveEvent = new PointerEvent('pointermove', {
        clientX: 200,
        clientY: 200,
        bubbles: true
      });
      Object.defineProperty(postMoveEvent, 'offsetX', { value: 200 });
      Object.defineProperty(postMoveEvent, 'offsetY', { value: 200 });
      element.dispatchEvent(postMoveEvent);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

