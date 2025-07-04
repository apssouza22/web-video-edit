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

```

### Individual Test Files

You can also run specific test files:

```bash
# Run specific service tests
npm test  tests/services/frame-service.test.js
npx jest tests/services/frame-service.test.js
```

