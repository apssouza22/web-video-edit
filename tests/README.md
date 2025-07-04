# Unit Testing Documentation

This directory contains comprehensive unit tests for the video-demux application using Jest.

## Overview

The test suite covers all service classes in the application, focusing on testing public methods and ensuring proper functionality, error handling, and integration scenarios.

## Test Structure

```
tests/
├── README.md                           # This documentation
├── setup.js                           # Jest global setup and mocks
├── mocks/                             # Mock utilities
│   ├── dom-mocks.js                   # DOM element mocks
│   └── layer-mocks.js                 # Layer class mocks
└── services/                          # Service class tests
    ├── video-demux-service.test.js    # VideoDemuxService tests
    ├── frame-service.test.js          # FrameService tests
    ├── layer-service.test.js          # LayerService tests
    ├── video-export-service.test.js   # VideoExportService tests
    ├── user-media-recording-service.test.js # UserMediaRecordingService tests
    └── transcription-service.test.js  # TranscriptionService tests
```

## Running Tests

### Prerequisites

Install the required dependencies:

```bash
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

### Individual Test Files

You can also run specific test files:

```bash
# Run specific service tests
npx jest tests/services/video-demux-service.test.js
npx jest tests/services/frame-service.test.js
npx jest tests/services/layer-service.test.js
```

## Test Coverage

The test suite covers the following service classes:

### 1. VideoDemuxService (`/assets/js/demux/video-demux.js`)
- **Public Methods Tested:**
  - `setOnProgressCallback()` - Sets progress update callback
  - `setOnCompleteCallback()` - Sets completion callback
  - `setOnMetadataCallback()` - Sets metadata callback
  - `initDemux()` - Initializes video demuxing

- **Test Coverage:**
  - Callback setting and validation
  - Integration with HTMLVideoDemuxer
  - Error handling scenarios
  - Method chaining workflows

### 2. FrameService (`/assets/js/frame/frames.js`)
- **Public Methods Tested:**
  - `adjustTotalTime()` - Adjusts total time duration
  - `getTotalTimeInMilSec()` - Gets total time in milliseconds
  - `calculateTotalTimeInMilSec()` - Calculates time based on frames
  - `initializeFrames()` - Initializes frame array
  - `getLength()` - Gets frame count
  - `push()` - Adds new frame
  - `slice()` - Removes frames
  - `setAnchor()` / `isAnchor()` - Anchor frame management
  - `getFrame()` - Gets frame at specific time
  - `getIndex()` / `getTime()` - Time/index conversion
  - `lerp()` / `interpolateFrame()` - Frame interpolation
  - `removeInterval()` - Removes time interval
  - `copy()` / `update()` - Frame array operations

- **Test Coverage:**
  - Frame initialization and manipulation
  - Time calculations and conversions
  - Linear interpolation algorithms
  - Anchor frame management
  - Integration workflows

### 3. LayerService (`/assets/js/layer/operations.js`)
- **Public Methods Tested:**
  - `clone()` - Clones different layer types

- **Test Coverage:**
  - VideoLayer cloning with properties
  - AudioLayer cloning with audio buffer
  - ImageLayer cloning
  - TextLayer cloning
  - Error handling for unknown layer types
  - Load update listener integration

### 4. VideoExportService (`/assets/js/muxer/video-export.js`)
- **Public Methods Tested:**
  - `init()` - Initializes export button event listener
  - `export()` - Handles video export process

- **Test Coverage:**
  - Export button initialization
  - JSON export (shift+click)
  - Regular video export workflow
  - MediaRecorder vs WebCodec exporter selection
  - Progress and completion callbacks
  - Loading popup integration
  - Error scenarios

### 5. UserMediaRecordingService (`/assets/js/record/service.js`)
- **Public Methods Tested:**
  - `addOnVideoFileCreatedListener()` - Sets file creation callback
  - `startScreenCapture()` - Starts screen recording
  - `startCameraCapture()` - Starts camera recording

- **Test Coverage:**
  - Screen capture with microphone
  - Camera capture
  - Browser support detection
  - Media stream handling
  - Event listener setup (track ended, errors)
  - Recording interruption handling
  - Stream combination logic

### 6. TranscriptionService (`/assets/js/transcription/transcription.js`)
- **Public Methods Tested:**
  - `addRemoveIntervalListener()` - Sets interval removal callback
  - `addSeekListener()` - Sets seek callback
  - `removeInterval()` - Removes transcription interval
  - `seekToTimestamp()` - Seeks to specific timestamp
  - `loadModel()` - Loads transcription model
  - `startTranscription()` - Starts audio transcription

- **Test Coverage:**
  - Worker message handling (progress, complete, error, etc.)
  - Callback management
  - Audio buffer processing
  - Model loading workflow
  - Transcription workflow integration
  - Error handling scenarios

## Mocking Strategy

### Global Mocks (setup.js)
- **Web APIs:** MediaRecorder, VideoDecoder, navigator.mediaDevices
- **Canvas/2D Context:** Complete canvas rendering API
- **Audio APIs:** AudioContext, audio buffer handling
- **Worker API:** Web Worker with message handling
- **Performance APIs:** requestAnimationFrame, performance.now

### Service-Specific Mocks
- **DOM Elements:** Button, input, canvas elements with event handling
- **Layer Classes:** VideoLayer, AudioLayer, ImageLayer, TextLayer
- **External Dependencies:** HTMLVideoDemuxer, exporters, views

## Best Practices

### Test Organization
- Each service has its own test file
- Tests are grouped by method using `describe()` blocks
- Individual test cases use descriptive names
- Setup and teardown in `beforeEach()` and `afterEach()`

### Test Types
- **Unit Tests:** Individual method functionality
- **Integration Tests:** Method interactions and workflows
- **Error Handling:** Edge cases and error scenarios
- **Callback Tests:** Async operations and event handling

### Assertions
- Use specific matchers (`toBe`, `toEqual`, `toHaveBeenCalledWith`)
- Test both positive and negative scenarios
- Verify mock function calls and parameters
- Check return values and state changes

## Troubleshooting

### Common Issues

1. **Import Errors:** Ensure all mocks are properly set up in `setup.js`
2. **Async Tests:** Use `async/await` or `done()` callback for async operations
3. **Mock Cleanup:** Always clear mocks in `afterEach()` to prevent test interference
4. **Browser APIs:** Use the provided mocks for Web APIs not available in Node.js

### Debugging Tests

```bash
# Run with verbose output
npm run test:verbose

# Run specific test with debugging
npx jest --verbose tests/services/frame-service.test.js

# Run with coverage to see untested code
npm run test:coverage
```

## Contributing

When adding new service classes or methods:

1. Create corresponding test files in `tests/services/`
2. Follow the existing naming convention: `service-name.test.js`
3. Include unit tests for all public methods
4. Add integration tests for complex workflows
5. Update this README with new test coverage information
6. Ensure all tests pass before submitting changes

## Dependencies

- **Jest:** Testing framework
- **@jest/environment-jsdom:** DOM environment for browser API testing
- **jest-environment-jsdom:** JSDOM environment setup

For more information about Jest, visit: https://jestjs.io/
