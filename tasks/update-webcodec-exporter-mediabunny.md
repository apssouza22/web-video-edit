# Update WebCodecExporter to use MediaBunny

## Implementation Steps

- [x] Restore MediaBunny imports and setup
  - [x] Import CanvasSource, MediaStreamAudioTrackSource, Mp4OutputFormat, Output, QUALITY_MEDIUM, StreamTarget
  - [x] Remove MediaRecorder-related imports
  - [x] Update class properties for MediaBunny components

- [x] Implement proper MediaBunny output configuration
  - [x] Create Output with Mp4OutputFormat and StreamTarget
  - [x] Set up WritableStream for chunk collection
  - [x] Configure fragmented MP4 format for streaming

- [x] Create canvas-based video source
  - [x] Use CanvasSource with studio player canvas
  - [x] Configure VP9 codec with proper settings
  - [x] Set up frame rate and quality parameters

- [x] Implement audio source integration
  - [x] Create MediaStreamAudioTrackSource for audio layers
  - [x] Set up audio context and stream destination
  - [x] Configure Opus codec for audio encoding

- [x] Add frame capture logic
  - [x] Implement proper frame timing mechanism
  - [x] Add frame capture interval with real-time constraints
  - [x] Handle frame dropping for performance

- [x] Handle export lifecycle
  - [x] Implement proper start sequence
  - [x] Add progress tracking based on playback time
  - [x] Handle finalization and cleanup

- [x] Maintain aspect ratio support
  - [x] Ensure canvas dimensions respect aspect ratio manager
  - [x] Test with different aspect ratios
  - [x] Verify export quality and format
