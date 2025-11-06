import {afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  EventBus,
  getEventBus,
  resetEventBus,
  PlayerTimeUpdateEvent,
  PlayerLayerTransformedEvent,
  TimelineTimeUpdateEvent,
  UiSpeedChangeEvent,
  UiAspectRatioChangeEvent
} from '@/common/event-bus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('subscribe and emit', () => {
    test('should subscribe to events and receive them', () => {
      const handler = jest.fn();
      eventBus.subscribe(PlayerTimeUpdateEvent, handler);

      const event = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    test('should handle multiple subscribers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, handler1);
      eventBus.subscribe(PlayerTimeUpdateEvent, handler2);
      eventBus.subscribe(PlayerTimeUpdateEvent, handler3);

      const event = new PlayerTimeUpdateEvent(20, 15);
      eventBus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
      expect(handler3).toHaveBeenCalledWith(event);
    });

    test('should handle multiple event types independently', () => {
      const timeHandler = jest.fn();
      const speedHandler = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, timeHandler);
      eventBus.subscribe(UiSpeedChangeEvent, speedHandler);

      const timeEvent = new PlayerTimeUpdateEvent(10, 5);
      const speedEvent = new UiSpeedChangeEvent(1.5);

      eventBus.emit(timeEvent);
      expect(timeHandler).toHaveBeenCalledWith(timeEvent);
      expect(speedHandler).not.toHaveBeenCalled();

      eventBus.emit(speedEvent);
      expect(speedHandler).toHaveBeenCalledWith(speedEvent);
      expect(timeHandler).toHaveBeenCalledTimes(1);
    });

    test('should not call handler if event type does not match', () => {
      const handler = jest.fn();
      eventBus.subscribe(PlayerTimeUpdateEvent, handler);

      const event = new UiSpeedChangeEvent(2.0);
      eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    test('should unsubscribe handler from events', () => {
      const handler = jest.fn();
      eventBus.subscribe(PlayerTimeUpdateEvent, handler);

      const event1 = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event1);
      expect(handler).toHaveBeenCalledTimes(1);

      eventBus.unsubscribe(PlayerTimeUpdateEvent, handler);

      const event2 = new PlayerTimeUpdateEvent(15, 10);
      eventBus.emit(event2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should unsubscribe using returned function', () => {
      const handler = jest.fn();
      const unsubscribe = eventBus.subscribe(PlayerTimeUpdateEvent, handler);

      const event1 = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event1);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      const event2 = new PlayerTimeUpdateEvent(15, 10);
      eventBus.emit(event2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should only unsubscribe specific handler', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, handler1);
      eventBus.subscribe(PlayerTimeUpdateEvent, handler2);

      eventBus.unsubscribe(PlayerTimeUpdateEvent, handler1);

      const event = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(event);
    });

    test('should handle unsubscribe of non-existent handler gracefully', () => {
      const handler = jest.fn();
      expect(() => {
        eventBus.unsubscribe(PlayerTimeUpdateEvent, handler);
      }).not.toThrow();
    });
  });

  describe('once', () => {
    test('should call handler only once', () => {
      const handler = jest.fn();
      eventBus.once(PlayerTimeUpdateEvent, handler);

      const event1 = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event1);
      expect(handler).toHaveBeenCalledTimes(1);

      const event2 = new PlayerTimeUpdateEvent(15, 10);
      eventBus.emit(event2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should work with multiple once handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.once(PlayerTimeUpdateEvent, handler1);
      eventBus.once(PlayerTimeUpdateEvent, handler2);

      const event = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    test('should work independently from regular subscribers', () => {
      const onceHandler = jest.fn();
      const regularHandler = jest.fn();

      eventBus.once(PlayerTimeUpdateEvent, onceHandler);
      eventBus.subscribe(PlayerTimeUpdateEvent, regularHandler);

      const event1 = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event1);

      expect(onceHandler).toHaveBeenCalledTimes(1);
      expect(regularHandler).toHaveBeenCalledTimes(1);

      const event2 = new PlayerTimeUpdateEvent(15, 10);
      eventBus.emit(event2);

      expect(onceHandler).toHaveBeenCalledTimes(1);
      expect(regularHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    test('should catch and log errors in event handlers', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, errorHandler);
      eventBus.subscribe(PlayerTimeUpdateEvent, normalHandler);

      const event = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event);

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler for player:timeUpdate'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    test('should catch and log errors in once handlers', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorHandler = jest.fn(() => {
        throw new Error('Once handler error');
      });

      eventBus.once(PlayerTimeUpdateEvent, errorHandler);

      const event = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event);

      expect(errorHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in once event handler for player:timeUpdate'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clear', () => {
    test('should clear all listeners for specific event type', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const speedHandler = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, handler1);
      eventBus.subscribe(PlayerTimeUpdateEvent, handler2);
      eventBus.subscribe(UiSpeedChangeEvent, speedHandler);

      eventBus.clear(PlayerTimeUpdateEvent);

      const timeEvent = new PlayerTimeUpdateEvent(10, 5);
      const speedEvent = new UiSpeedChangeEvent(1.5);

      eventBus.emit(timeEvent);
      eventBus.emit(speedEvent);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(speedHandler).toHaveBeenCalledWith(speedEvent);
    });

    test('should clear all listeners when no event type provided', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, handler1);
      eventBus.subscribe(UiSpeedChangeEvent, handler2);

      eventBus.clear();

      const timeEvent = new PlayerTimeUpdateEvent(10, 5);
      const speedEvent = new UiSpeedChangeEvent(1.5);

      eventBus.emit(timeEvent);
      eventBus.emit(speedEvent);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    test('should clear both regular and once listeners', () => {
      const regularHandler = jest.fn();
      const onceHandler = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, regularHandler);
      eventBus.once(PlayerTimeUpdateEvent, onceHandler);

      eventBus.clear(PlayerTimeUpdateEvent);

      const event = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event);

      expect(regularHandler).not.toHaveBeenCalled();
      expect(onceHandler).not.toHaveBeenCalled();
    });
  });

  describe('hasListeners', () => {
    test('should return true when listeners exist', () => {
      const handler = jest.fn();
      eventBus.subscribe(PlayerTimeUpdateEvent, handler);

      expect(eventBus.hasListeners(PlayerTimeUpdateEvent)).toBe(true);
    });

    test('should return false when no listeners exist', () => {
      expect(eventBus.hasListeners(PlayerTimeUpdateEvent)).toBe(false);
    });

    test('should return true for once listeners', () => {
      const handler = jest.fn();
      eventBus.once(PlayerTimeUpdateEvent, handler);

      expect(eventBus.hasListeners(PlayerTimeUpdateEvent)).toBe(true);
    });

    test('should return false after all listeners are removed', () => {
      const handler = jest.fn();
      eventBus.subscribe(PlayerTimeUpdateEvent, handler);
      eventBus.unsubscribe(PlayerTimeUpdateEvent, handler);

      expect(eventBus.hasListeners(PlayerTimeUpdateEvent)).toBe(false);
    });

    test('should return false after clear', () => {
      const handler = jest.fn();
      eventBus.subscribe(PlayerTimeUpdateEvent, handler);
      eventBus.clear(PlayerTimeUpdateEvent);

      expect(eventBus.hasListeners(PlayerTimeUpdateEvent)).toBe(false);
    });
  });

  describe('listenerCount', () => {
    test('should return 0 when no listeners exist', () => {
      expect(eventBus.listenerCount(PlayerTimeUpdateEvent)).toBe(0);
    });

    test('should return correct count for regular listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, handler1);
      eventBus.subscribe(PlayerTimeUpdateEvent, handler2);
      eventBus.subscribe(PlayerTimeUpdateEvent, handler3);

      expect(eventBus.listenerCount(PlayerTimeUpdateEvent)).toBe(3);
    });

    test('should return correct count for once listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.once(PlayerTimeUpdateEvent, handler1);
      eventBus.once(PlayerTimeUpdateEvent, handler2);

      expect(eventBus.listenerCount(PlayerTimeUpdateEvent)).toBe(2);
    });

    test('should return combined count of regular and once listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, handler1);
      eventBus.subscribe(PlayerTimeUpdateEvent, handler2);
      eventBus.once(PlayerTimeUpdateEvent, handler3);

      expect(eventBus.listenerCount(PlayerTimeUpdateEvent)).toBe(3);
    });

    test('should update count after unsubscribe', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe(PlayerTimeUpdateEvent, handler1);
      eventBus.subscribe(PlayerTimeUpdateEvent, handler2);

      expect(eventBus.listenerCount(PlayerTimeUpdateEvent)).toBe(2);

      eventBus.unsubscribe(PlayerTimeUpdateEvent, handler1);

      expect(eventBus.listenerCount(PlayerTimeUpdateEvent)).toBe(1);
    });

    test('should update count after once listener is called', () => {
      const handler = jest.fn();
      eventBus.once(PlayerTimeUpdateEvent, handler);

      expect(eventBus.listenerCount(PlayerTimeUpdateEvent)).toBe(1);

      const event = new PlayerTimeUpdateEvent(10, 5);
      eventBus.emit(event);

      expect(eventBus.listenerCount(PlayerTimeUpdateEvent)).toBe(0);
    });
  });

  describe('Event Classes', () => {
    test('PlayerTimeUpdateEvent should have correct properties', () => {
      const event = new PlayerTimeUpdateEvent(10, 5);
      expect(event.name).toBe('player:timeUpdate');
      expect(event.newTime).toBe(10);
      expect(event.oldTime).toBe(5);
    });

    test('TimelineTimeUpdateEvent should have correct properties', () => {
      const event = new TimelineTimeUpdateEvent(20, 15);
      expect(event.name).toBe('timeline:timeUpdate');
      expect(event.newTime).toBe(20);
      expect(event.oldTime).toBe(15);
    });

    test('UiSpeedChangeEvent should have correct properties', () => {
      const event = new UiSpeedChangeEvent(1.5);
      expect(event.name).toBe('ui:speedChange');
      expect(event.speed).toBe(1.5);
    });

    test('UiAspectRatioChangeEvent should have correct properties', () => {
      const event = new UiAspectRatioChangeEvent('16:9', '4:3');
      expect(event.name).toBe('ui:aspectRatioChange');
      expect(event.ratio).toBe('16:9');
      expect(event.oldRatio).toBe('4:3');
    });
  });
});

describe('Global EventBus', () => {
  afterEach(() => {
    resetEventBus();
  });

  describe('getEventBus', () => {
    test('should return singleton instance', () => {
      const bus1 = getEventBus();
      const bus2 = getEventBus();

      expect(bus1).toBe(bus2);
    });

    test('should share state between calls', () => {
      const bus1 = getEventBus();
      const handler = jest.fn();
      bus1.subscribe(PlayerTimeUpdateEvent, handler);

      const bus2 = getEventBus();
      const event = new PlayerTimeUpdateEvent(10, 5);
      bus2.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });
  });

  describe('resetEventBus', () => {
    test('should clear all listeners', () => {
      const bus = getEventBus();
      const handler = jest.fn();
      bus.subscribe(PlayerTimeUpdateEvent, handler);

      resetEventBus();

      const newBus = getEventBus();
      const event = new PlayerTimeUpdateEvent(10, 5);
      newBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });

    test('should create new instance after reset', () => {
      const bus1 = getEventBus();
      resetEventBus();
      const bus2 = getEventBus();

      expect(bus1).not.toBe(bus2);
    });
  });
});

