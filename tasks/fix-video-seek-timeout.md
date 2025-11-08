# Fix Video Seek Timeout Issue

## Task: Fix seek timeout errors when processing recorded videos

### Problem
Recorded videos were failing to load with "Seek timeout" errors because the HTML video demuxer was trying to seek before the video had enough data buffered.

### Implementation Steps

- [x] Change preload attribute from 'metadata' to 'auto' to load more video data upfront
- [x] Add `#waitForVideoReady()` method to wait for video readyState >= 2 before seeking
- [x] Increase seek timeout from 500ms to 2000ms for more reliable seeking
- [x] Add better logging to track video readyState during loading
- [x] Test the implementation

### Changes Made

1. **`html-video-demuxer.js`**
   - Changed `preload='metadata'` to `preload='auto'`
   - Added `#waitForVideoReady()` that waits for 'canplay' event or readyState >= 2
   - Increased `#seekWithTimeout()` timeout from 500ms to 2000ms
   - Added readyState logging for debugging

### Result
Videos now load successfully without seek timeout errors. The demuxer waits for the video to have sufficient data before attempting to extract frames.

