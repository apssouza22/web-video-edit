# External Dependencies for Studio Tests

This document lists all external dependencies (packages outside of `src/studio/`) used by the VideoStudio and the mocking requirements for testing.

## Package Dependencies

### 1. @/canvas
**Import:** `createVideoCanvas, VideoCanvas`

**Purpose:** Creates and manages the video canvas for rendering

**DOM Requirements:**
- `#video-canvas` - Container div where the canvas will be mounted

**Mock Setup:**
```javascript
jest.mock('@/canvas', () => ({
  createVideoCanvas: jest.fn(() => ({
    mount: jest.fn(),
    width: 1920,
    height: 1080,
    time: 0,
    total_time: 0,
    playing: false,
    audioContext: {
      createBufferSource: jest.fn(),
      createGain: jest.fn(),
      destination: {}
    },
    layers: [],
    addMedias: jest.fn(),
    setSelectedLayer: jest.fn(),
    render: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    resize: jest.fn()
  }))
}));
```

### 2. @/timeline
**Import:** `createTimeline, Timeline`

**Purpose:** Creates and manages the timeline for media sequencing

**DOM Requirements:**
- `#timeline_content` - Main timeline container
- `#cursor_preview` - Preview tooltip container
  - Must contain: `<canvas>` and `<div>` elements inside
- `#delete-button` - Delete layer button
- `#split-button` - Split layer button  
- `#clone-button` - Clone layer button
- `#timeline_zoom_slider` - Zoom slider input (optional, can be null)

**Mock Setup:**
```javascript
jest.mock('@/timeline', () => {
  const mockTimeline = {
    selectedLayer: null,
    addLayers: jest.fn(),
    render: jest.fn(),
    resize: jest.fn(),
    setSelectedLayer: jest.fn()
  };

  return {
    createTimeline: jest.fn(() => mockTimeline),
    Timeline: jest.fn().mockImplementation(() => mockTimeline)
  };
});
```

**Timeline Sub-components:**

#### PreviewHandler (`src/timeline/preview.ts`)
- Requires: `#cursor_preview` with `<canvas>` and `<div>` children
- Used for: Showing preview thumbnail when hovering over timeline

#### TimeMarker (`src/timeline/time-marker.ts`)
- No DOM requirements
- Used for: Rendering time markers on timeline

#### TimelineZoomHandler (`src/timeline/zoom.ts`)
- Requires: `#timeline_zoom_slider` (optional)
- Used for: Handling zoom functionality

#### DragLayerHandler (`src/timeline/drag.ts`)
- No additional DOM requirements
- Used for: Handling drag operations on timeline layers

### 3. @/media
**Import:** `AbstractMedia, createMediaService, MediaService, AudioLayer`

**Purpose:** Manages media loading, processing, and manipulation

**DOM Requirements:**
- None directly, but media service callbacks may interact with other components

**Mock Setup:**
```javascript
jest.mock('@/media', () => ({
  createMediaService: jest.fn((callback) => ({
    clone: jest.fn((layer) => ({ ...layer, id: layer.id + '-clone' })),
    splitMedia: jest.fn(),
    removeAudioInterval: jest.fn(),
    removeVideoInterval: jest.fn()
  })),
  createMediaFromFile: jest.fn((file, callback) => {
    const mockLayer = {
      id: Math.random().toString(36),
      name: file.name,
      start_time: 0,
      totalTimeInMilSeconds: 5000,
      init: jest.fn(),
      dump: jest.fn(() => ({ id: mockLayer.id }))
    };
    return [mockLayer];
  })
}));
```

### 4. @/video/muxer
**Import:** `createVideoMuxer`

**Purpose:** Handles video export and encoding

**DOM Requirements:**
- None

**Mock Setup:**
```javascript
jest.mock('@/video/muxer', () => ({
  createVideoMuxer: jest.fn(() => ({
    export: jest.fn((progressCallback, completionCallback) => {
      progressCallback?.(50);
      setTimeout(() => {
        progressCallback?.(100);
        completionCallback?.();
      }, 100);
    })
  }))
}));
```

### 5. @/transcription
**Import:** `createTranscriptionService, TranscriptionService`

**Purpose:** Handles audio transcription using ML models

**DOM Requirements:**
- None

**Mock Setup:**
```javascript
jest.mock('@/transcription', () => ({
  createTranscriptionService: jest.fn(() => ({
    loadModel: jest.fn(() => Promise.resolve()),
    startTranscription: jest.fn()
  }))
}));
```

### 6. @/common
**Import:** `PinchHandler, getEventBus, StudioState, etc.`

**Purpose:** Common utilities and state management

**DOM Requirements:**
- PinchHandler: No specific requirements (works with element passed to it)
- EventBus: No requirements
- StudioState: No requirements

**Mock Setup:**
Not typically mocked as these are lightweight utilities, but can be mocked if needed.

## Complete DOM Setup

Here's the complete DOM setup needed for VideoStudio tests:

```javascript
beforeEach(() => {
  document.body.innerHTML = `
    <!-- Canvas container -->
    <div id="video-canvas"></div>
    
    <!-- Header -->
    <div id="header"></div>
    
    <!-- Layers panel -->
    <div id="layers"></div>
    
    <!-- Timeline container -->
    <div id="timeline_content"></div>
    
    <!-- Timeline preview tooltip -->
    <div id="cursor_preview" style="display: none;">
      <canvas width="100" height="100"></canvas>
      <div></div>
    </div>
    
    <!-- Timeline control buttons -->
    <button id="delete-button">Delete</button>
    <button id="split-button">Split</button>
    <button id="clone-button">Clone</button>
    
    <!-- Timeline zoom slider -->
    <input id="timeline_zoom_slider" type="range" min="1" max="10" value="2" />
    
    <!-- Export button -->
    <button id="export">Export</button>
    
    <!-- Speed control -->
    <div id="speed-control-item"></div>
    
    <!-- File picker -->
    <input id="filepicker" type="file" />
    
    <!-- Loading popup -->
    <div id="loading-popup" style="display: none;">
      <div id="loading-title">Loading Media...</div>
      <div id="loading-current-file"></div>
      <div id="loading-progress-fill" style="width: 0%;"></div>
      <div id="loading-progress-text">0%</div>
    </div>
  `;
});
```

## Additional Browser API Mocks

### Global Functions
```javascript
// Mock requestAnimationFrame to prevent infinite loops
global.requestAnimationFrame = jest.fn((callback) => 1) as any;

// Mock alert
global.alert = jest.fn();

// Mock fetch (for loading JSON projects)
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([])
  })
) as any;
```

## Testing Checklist

When testing VideoStudio, ensure:

- [ ] All DOM elements listed above are present
- [ ] All external packages are mocked properly
- [ ] Browser APIs (requestAnimationFrame, alert, fetch) are mocked
- [ ] Canvas 2D context is mocked (handled by jsdom)
- [ ] AudioContext is mocked (handled by tests/setup.js)
- [ ] Event listeners don't cause memory leaks (cleanup in afterEach)

## Troubleshooting

### "Cannot read properties of null (reading 'querySelector')"
- Check that all required DOM elements are present in beforeEach
- Verify element IDs match exactly (case-sensitive)
- Ensure parent-child relationships (e.g., cursor_preview must contain canvas)

### "TypeError: X is not a function"
- Verify all mocks are defined before importing VideoStudio
- Check that mock functions match the expected API
- Ensure jest.mock calls are hoisted (don't put them inside describe blocks)

### Timeline not rendering
- Check that timeline_content exists
- Verify canvas context mock is working
- Ensure resize() is called after setup

### Audio errors
- Check tests/setup.js for AudioContext mocks
- Verify AudioLayer mock if testing audio-specific features

