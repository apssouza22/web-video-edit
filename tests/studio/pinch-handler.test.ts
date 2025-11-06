import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { PinchHandler } from '../../src/common/pinch-handler';

// Safari-specific gesture event for testing
interface GestureEvent extends Event {
  rotation: number;
  scale: number;
}

describe('PinchHandler', () => {
  let element: HTMLElement;
  let callback: jest.Mock;
  let context: any;
  let pinchHandler: PinchHandler;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);

    callback = jest.fn();
    context = { someProperty: 'test' };

    pinchHandler = new PinchHandler(element, callback);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('should initialize with correct properties', () => {
      expect(pinchHandler).toBeDefined();
    });

    test('should not be gesturing initially', () => {
      expect(pinchHandler.isGesturing()).toBe(false);
    });

    test('should bind event handlers', () => {
      expect(pinchHandler.wheel).toBeDefined();
      expect(pinchHandler.gesturestart).toBeDefined();
      expect(pinchHandler.gesturechange).toBeDefined();
      expect(pinchHandler.gestureend).toBeDefined();
    });
  });

  describe('setupEventListeners', () => {
    test('should add all event listeners', () => {
      const addEventListenerSpy = jest.spyOn(element, 'addEventListener');
      
      pinchHandler.setupEventListeners();

      expect(addEventListenerSpy).toHaveBeenCalledWith('gesturestart', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('gesturechange', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('gestureend', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
    });
  });

  describe('wheel event handling', () => {
    beforeEach(() => {
      pinchHandler.setupEventListeners();
    });

    test('should handle zoom with Ctrl+wheel', () => {
      const event = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true
      });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      element.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
      
      const callArgs = callback.mock.calls[0];
      expect(callArgs[0]).toBeGreaterThan(1); // scale > 1 for zoom in
      expect(callArgs[1]).toBe(0); // rotation should be 0
    });

    test('should handle zoom out with Ctrl+wheel (positive delta)', () => {
      const event = new WheelEvent('wheel', {
        deltaY: 100,
        ctrlKey: true
      });

      element.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
      
      const callArgs = callback.mock.calls[0];
      expect(callArgs[0]).toBeLessThan(1); // scale < 1 for zoom out
      expect(callArgs[1]).toBe(0);
    });

    test('should handle zoom with Shift+wheel', () => {
      const event = new WheelEvent('wheel', {
        deltaY: -50,
        shiftKey: true
      });

      element.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
      
      const callArgs = callback.mock.calls[0];
      expect(callArgs[0]).toBeGreaterThan(1); // scale > 1 for zoom in
    });

    test('should handle rotation with Alt+wheel', () => {
      const event = new WheelEvent('wheel', {
        deltaY: 50,
        altKey: true
      });

      element.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
      
      const callArgs = callback.mock.calls[0];
      expect(callArgs[0]).toBe(0); // scale should be 0
      expect(callArgs[1]).not.toBe(0); // rotation should not be 0
    });

    test('should use deltaX when deltaY is 0', () => {
      const event = new WheelEvent('wheel', {
        deltaX: 100,
        deltaY: 0,
        ctrlKey: true
      });

      element.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
      
      const callArgs = callback.mock.calls[0];
      expect(callArgs[0]).toBeLessThan(1); // scale < 1
    });

    test('should not handle wheel without modifier keys', () => {
      const event = new WheelEvent('wheel', {
        deltaY: 100
      });

      element.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

  });

  describe('gesture events (Safari)', () => {
    beforeEach(() => {
      pinchHandler.setupEventListeners();
    });

    test('should handle gesturestart', () => {
      const event = new Event('gesturestart') as GestureEvent;
      event.rotation = 10;
      event.scale = 1.5;
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      element.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(pinchHandler.isGesturing()).toBe(true);
    });

    test('should handle gesturechange', () => {
      // Start gesture
      const startEvent = new Event('gesturestart') as GestureEvent;
      startEvent.rotation = 0;
      startEvent.scale = 1;
      element.dispatchEvent(startEvent);

      // Change gesture
      const changeEvent = new Event('gesturechange') as GestureEvent;
      changeEvent.rotation = 15;
      changeEvent.scale = 1.5;
      const preventDefaultSpy = jest.spyOn(changeEvent, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(changeEvent, 'stopPropagation');

      element.dispatchEvent(changeEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    test('should calculate relative scale in gesturechange', () => {
      // Start gesture
      const startEvent = new Event('gesturestart') as GestureEvent;
      startEvent.rotation = 0;
      startEvent.scale = 1.0;
      element.dispatchEvent(startEvent);

      callback.mockClear();

      // Change gesture
      const changeEvent = new Event('gesturechange') as GestureEvent;
      changeEvent.rotation = 0;
      changeEvent.scale = 2.0;
      element.dispatchEvent(changeEvent);

      expect(callback).toHaveBeenCalled();
      
      const callArgs = callback.mock.calls[0];
      expect(callArgs[0]).toBe(2.0); // scale doubled
    });

    test('should calculate relative rotation in gesturechange', () => {
      // Start gesture
      const startEvent = new Event('gesturestart') as GestureEvent;
      startEvent.rotation = 10;
      startEvent.scale = 1.0;
      element.dispatchEvent(startEvent);

      callback.mockClear();

      // Change gesture
      const changeEvent = new Event('gesturechange') as GestureEvent;
      changeEvent.rotation = 25;
      changeEvent.scale = 1.0;
      element.dispatchEvent(changeEvent);

      expect(callback).toHaveBeenCalled();
      
      const callArgs = callback.mock.calls[0];
      expect(callArgs[1]).toBe(15); // rotation increased by 15
    });

    test('should handle gestureend', () => {
      // Start gesture
      const startEvent = new Event('gesturestart') as GestureEvent;
      startEvent.rotation = 0;
      startEvent.scale = 1;
      element.dispatchEvent(startEvent);

      expect(pinchHandler.isGesturing()).toBe(true);

      // End gesture
      const endEvent = new Event('gestureend') as GestureEvent;
      endEvent.rotation = 0;
      endEvent.scale = 1;
      const preventDefaultSpy = jest.spyOn(endEvent, 'preventDefault');

      element.dispatchEvent(endEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(pinchHandler.isGesturing()).toBe(false);
    });

    test('should handle multiple gesture changes', () => {
      // Start gesture
      const startEvent = new Event('gesturestart') as GestureEvent;
      startEvent.rotation = 0;
      startEvent.scale = 1.0;
      element.dispatchEvent(startEvent);

      callback.mockClear();

      // First change
      const change1 = new Event('gesturechange') as GestureEvent;
      change1.rotation = 10;
      change1.scale = 1.2;
      element.dispatchEvent(change1);

      // Second change
      const change2 = new Event('gesturechange') as GestureEvent;
      change2.rotation = 20;
      change2.scale = 1.5;
      element.dispatchEvent(change2);

      expect(callback).toHaveBeenCalledTimes(2);
    });

  });

  describe('isGesturing', () => {
    beforeEach(() => {
      pinchHandler.setupEventListeners();
    });

    test('should return false initially', () => {
      expect(pinchHandler.isGesturing()).toBe(false);
    });

    test('should return true during gesture', () => {
      const startEvent = new Event('gesturestart') as GestureEvent;
      startEvent.rotation = 0;
      startEvent.scale = 1;
      element.dispatchEvent(startEvent);

      expect(pinchHandler.isGesturing()).toBe(true);
    });

    test('should return false after gesture ends', () => {
      const startEvent = new Event('gesturestart') as GestureEvent;
      startEvent.rotation = 0;
      startEvent.scale = 1;
      element.dispatchEvent(startEvent);

      const endEvent = new Event('gestureend') as GestureEvent;
      endEvent.rotation = 0;
      endEvent.scale = 1;
      element.dispatchEvent(endEvent);

      expect(pinchHandler.isGesturing()).toBe(false);
    });
  });

  describe('destroy', () => {
    test('should remove all event listeners', () => {
      pinchHandler.setupEventListeners();
      
      const removeEventListenerSpy = jest.spyOn(element, 'removeEventListener');
      
      pinchHandler.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('gesturestart', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('gesturechange', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('gestureend', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
    });

    test('should not call callback after destroy', () => {
      pinchHandler.setupEventListeners();
      pinchHandler.destroy();

      const event = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true
      });

      element.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      pinchHandler.setupEventListeners();
    });

    test('should handle wheel event with zero deltaY and deltaX', () => {
      const event = new WheelEvent('wheel', {
        deltaY: 0,
        deltaX: 0,
        ctrlKey: true
      });

      element.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
      const callArgs = callback.mock.calls[0];
      expect(callArgs[0]).toBe(1); // scale should be 1 (no change)
    });

    test('should handle negative rotation values', () => {
      const event = new WheelEvent('wheel', {
        deltaY: -50,
        altKey: true
      });

      element.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
      const callArgs = callback.mock.calls[0];
      expect(callArgs[1]).toBeGreaterThan(0); // positive rotation for negative delta
    });

    test('should handle gesturechange without gesturestart', () => {
      const changeEvent = new Event('gesturechange') as GestureEvent;
      changeEvent.rotation = 15;
      changeEvent.scale = 1.5;

      expect(() => {
        element.dispatchEvent(changeEvent);
      }).not.toThrow();
    });
  });

  describe('integration', () => {
    test('should handle complete gesture sequence', () => {
      pinchHandler.setupEventListeners();

      // Start
      const startEvent = new Event('gesturestart') as GestureEvent;
      startEvent.rotation = 0;
      startEvent.scale = 1.0;
      element.dispatchEvent(startEvent);

      expect(pinchHandler.isGesturing()).toBe(true);

      callback.mockClear();

      // Multiple changes
      for (let i = 1; i <= 3; i++) {
        const changeEvent = new Event('gesturechange') as GestureEvent;
        changeEvent.rotation = i * 5;
        changeEvent.scale = 1.0 + i * 0.1;
        element.dispatchEvent(changeEvent);
      }

      expect(callback).toHaveBeenCalledTimes(3);

      // End
      const endEvent = new Event('gestureend') as GestureEvent;
      endEvent.rotation = 15;
      endEvent.scale = 1.3;
      element.dispatchEvent(endEvent);

      expect(pinchHandler.isGesturing()).toBe(false);
    });

    test('should handle wheel and gesture events on same element', () => {
      pinchHandler.setupEventListeners();

      // Wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true
      });
      element.dispatchEvent(wheelEvent);

      expect(callback).toHaveBeenCalledTimes(1);

      callback.mockClear();

      // Gesture event
      const startEvent = new Event('gesturestart') as GestureEvent;
      startEvent.rotation = 0;
      startEvent.scale = 1.0;
      element.dispatchEvent(startEvent);

      const changeEvent = new Event('gesturechange') as GestureEvent;
      changeEvent.rotation = 10;
      changeEvent.scale = 1.5;
      element.dispatchEvent(changeEvent);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

