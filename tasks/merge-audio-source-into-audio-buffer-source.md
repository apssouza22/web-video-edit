# Merge AudioSource into AudioBufferSource

## Goal
Merge `AudioSource` functionality into `AudioBufferSource` so `AudioMedia` depends only on `AudioBufferSource`.

## Implementation Steps

- [x] Enhance `AudioBufferSource` with playback capabilities from `AudioSource`
- [x] Update `AudioMedia` to use `AudioBufferSource` directly for playback
- [x] Update exports in `medialayer/audio/index.ts`
- [x] Update tests to work with new `AudioBufferSource`
- [x] Delete obsolete `audio-source.ts` file

