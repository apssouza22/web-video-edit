# Studio Tests Mocking Strategy

## Overview

The studio package tests use a comprehensive mocking strategy to isolate the studio code from all external dependencies. This ensures tests are:
- **Fast**: No real I/O, network calls, or heavy computations
- **Reliable**: Deterministic behavior without external factors
- **Focused**: Tests only studio logic, not dependencies
- **Maintainable**: Centralized mocks in one place

## Architecture

```
tests/studio/
├── setup-mocks.ts          # Centralized mocks for all external packages
├── *.test.ts               # Test files (import setup-mocks first)
└── README.md               # Documentation
```

## Mocked Packages

### 1. Canvas Package (@/canvas)
**Purpose**: Video rendering and display

**Mock provides:**
- `createVideoCanvas()` - Returns mock canvas with width, height, time properties
- Mock methods: mount, play, pause, resize, render, addMedias

**Why mocked:** Avoids actual canvas rendering and video operations

---

### 2. Timeline Package (@/timeline)
**Purpose**: Timeline UI and layer management

**Mock provides:**
- `createTimeline()` - Returns mock timeline with layer management
- Mock methods: addLayers, setSelectedLayer, resize, render
- `selectedLayer` property

**Why mocked:** Avoids DOM manipulation and complex UI state

---

### 3. Media Package (@/media)
**Purpose**: Media loading, processing, and manipulation

**Mock provides:**
- `createMediaService()` - Returns service with clone, split, remove operations
- `createMediaFromFile()` - Creates mock media layers from files
- `createMediaText()` - Creates mock text layers
- `isMediaVideo()` / `isMediaAudio()` - Type checking utilities

**Why mocked:** Avoids file I/O, video/audio decoding, and processing

---

### 4. Video Muxer Package (@/video/muxer)
**Purpose**: Video export and encoding

**Mock provides:**
- `createVideoMuxer()` - Returns exporter with progress callbacks
- Simulates async export with progress updates

**Why mocked:** Avoids video encoding (very slow and resource-intensive)

---

### 5. Transcription Package (@/transcription)
**Purpose**: Speech-to-text transcription using AI models

**Mock provides:**
- `createTranscriptionService()` - Returns service with loadModel, startTranscription
- Returns mock transcription results

**Why mocked:** Avoids loading large AI models (hundreds of MB) and inference

---

### 6. Frame Package (@/frame)
**Purpose**: Frame manipulation and transformations

**Mock provides:**
- `Frame` class with x, y, scale, rotation properties
- `fromArray()` static method for deserialization

**Why mocked:** Simplifies frame operations for tests

---

### 7. Common Packages

#### @/common/render-2d
**Purpose**: 2D rendering context utilities

**Mock provides:**
- Mock rendering context with canvas operations
- Methods: fillRect, drawImage, save, restore, translate, etc.

#### @/common/studio-state
**Purpose**: Global studio state management

**Mock provides:**
- Singleton pattern with getInstance()
- Media management: add, get, filter
- Selected media tracking
- Playback time tracking

#### @/common/event-bus
**Purpose**: Event system for cross-component communication

**Mock provides:**
- EventBus with subscribe, unsubscribe, emit
- Event classes: PlayerTimeUpdateEvent, UiSpeedChangeEvent
- Global singleton with getEventBus()

---

## CDN Import Mocks

Located in `tests/__mocks__/`:

### huggingface-transformers.js
Mocks: `https://cdn.jsdelivr.net/npm/@huggingface/transformers`
- Provides `pipeline()` and `env` exports
- Returns mock transcription results

### webm-duration-fix.js
Mocks: `https://cdn.jsdelivr.net/npm/webm-duration-fix@1.0.4/+esm`
- Provides default export function
- Returns blob unchanged

Configured in `jest.config.js` moduleNameMapper.

---

## Browser API Mocks

Located in `tests/setup.js`:

- **AudioContext** / **OfflineAudioContext** - Audio processing
- **MediaRecorder** - Video/audio recording
- **Worker** - Web workers
- **PointerEvent** - Pointer/touch interactions
- **TextEncoder** / **TextDecoder** - Text encoding
- **HTMLCanvasElement.getContext('2d')** - Canvas rendering
- **HTMLVideoElement** properties - Video dimensions
- **navigator.mediaDevices** - Media device access
- **crypto.randomUUID** - UUID generation

---

## How to Use

### 1. Understanding Jest Mock Hoisting

⚠️ **CRITICAL:** Jest automatically hoists `jest.mock()` calls to the top of the file, but **ONLY** if they're in the same file as your tests. Importing mocks from another file does NOT work because those imports aren't hoisted.

### 2. For Tests with Heavy Dependencies (like VideoStudio)

Copy the relevant `jest.mock()` calls **directly** into your test file **BEFORE** importing the code under test:

```typescript
import { describe, expect, test, jest } from '@jest/globals';

// ✅ Mocks MUST be in this file to be hoisted
jest.mock('@/timeline', () => ({
  createTimeline: jest.fn(() => ({
    selectedLayer: null,
    addLayers: jest.fn(),
    render: jest.fn()
  }))
}));

jest.mock('@/canvas', () => ({
  createVideoCanvas: jest.fn(() => ({ /* ... */ }))
}));

// NOW import the code under test
import { VideoStudio } from '@/studio/studio';

describe('VideoStudio', () => {
  // Tests here use mocked dependencies
});
```

### 3. For Tests with Simple Dependencies

For components that don't have many external dependencies, you can import `setup-mocks.ts` for reference:

```typescript
import './setup-mocks';  // May work for simple cases
import { MySimpleComponent } from '@/studio/my-component';

describe('MySimpleComponent', () => {
  // Tests here
});
```

**Note:** If you encounter "Cannot read property X of null" errors, it means the real module is being called. Move the mocks directly into your test file.

### 2. Override Mocks (if needed)

You can override specific mock behavior in individual tests:

```typescript
import './setup-mocks';
import { jest } from '@jest/globals';
import { createVideoCanvas } from '@/canvas';

test('custom mock behavior', () => {
  // Override specific method
  (createVideoCanvas as jest.Mock).mockReturnValue({
    ...createVideoCanvas(),
    customProperty: 'custom value'
  });
  
  // Your test here
});
```

### 3. Add New Mocks

If you need to mock a new package:

1. Add mock to `setup-mocks.ts`:
```typescript
jest.mock('@/new-package', () => ({
  exportedFunction: jest.fn(() => 'mock result')
}));
```

2. Document in this file (MOCKING-STRATEGY.md)

---

## Benefits

✅ **Isolation**: Studio tests don't depend on other packages  
✅ **Speed**: Tests run ~10x faster without real I/O  
✅ **Reliability**: No flaky tests from external factors  
✅ **Clarity**: Test failures point to studio code issues  
✅ **Maintainability**: One place to update mocks  

---

## Testing Strategy

### Unit Tests
Test individual studio components in isolation using mocks.

### Integration Tests  
VideoStudio tests verify components work together, but still use mocks for external packages.

### What's NOT Tested
- Actual video rendering/encoding (too slow)
- Real file I/O (environment-dependent)
- AI model inference (requires large downloads)
- Canvas pixel manipulation (not relevant to studio logic)

These are tested in their respective package tests or E2E tests.

---

## Troubleshooting

### "Cannot find module" errors
- Ensure `setup-mocks.ts` is imported **first**
- Check if new package needs to be added to mocks

### "X is not a function" errors
- Check if mock provides the required method
- Update mock in `setup-mocks.ts`

### Type errors with mocks
- Use `as jest.Mock` to cast when needed
- Or use `any` type for test-specific mocks

---

## Related Files

- `tests/studio/setup-mocks.ts` - Centralized package mocks
- `tests/__mocks__/` - CDN import mocks
- `tests/setup.js` - Global browser API mocks
- `jest.config.js` - Jest configuration with moduleNameMapper
- `tests/studio/README.md` - General studio tests documentation

