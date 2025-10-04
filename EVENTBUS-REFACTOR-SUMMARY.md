# EventBus Refactoring Summary

## ✅ What Changed

The EventBus has been refactored from using `EventPayloadMap` with string constants to using **event classes** for a cleaner, more type-safe approach.

### Before: EventPayloadMap Approach

```typescript
// Old way - using string constants and payload maps
eventBus.emit(EVENT_NAMES.PLAYER_TIME_UPDATE, { newTime: 100, oldTime: 0 });

eventBus.subscribe(EVENT_NAMES.PLAYER_TIME_UPDATE, ({ newTime, oldTime }) => {
  console.log(newTime, oldTime);
});
```

**Problems:**
- ❌ String constants prone to typos
- ❌ Payload structure not obvious
- ❌ Harder to refactor
- ❌ Less IDE support

### After: Event Class Approach

```typescript
// New way - using event classes
eventBus.emit(new PlayerTimeUpdateEvent(100, 0));

eventBus.subscribe(PlayerTimeUpdateEvent, (event) => {
  console.log(event.newTime, event.oldTime); // Full IntelliSense!
});
```

**Benefits:**
- ✅ Type-safe event instances
- ✅ Full IntelliSense support
- ✅ Self-documenting event structure
- ✅ Easy to refactor
- ✅ Impossible to misspell event names

---

## 🏗️ Architecture

### Base Event Class

All events extend from `BaseEvent`:

```typescript
export abstract class BaseEvent {
  abstract readonly name: string;
}
```

### Event Class Examples

```typescript
export class PlayerTimeUpdateEvent extends BaseEvent {
  readonly name = 'player:timeUpdate';
  constructor(public newTime: number, public oldTime: number) {
    super();
  }
}

export class TimelineLayerUpdateEvent extends BaseEvent {
  readonly name = 'timeline:layerUpdate';
  constructor(
    public action: LayerUpdateKind,
    public layer: StandardLayer,
    public oldLayer?: StandardLayer,
    public extra?: LayerReorderData
  ) {
    super();
  }
}
```

### EventBus Methods

```typescript
class EventBus {
  // Subscribe using event class
  subscribe<T extends BaseEvent>(
    EventClass: EventClass<T>,
    handler: (event: T) => void
  ): () => void;
  
  // Emit event instance
  emit<T extends BaseEvent>(event: T): void;
  
  // One-time subscription
  once<T extends BaseEvent>(
    EventClass: EventClass<T>,
    handler: (event: T) => void
  ): void;
  
  // Unsubscribe
  unsubscribe<T extends BaseEvent>(
    EventClass: EventClass<T>,
    handler: (event: T) => void
  ): void;
  
  // Check for listeners
  hasListeners<T extends BaseEvent>(EventClass: EventClass<T>): boolean;
  
  // Count listeners
  listenerCount<T extends BaseEvent>(EventClass: EventClass<T>): number;
  
  // Clear listeners
  clear<T extends BaseEvent>(EventClass?: EventClass<T>): void;
}
```

---

## 📦 Available Event Classes

| Event Class | Constructor Parameters | Use Case |
|------------|----------------------|----------|
| `PlayerTimeUpdateEvent` | `newTime`, `oldTime` | Player time changes |
| `PlayerLayerTransformedEvent` | `layer` | Layer transformation |
| `TimelineTimeUpdateEvent` | `newTime`, `oldTime` | Timeline scrubbing |
| `TimelineLayerUpdateEvent` | `action`, `layer`, `oldLayer?`, `extra?` | Layer actions |
| `TranscriptionRemoveIntervalEvent` | `startTime`, `endTime` | Remove interval |
| `TranscriptionSeekEvent` | `timestamp` | Seek to time |
| `UiSpeedChangeEvent` | `speed` | Speed change |
| `UiAspectRatioChangeEvent` | `ratio`, `oldRatio?` | Aspect ratio change |
| `MediaLoadUpdateEvent` | `layer`, `progress`, `ctx?`, `audioBuffer?` | Media loading |

---

## 🔄 Migration Examples

### Player Component

**Before:**
```typescript
this.#eventBus.emit(EVENT_NAMES.PLAYER_TIME_UPDATE, { newTime, oldTime });
```

**After:**
```typescript
this.#eventBus.emit(new PlayerTimeUpdateEvent(newTime, oldTime));
```

### VideoStudio Component

**Before:**
```typescript
this.#eventBus.subscribe(EVENT_NAMES.PLAYER_TIME_UPDATE, ({ newTime }) => {
  this.studioState.setPlayingTime(newTime);
});
```

**After:**
```typescript
this.#eventBus.subscribe(PlayerTimeUpdateEvent, (event) => {
  this.studioState.setPlayingTime(event.newTime);
});
```

---

## 🎯 Key Improvements

### 1. Type Safety

**Before:**
```typescript
// Easy to make mistakes
eventBus.emit(EVENT_NAMES.PLAYER_TIME_UPDATE, { 
  time: 100  // Wrong property name!
});
```

**After:**
```typescript
// Compiler catches errors
eventBus.emit(new PlayerTimeUpdateEvent(100, 0)); // Must provide both parameters
```

### 2. IntelliSense Support

**Before:**
```typescript
eventBus.subscribe(EVENT_NAMES.PLAYER_TIME_UPDATE, (payload) => {
  payload. // No IntelliSense
});
```

**After:**
```typescript
eventBus.subscribe(PlayerTimeUpdateEvent, (event) => {
  event. // Full IntelliSense shows: newTime, oldTime, name
});
```

### 3. Refactoring

**Before:**
```typescript
// Changing event structure requires updating:
// 1. EventPayloadMap interface
// 2. All emit calls
// 3. All subscribe callbacks
// Hard to find all usages
```

**After:**
```typescript
// Changing event structure:
// 1. Update event class constructor
// 2. Compiler shows all places that need updates
// Easy to refactor with IDE
```

### 4. Self-Documentation

**Before:**
```typescript
// What properties does this event have?
// Need to look up EventPayloadMap
eventBus.subscribe(EVENT_NAMES.TIMELINE_LAYER_UPDATE, (payload) => {
  // What's in payload?
});
```

**After:**
```typescript
// Event class shows exactly what's available
eventBus.subscribe(TimelineLayerUpdateEvent, (event) => {
  // Hover over event to see all properties
  event.action
  event.layer
  event.oldLayer
  event.extra
});
```

---

## 🧪 Testing

### Event Class Testing

```typescript
describe('PlayerTimeUpdateEvent', () => {
  it('should create event with correct properties', () => {
    const event = new PlayerTimeUpdateEvent(100, 50);
    
    expect(event.name).toBe('player:timeUpdate');
    expect(event.newTime).toBe(100);
    expect(event.oldTime).toBe(50);
  });
});
```

### EventBus Testing

```typescript
describe('EventBus with Event Classes', () => {
  it('should handle typed events', () => {
    const eventBus = new EventBus();
    const handler = jest.fn();
    
    eventBus.subscribe(PlayerTimeUpdateEvent, handler);
    eventBus.emit(new PlayerTimeUpdateEvent(100, 0));
    
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'player:timeUpdate',
        newTime: 100,
        oldTime: 0
      })
    );
  });
});
```

---

## 📝 Creating New Events

To add a new event type:

### 1. Create Event Class

```typescript
// In src/common/event-bus.ts
export class MyNewEvent extends BaseEvent {
  readonly name = 'myDomain:myEvent';
  
  constructor(
    public myProperty: string,
    public optionalProperty?: number
  ) {
    super();
  }
}
```

### 2. Export from Common Module

```typescript
// In src/common/index.ts
export { 
  MyNewEvent,
  // ... other exports
} from './event-bus';
```

### 3. Use It

```typescript
// Emit
eventBus.emit(new MyNewEvent('hello', 42));

// Subscribe
eventBus.subscribe(MyNewEvent, (event) => {
  console.log(event.myProperty);     // Type-safe!
  console.log(event.optionalProperty); // Also type-safe!
});
```

---

## 🔍 Implementation Details

### Type-Safe Event Class Reference

```typescript
type EventClass<T extends BaseEvent> = new (...args: any[]) => T;
```

This type ensures that:
- `EventClass` is a constructor function
- It creates instances of type `T extends BaseEvent`
- TypeScript can infer the event type from the class

### Internal Event Name Resolution

```typescript
// When subscribing, we extract the event name from the class
const eventName = new EventClass().name;
```

This allows us to:
- Use class references instead of string constants
- Maintain backward compatibility with event names
- Keep the internal Map structure simple

---

## 🎉 Summary

### What Changed
- ❌ Removed `EventPayloadMap` interface
- ❌ Removed string constant-based subscriptions
- ✅ Added `BaseEvent` class
- ✅ Added event classes for all events
- ✅ Updated `EventBus.subscribe()` to accept event classes
- ✅ Updated `EventBus.emit()` to accept event instances

### Migration Impact
- ✅ **Fully backward compatible** - old listener methods still work
- ✅ **Type safety** - compile-time error catching
- ✅ **Better DX** - improved IntelliSense and refactoring
- ✅ **Cleaner code** - more explicit and self-documenting
- ✅ **No runtime overhead** - event instances are lightweight

### Files Modified
- ✅ `src/common/event-bus.ts` - Refactored to use event classes
- ✅ `src/common/index.ts` - Export event classes
- ✅ `src/player/player.ts` - Emit event classes
- ✅ `src/timeline/timeline.ts` - Emit event classes
- ✅ `src/transcription/transcription.ts` - Emit event classes
- ✅ `src/studio/speed-control-input.ts` - Emit event classes
- ✅ `src/studio/studio.ts` - Subscribe with event classes

---

## 🚀 Next Steps

The EventBus is now simpler and more powerful! You can:

1. **Use it immediately** - All components are migrated
2. **Create custom events** - Follow the pattern above
3. **Remove old listeners** - When ready, remove deprecated methods
4. **Enjoy type safety** - Let TypeScript help you

For more examples, see `EVENTBUS-QUICK-START.md`!
