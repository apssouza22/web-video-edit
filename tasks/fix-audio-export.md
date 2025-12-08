# Fix Audio Export Issue

## Problem
Audio is not playing in exported videos because the audio sources are connected but never started during offline rendering.

## Implementation Steps

- [x] Update `#renderAudioOffline()` in `web-codec-exporter.ts` to call `playStart()` after connecting each audio source, respecting the layer's `startTime`

