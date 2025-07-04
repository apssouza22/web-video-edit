# Introduce Unit Testing with Jest

## Implementation Steps

- [x] Set up Jest configuration and dependencies
- [x] Create test directory structure
- [x] Create test utilities and mocks for external dependencies
- [x] Write unit tests for VideoDemuxService
- [x] Write unit tests for FrameService
- [x] Write unit tests for LayerService
- [x] Write unit tests for VideoExportService
- [x] Write unit tests for UserMediaRecordingService
- [x] Write unit tests for TranscriptionService
- [x] Update package.json scripts for testing
- [x] Create test documentation and README

## Service Classes to Test

1. **VideoDemuxService** (`/assets/js/demux/video-demux.js`)
   - Public methods: `setOnProgressCallback`, `setOnCompleteCallback`, `setOnMetadataCallback`, `initDemux`

2. **FrameService** (`/assets/js/frame/frames.js`)
   - Public methods: `adjustTotalTime`, `getTotalTimeInMilSec`, `calculateTotalTimeInMilSec`, `initializeFrames`, `getLength`, `push`, `slice`, `setAnchor`, `isAnchor`, `getFrame`, `getIndex`, `getTime`, `lerp`, `interpolateFrame`, `removeInterval`, `copy`, `update`

3. **LayerService** (`/assets/js/layer/operations.js`)
   - Public methods: `clone`

4. **VideoExportService** (`/assets/js/muxer/video-export.js`)
   - Public methods: `init`, `export`

5. **UserMediaRecordingService** (`/assets/js/record/service.js`)
   - Public methods: `addOnVideoFileCreatedListener`, `startScreenCapture`, `startCameraCapture`

6. **TranscriptionService** (`/assets/js/transcription/transcription.js`)
   - Public methods: `addRemoveIntervalListener`, `addSeekListener`, `removeInterval`, `seekToTimestamp`, `loadModel`, `startTranscription`
