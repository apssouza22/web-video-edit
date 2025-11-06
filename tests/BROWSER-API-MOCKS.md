# Browser API Mocks for Testing

This document lists all browser APIs that have been mocked in `tests/setup.js` for Jest/jsdom testing.

## Overview

jsdom provides a basic DOM implementation but doesn't include all browser APIs. This setup file adds mocks for missing APIs that are used in the codebase.

## Complete List of Mocked APIs

### Event APIs

#### PointerEvent
**Why needed:** Touch and mouse pointer interactions  
**Used by:** DragItemHandler, touch gesture handling

```javascript
global.PointerEvent = class PointerEvent extends Event {
  constructor(type, options = {}) {
    // Properties: pointerId, pointerType, clientX/Y, offsetX/Y, 
    // button, buttons, pressure, tilt, twist, isPrimary
  }
};
```

#### DragEvent
**Why needed:** Drag and drop operations  
**Used by:** StudioControls for file drag/drop

```javascript
global.DragEvent = class DragEvent extends Event {
  constructor(type, options = {}) {
    this.dataTransfer = {
      items: [], files: [], types: [],
      getData, setData, clearData, setDragImage,
      effectAllowed, dropEffect
    };
  }
};
```

#### ClipboardEvent
**Why needed:** Copy/paste operations  
**Used by:** StudioControls for paste handling

```javascript
global.ClipboardEvent = class ClipboardEvent extends Event {
  constructor(type, options = {}) {
    this.clipboardData = {
      items: [], files: [], types: [],
      getData, setData, clearData
    };
  }
};
```

### Media APIs

#### AudioContext / OfflineAudioContext
**Why needed:** Audio processing and manipulation  
**Used by:** Audio layers, media processing

```javascript
global.AudioContext = class AudioContext {
  currentTime = 0;
  sampleRate = 44100;
  createBufferSource() { /* ... */ }
  createGain() { /* ... */ }
  resume() { /* ... */ }
  suspend() { /* ... */ }
};
```

#### MediaRecorder
**Why needed:** Video/audio recording  
**Used by:** Video export, recording features

```javascript
global.MediaRecorder = class MediaRecorder {
  constructor(stream, options) { /* ... */ }
  start() { /* ... */ }
  stop() { /* ... */ }
  pause() { /* ... */ }
  resume() { /* ... */ }
  static isTypeSupported() { return true; }
};
```

#### HTMLVideoElement Properties
**Why needed:** Video dimensions  
**Used by:** Video layers, player

```javascript
Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  get: function() { return this._videoWidth || 1920; }
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  get: function() { return this._videoHeight || 1080; }
});
```

### Canvas APIs

#### HTMLCanvasElement.getContext('2d')
**Why needed:** Canvas rendering operations  
**Used by:** Canvas layers, video rendering

```javascript
HTMLCanvasElement.prototype.getContext = function(contextType) {
  if (contextType === '2d') {
    return {
      canvas: this,
      fillRect, clearRect, drawImage,
      save, restore, translate, rotate, scale,
      // ... all 2D context methods
    };
  }
  return null;
};
```

#### HTMLCanvasElement.transferControlToOffscreen
**Why needed:** Offscreen canvas support  
**Used by:** Background rendering

```javascript
HTMLCanvasElement.prototype.transferControlToOffscreen = function() {
  return this;
};
```

### Text Encoding APIs

#### TextEncoder
**Why needed:** Convert strings to bytes  
**Used by:** HuggingFace Transformers, binary data processing

```javascript
global.TextEncoder = class TextEncoder {
  encode(str) {
    const buf = Buffer.from(str, 'utf-8');
    return new Uint8Array(buf);
  }
};
```

#### TextDecoder
**Why needed:** Convert bytes to strings  
**Used by:** HuggingFace Transformers, binary data processing

```javascript
global.TextDecoder = class TextDecoder {
  constructor(encoding = 'utf-8') {
    this.encoding = encoding;
  }
  decode(buffer) {
    return Buffer.from(buffer).toString(this.encoding);
  }
};
```

### Worker & Crypto APIs

#### Worker
**Why needed:** Web worker support  
**Used by:** Background processing, video demuxing

```javascript
global.Worker = class Worker {
  constructor(scriptURL, options) {
    this.scriptURL = scriptURL;
    this.onmessage = null;
    this.onerror = null;
  }
  postMessage(message) { /* ... */ }
  terminate() { /* ... */ }
  addEventListener(event, handler) { /* ... */ }
  removeEventListener(event, handler) { /* ... */ }
};
```

#### crypto.randomUUID
**Why needed:** Generate unique IDs  
**Used by:** Layer IDs, unique identifiers

```javascript
global.crypto.randomUUID = () => {
  return 'test-uuid-' + Math.random().toString(36).substring(2, 15);
};
```

### Navigator APIs

#### navigator.mediaDevices
**Why needed:** Media device access  
**Used by:** Screen recording, media capture

```javascript
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getDisplayMedia: () => Promise.resolve({})
  }
});
```

#### navigator.userAgent
**Why needed:** Browser detection  
**Used by:** Browser compatibility checks

```javascript
Object.defineProperty(global.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (test)'
});
```

### Other APIs

#### document.getElementById for 'background'
**Why needed:** Special handling for background element  
**Used by:** Background rendering

```javascript
const originalGetElementById = document.getElementById.bind(document);
document.getElementById = function(id) {
  if (id === 'background') {
    const bgElement = document.createElement('div');
    bgElement.id = 'background';
    return bgElement;
  }
  return originalGetElementById(id);
};
```

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

## Usage

These mocks are automatically loaded for all tests via `jest.config.js`:

```javascript
setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
```

No additional imports needed in test files - all mocks are globally available.

## Adding New Mocks

If you encounter a new "X is not defined" error in tests:

1. **Identify the missing API** from the error message
2. **Add the mock to `tests/setup.js`**:
   ```javascript
   global.MyNewAPI = class MyNewAPI {
     // Mock implementation
   };
   ```
3. **Document it here** with why it's needed and where it's used
4. **Test it** by running the failing test again

## Common Patterns

### For Event APIs
```javascript
global.MyEvent = class MyEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    // Add custom properties
  }
};
```

### For Classes with Methods
```javascript
global.MyAPI = class MyAPI {
  constructor(options) {
    // Initialize
  }
  myMethod() {
    // Mock implementation
  }
};
```

### For Global Objects
```javascript
if (typeof global.myAPI === 'undefined') {
  global.myAPI = {
    method: () => { /* mock */ }
  };
}
```

### For Properties
```javascript
Object.defineProperty(MyClass.prototype, 'myProperty', {
  get: function() { return this._myProperty || defaultValue; },
  set: function(value) { this._myProperty = value; }
});
```

## Testing the Mocks

To verify mocks work correctly:

```javascript
test('should use mocked API', () => {
  const event = new PointerEvent('pointerdown', { clientX: 100 });
  expect(event.clientX).toBe(100);
  
  const encoder = new TextEncoder();
  const encoded = encoder.encode('test');
  expect(encoded).toBeInstanceOf(Uint8Array);
});
```

## Summary

**Total Browser APIs Mocked: 15+**

- ✅ Event APIs: PointerEvent, DragEvent, ClipboardEvent
- ✅ Media APIs: AudioContext, MediaRecorder, HTMLVideoElement properties
- ✅ Canvas APIs: getContext('2d'), transferControlToOffscreen
- ✅ Text APIs: TextEncoder, TextDecoder
- ✅ Worker APIs: Worker
- ✅ Crypto APIs: crypto.randomUUID
- ✅ Navigator APIs: mediaDevices, userAgent
- ✅ CDN Imports: HuggingFace Transformers, webm-duration-fix

All mocks are maintained in:
- **Browser APIs**: `tests/setup.js`
- **CDN Imports**: `tests/__mocks__/`
- **Configuration**: `jest.config.js`

