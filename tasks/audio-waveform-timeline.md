# Audio Waveform in Timeline Layer

## Task
Implement audio waveform visualization in the AudioTimelineLayer to display actual audio amplitude data.

## Implementation Steps

- [x] Create `AudioWaveformGenerator` class to extract and cache waveform data from AudioBuffer
- [x] Update `AudioTimelineLayer` to use the waveform generator and override render method
- [x] Test the implementation with audio files

## Technical Notes
- Follow the pattern established by `VideoThumbnailGenerator` for `VideoTimelineLayer`
- Extract samples from `AudioBuffer.getChannelData()`
- Downsample data for efficient rendering
- Draw vertical bars representing amplitude

