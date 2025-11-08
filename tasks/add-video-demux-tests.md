# Task: Add Tests for src/video/demux Package

## Implementation Steps

- [x] Create tests directory structure: `tests/video/demux/`
- [x] Create test file for `video-demux.ts` - VideoDemuxService class
  - [x] Test callback registration methods (setOnProgressCallback, setOnCompleteCallback, setOnMetadataCallback)
  - [x] Test initDemux method with WebCodecs support enabled
  - [x] Test initDemux method with WebCodecs support disabled
  - [x] Test demuxer selection logic (MediaBunny vs CodecDemuxer)
  - [x] Test cleanup method
- [x] Create test file for `mediabunny-demuxer.ts` - MediaBunnyDemuxer class
  - [x] Test callback setter methods
  - [x] Test initialize method with valid file
  - [x] Test initialize method with errors (no video track, unsupported codec, cannot decode)
  - [x] Test frame extraction process
  - [x] Test progress callback invocation during frame extraction
  - [x] Test completion callback with frames
  - [x] Test metadata callback with video metadata
  - [x] Test cleanup method
  - [x] Test setTargetFps method
- [x] Create test file for `index.ts` - createDemuxer factory function
  - [x] Test that createDemuxer returns VideoDemuxService instance
  - [x] Test that returned instance has all required methods
- [x] Run all tests and verify coverage
- [x] Fix any linting issues

