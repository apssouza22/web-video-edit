# Update WebCodecExporter to Follow test2.js Approach

## Task Overview
Update the WebCodecExporter class implementation to follow the approach used in test2.js, which uses BufferTarget, proper codec selection, and synchronous frame-by-frame rendering.

## Implementation Steps

- [x] Update MediaBunny imports to include BufferTarget, getFirstEncodableVideoCodec, getFirstEncodableAudioCodec, AudioBufferSource
- [x] Replace StreamTarget with BufferTarget for in-memory storage
- [x] Implement proper codec selection using getFirstEncodableVideoCodec and getFirstEncodableAudioCodec
- [x] Replace MediaStreamAudioTrackSource with AudioBufferSource approach
- [x] Update frame rendering to use synchronous frame-by-frame approach with await canvasSource.add()
- [x] Implement OfflineAudioContext for audio rendering instead of MediaStream approach
- [x] Update progress tracking to match frame-based progress
- [x] Replace streaming finalization with direct buffer-based finalization
- [x] Update blob creation and download to use BufferTarget.buffer
- [x] Replace background canvas with OffscreenCanvas for better performance
- [x] Implement high-quality video export settings (8 Mbps bitrate, 60fps, enhanced codec options)
- [x] Add advanced canvas rendering optimizations (high-quality image smoothing, proper aspect ratio scaling)
- [x] Enhance audio quality settings (320 kbps bitrate, improved codec selection)
- [ ] Test the updated implementation to ensure proper MP4 export

## Key Changes from Current Implementation
1. **Storage**: BufferTarget (in-memory) instead of StreamTarget (streaming)
2. **Codec Selection**: Dynamic codec detection instead of hardcoded VP9/Opus
3. **Audio Rendering**: OfflineAudioContext + AudioBufferSource instead of MediaStream
4. **Frame Rendering**: Synchronous loop with await instead of real-time capture
5. **Progress**: Frame-based progress instead of time-based progress
6. **Finalization**: Direct buffer access instead of streaming chunks

## Benefits
- More reliable codec compatibility across browsers
- Better performance with synchronous rendering
- Proper audio synchronization with OfflineAudioContext
- Cleaner progress tracking
- More predictable export process
