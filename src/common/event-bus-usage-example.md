# EventBus Usage Examples

This document demonstrates how to use the EventBus to replace the current single-listener pattern.

## Basic Usage

### Importing

```typescript
import { getEventBus, EVENT_NAMES } from '@/common';
// or
import { getEventBus, EVENT_NAMES } from '@/common/event-bus';
```

### Publishing Events (Emit)

```typescript
const eventBus = getEventBus();

// Player time update
eventBus.emit(EVENT_NAMES.PLAYER_TIME_UPDATE, {
  newTime: 1000,
  oldTime: 500
});

// Layer transformed
eventBus.emit(EVENT_NAMES.PLAYER_LAYER_TRANSFORMED, {
  layer: myAbstractMediaLayer
});

// Speed change
eventBus.emit(EVENT_NAMES.UI_SPEED_CHANGE, {
  speed: 1.5
});
```

### Subscribing to Events

```typescript
const eventBus = getEventBus();

// Subscribe to time updates
const unsubscribe = eventBus.subscribe(
  EVENT_NAMES.PLAYER_TIME_UPDATE,
  ({ newTime, oldTime }) => {
    console.log(`Time changed from ${oldTime} to ${newTime}`);
  }
);

// Later, unsubscribe
unsubscribe();
```

### One-time Listeners

```typescript
// Listen only once
eventBus.once(EVENT_NAMES.PLAYER_TIME_UPDATE, ({ newTime }) => {
  console.log('First time update:', newTime);
});
```

## Migration Examples

### Before: Player (Single Listener Pattern)

```typescript
// OLD CODE - player.ts
export class VideoPlayer {
  public timeUpdateListener: TimeUpdateListener = (newTime, oldTime) => {};

  addTimeUpdateListener(listener: TimeUpdateListener): void {
    this.timeUpdateListener = listener;
  }

  setTime(newTime: number): void {
    const oldTime = this.time;
    this.time = newTime;
    if (oldTime !== newTime) {
      this.timeUpdateListener(newTime, oldTime);
    }
  }
}

// Usage in VideoStudio
this.player.addTimeUpdateListener((newTime, oldTime) => {
  this.studioState.setPlayingTime(newTime);
  this.timeline.playerTime = newTime;
  this.transcriptionManager.highlightChunksByTime(newTime / 1000);
});
```

### After: Player (EventBus Pattern)

```typescript
// NEW CODE - player.ts
import { getEventBus, EVENT_NAMES } from '@/common';

export class VideoPlayer {
  #eventBus = getEventBus();

  setTime(newTime: number): void {
    const oldTime = this.time;
    this.time = newTime;
    if (oldTime !== newTime) {
      this.#eventBus.emit(EVENT_NAMES.PLAYER_TIME_UPDATE, { newTime, oldTime });
    }
  }
}

// Usage - Multiple components can now listen independently!

// In VideoStudio
const eventBus = getEventBus();
eventBus.subscribe(EVENT_NAMES.PLAYER_TIME_UPDATE, ({ newTime }) => {
  this.studioState.setPlayingTime(newTime);
});

// In Timeline
eventBus.subscribe(EVENT_NAMES.PLAYER_TIME_UPDATE, ({ newTime }) => {
  this.playerTime = newTime;
});

// In TranscriptionManager
eventBus.subscribe(EVENT_NAMES.PLAYER_TIME_UPDATE, ({ newTime }) => {
  this.highlightChunksByTime(newTime / 1000);
});
```

### Before: Timeline (Single Listener Pattern)

```typescript
// OLD CODE - timeline.ts
export class Timeline {
  layerUpdateListener: (kind: LayerUpdateKind, layer: StandardLayer, ...) => void;

  addLayerUpdateListener(listener: ...) {
    this.layerUpdateListener = listener;
  }

  setSelectedLayer(newSelectedLayer: StandardLayer) {
    this.selectedLayer = newSelectedLayer;
    this.layerUpdateListener('select', newSelectedLayer);
  }
}

// Usage - Only ONE component can listen
this.timeline.addLayerUpdateListener((action, layer, oldLayer, reorderData) => {
  // Handle all actions in one place
  if (action === 'select') { /* ... */ }
  else if (action === 'delete') { /* ... */ }
  // ...
});
```

### After: Timeline (EventBus Pattern)

```typescript
// NEW CODE - timeline.ts
import { getEventBus, EVENT_NAMES } from '@/common';

export class Timeline {
  #eventBus = getEventBus();

  setSelectedLayer(newSelectedLayer: StandardLayer) {
    const oldSelectedLayer = this.selectedLayer;
    this.selectedLayer = newSelectedLayer;
    
    this.#eventBus.emit(EVENT_NAMES.TIMELINE_LAYER_UPDATE, {
      action: 'select',
      layer: newSelectedLayer,
      oldLayer: oldSelectedLayer
    });
  }
}

// Usage - Multiple components can listen!

// In VideoStudio
const eventBus = getEventBus();
eventBus.subscribe(EVENT_NAMES.TIMELINE_LAYER_UPDATE, ({ action, layer }) => {
  const media = this.getMediaById(layer.id);
  if (!media) return;
  
  if (action === 'select') {
    this.setSelectedLayer(media);
  } else if (action === 'delete') {
    this.remove(media);
  }
  // ... other actions
});

// In another component (new capability!)
eventBus.subscribe(EVENT_NAMES.TIMELINE_LAYER_UPDATE, ({ action, layer }) => {
  if (action === 'select') {
    // Do something else when layer is selected
    console.log('Layer selected:', layer.name);
  }
});
```

## Advanced Patterns

### Cleanup in Component Lifecycle

```typescript
export class MyComponent {
  #unsubscribers: (() => void)[] = [];

  constructor() {
    const eventBus = getEventBus();
    
    // Store unsubscribe functions
    this.#unsubscribers.push(
      eventBus.subscribe(EVENT_NAMES.PLAYER_TIME_UPDATE, this.#onTimeUpdate.bind(this))
    );
    
    this.#unsubscribers.push(
      eventBus.subscribe(EVENT_NAMES.UI_SPEED_CHANGE, this.#onSpeedChange.bind(this))
    );
  }

  #onTimeUpdate({ newTime }: { newTime: number }) {
    // Handle time update
  }

  #onSpeedChange({ speed }: { speed: number }) {
    // Handle speed change
  }

  destroy() {
    // Clean up all subscriptions
    this.#unsubscribers.forEach(unsubscribe => unsubscribe());
    this.#unsubscribers = [];
  }
}
```

### Conditional Event Handling

```typescript
// Subscribe with filtering logic
eventBus.subscribe(EVENT_NAMES.TIMELINE_LAYER_UPDATE, ({ action, layer }) => {
  // Only handle specific actions
  if (action !== 'select' && action !== 'delete') {
    return;
  }
  
  // Your logic here
});
```

### Chaining Events

```typescript
// One event triggers another
eventBus.subscribe(EVENT_NAMES.PLAYER_TIME_UPDATE, ({ newTime }) => {
  if (newTime >= 10000) {
    eventBus.emit(EVENT_NAMES.UI_SPEED_CHANGE, { speed: 2.0 });
  }
});
```

## Benefits

1. **Multiple Listeners**: Any number of components can listen to the same event
2. **Decoupling**: Components don't need direct references to each other
3. **Type Safety**: TypeScript ensures correct payload types for each event
4. **Memory Management**: Easy cleanup with unsubscribe functions
5. **Testability**: Easy to test by emitting events directly
6. **Flexibility**: Add new listeners without modifying existing code

## Available Events

- `player:timeUpdate` - Player time position changes
- `player:layerTransformed` - Layer transformation (position, scale, rotation)
- `timeline:timeUpdate` - Timeline scrubbing events
- `timeline:layerUpdate` - Layer actions (select, delete, clone, split, reorder)
- `transcription:removeInterval` - Remove time interval request
- `transcription:seek` - Seek to timestamp request
- `ui:speedChange` - Playback speed change
- `ui:aspectRatioChange` - Aspect ratio change
- `media:loadUpdate` - Layer loading progress updates

