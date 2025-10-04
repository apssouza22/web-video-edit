# EventBus Quick Start Guide

## Import

```typescript
import { 
  getEventBus, 
  PlayerTimeUpdateEvent,
  TimelineLayerUpdateEvent 
} from '@/common/event-bus';
```

## Subscribe to Events

```typescript
const eventBus = getEventBus();

// Subscribe using event class and get unsubscribe function
const unsubscribe = eventBus.subscribe(
  PlayerTimeUpdateEvent,
  (event) => {
    console.log(`Time: ${event.newTime}ms (was ${event.oldTime}ms)`);
  }
);

// Later: clean up
unsubscribe();
```

## Listen Once

```typescript
eventBus.once(PlayerTimeUpdateEvent, (event) => {
  console.log('First time update:', event.newTime);
});
```

## Emit Events (Already done in migrated components)

```typescript
// Components already emit events!
// But if you're adding new features:
eventBus.emit(new UiSpeedChangeEvent(2.0));
```

## Available Event Classes

| Event Class | Properties | Description |
|------------|-----------|-------------|
| `PlayerTimeUpdateEvent` | `newTime`, `oldTime` | Player time position changes |
| `PlayerLayerTransformedEvent` | `layer` | Layer transformed (position/scale/rotation) |
| `TimelineTimeUpdateEvent` | `newTime`, `oldTime` | Timeline scrubbing |
| `TimelineLayerUpdateEvent` | `action`, `layer`, `oldLayer?`, `extra?` | Layer actions (select/delete/clone/split/reorder) |
| `TranscriptionRemoveIntervalEvent` | `startTime`, `endTime` | Remove time interval |
| `TranscriptionSeekEvent` | `timestamp` | Seek to timestamp |
| `UiSpeedChangeEvent` | `speed` | Playback speed change |
| `UiAspectRatioChangeEvent` | `ratio`, `oldRatio?` | Aspect ratio change |
| `MediaLoadUpdateEvent` | `layer`, `progress`, `ctx?`, `audioBuffer?` | Media loading progress |

## Complete Example

```typescript
import { 
  getEventBus, 
  PlayerTimeUpdateEvent,
  TimelineLayerUpdateEvent 
} from '@/common/event-bus';

export class MyFeature {
  #eventBus = getEventBus();
  #unsubscribers: (() => void)[] = [];

  constructor() {
    this.#setupListeners();
  }

  #setupListeners() {
    // Store unsubscribe functions for cleanup
    this.#unsubscribers.push(
      this.#eventBus.subscribe(
        PlayerTimeUpdateEvent,
        this.#onTimeUpdate.bind(this)
      )
    );

    this.#unsubscribers.push(
      this.#eventBus.subscribe(
        TimelineLayerUpdateEvent,
        this.#onLayerUpdate.bind(this)
      )
    );
  }

  #onTimeUpdate(event: PlayerTimeUpdateEvent) {
    console.log('Current time:', event.newTime);
  }

  #onLayerUpdate(event: TimelineLayerUpdateEvent) {
    if (event.action === 'select') {
      console.log('Layer selected:', event.layer.name);
    }
  }

  destroy() {
    // Clean up all subscriptions
    this.#unsubscribers.forEach(unsubscribe => unsubscribe());
    this.#unsubscribers = [];
  }
}
```

## Common Patterns

### Filter Events

```typescript
eventBus.subscribe(TimelineLayerUpdateEvent, (event) => {
  // Only handle specific actions
  if (event.action !== 'select') return;
  
  console.log('Layer selected:', event.layer.name);
});
```

### Combine Multiple Events

```typescript
class AutoSave {
  #needsSave = false;

  constructor() {
    const eventBus = getEventBus();
    
    // Mark as needing save on any change
    eventBus.subscribe(TimelineLayerUpdateEvent, () => {
      this.#needsSave = true;
    });
    
    eventBus.subscribe(PlayerLayerTransformedEvent, () => {
      this.#needsSave = true;
    });
    
    // Auto-save every 30 seconds
    setInterval(() => {
      if (this.#needsSave) {
        this.save();
        this.#needsSave = false;
      }
    }, 30000);
  }
  
  save() {
    // Save logic
  }
}
```

### Conditional Logic

```typescript
eventBus.subscribe(PlayerTimeUpdateEvent, (event) => {
  // Trigger action at specific time
  if (event.newTime >= 10000) {
    console.log('Reached 10 seconds!');
  }
});
```

## Creating Custom Events

```typescript
// 1. Create event class in src/common/event-bus.ts
export class MyCustomEvent extends BaseEvent {
  readonly name = 'myDomain:myEvent';
  constructor(public myData: string, public count: number) {
    super();
  }
}

// 2. Export from src/common/index.ts
export { MyCustomEvent } from './event-bus';

// 3. Use it
const eventBus = getEventBus();

// Emit
eventBus.emit(new MyCustomEvent('hello', 42));

// Subscribe
eventBus.subscribe(MyCustomEvent, (event) => {
  console.log(event.myData, event.count); // Type-safe!
});
```

## Testing with EventBus

```typescript
import { getEventBus, PlayerTimeUpdateEvent, resetEventBus } from '@/common/event-bus';

describe('MyComponent', () => {
  let eventBus;
  
  beforeEach(() => {
    resetEventBus(); // Start fresh
    eventBus = getEventBus();
  });

  it('should handle time updates', () => {
    const handler = jest.fn();
    eventBus.subscribe(PlayerTimeUpdateEvent, handler);
    
    // Emit test event
    eventBus.emit(new PlayerTimeUpdateEvent(100, 0));
    
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].newTime).toBe(100);
    expect(handler.mock.calls[0][0].oldTime).toBe(0);
  });
});
```

## Benefits of Event Classes

✅ **Type Safety**: All event properties are typed  
✅ **IntelliSense**: Auto-complete for event properties  
✅ **Explicit**: Clear what data each event carries  
✅ **Refactorable**: Easy to rename or change event structure  
✅ **Self-Documenting**: Event class name describes the event  

## Migration Status

✅ **Player** - Emitting event classes  
✅ **Timeline** - Emitting event classes  
✅ **TranscriptionService** - Emitting event classes  
✅ **SpeedControlInput** - Emitting event classes  
✅ **VideoStudio** - Subscribing with event classes  

Both old and new patterns work simultaneously!

## Tips

✅ **DO**: Use event classes for type safety  
✅ **DO**: Store unsubscribe functions for cleanup  
✅ **DO**: Clean up subscriptions when components destroy  
✅ **DO**: Access event properties directly (event.newTime)  

❌ **DON'T**: Emit events in infinite loops  
❌ **DON'T**: Forget to clean up subscriptions  
❌ **DON'T**: Create unnecessary event instances  
❌ **DON'T**: Subscribe in render loops  

## Comparison: Old vs New

### Old Approach (with EventPayloadMap)
```typescript
// Harder to read and maintain
eventBus.emit(EVENT_NAMES.PLAYER_TIME_UPDATE, { newTime: 100, oldTime: 0 });
eventBus.subscribe(EVENT_NAMES.PLAYER_TIME_UPDATE, ({ newTime, oldTime }) => {
  // Need to remember property names
});
```

### New Approach (with Event Classes)
```typescript
// Clear and type-safe
eventBus.emit(new PlayerTimeUpdateEvent(100, 0));
eventBus.subscribe(PlayerTimeUpdateEvent, (event) => {
  // IntelliSense shows event.newTime and event.oldTime
  console.log(event.newTime);
});
```

## Need More Info?

- See `MIGRATION-SUMMARY.md` for detailed migration info
- See `src/common/event-bus.ts` for all available event classes
- Check the `BaseEvent` class to understand the event structure