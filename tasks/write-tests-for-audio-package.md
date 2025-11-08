# Write Tests for Audio Package

## Task: Create comprehensive test suites for all classes in src/audio package

### Implementation Steps

- [x] Enhance AudioContext mock in tests/setup.js
  - Add createBuffer() method support
  - Add decodeAudioData() method support  
  - Add close() method support
  - Create mock AudioBuffer with getChannelData() support

- [x] Create tests/audio/ directory

- [x] Write AudioCutter tests (tests/audio/audio-cutter.test.ts)
  - Test successful interval removal
  - Test validation of inputs (invalid buffer, context, time ranges)
  - Test edge cases (empty result, full removal, boundary conditions)
  - Test multi-channel audio handling

- [x] Write AudioLoader tests (tests/audio/audio-loader.test.ts)
  - Test successful audio file loading
  - Test FileReader error handling
  - Test decodeAudioData error handling
  - Test dispose method

- [x] Write AudioSource tests (tests/audio/audio-source.test.ts)
  - Test connect/disconnect methods
  - Test start method
  - Test pitch handling for different speeds
  - Test volume handling

- [x] Write AudioSplitHandler tests (tests/audio/audio-split-handler.test.ts)
  - Test successful audio splitting
  - Test validation (out of bounds, invalid times)
  - Test buffer segment creation
  - Test multi-channel handling

- [x] Write PitchPreservationProcessor tests (tests/audio/pitch-preservation-processor.test.ts)
  - Test pitch-preserved buffer creation
  - Test caching mechanism
  - Test time-stretching at different speeds
  - Test cache clearing

- [x] Run tests and verify coverage

