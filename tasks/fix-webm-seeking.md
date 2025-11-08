# Fix WebM Seeking Issue

## Task: Add proper seeking support for recorded WebM videos

### Problem
WebM files created by MediaRecorder lack a Cues element (keyframe index), making them only seekable in buffered ranges (typically ~1 second). The `webm-duration-fix` library only fixes duration but doesn't add seeking metadata.

### Solution Options

1. **Use ts-ebml to add Cues** (Best solution)
   - Add ts-ebml library to inject proper Cues element
   - Provides full seeking support throughout the video

2. **Increase keyframe frequency** (Partial solution)
   - Reduce timeslice in MediaRecorder
   - Creates more natural seek points
   
3. **Force full buffering** (Workaround)
   - Wait for entire video to buffer before allowing seeks
   - Not practical for large files

### Implementation Steps

#### Phase 1: Research & Setup
- [x] Add ts-ebml CDN import to src/common/utils.ts
- [x] Add TypeScript declarations for ts-ebml in env.d.ts
- [x] Create Jest mock for ts-ebml in tests/__mocks__/
- [x] Update jest.config.js to map ts-ebml CDN URL

#### Phase 2: Enhance fixWebmDuration Function
- [x] Implement Cues injection using ts-ebml library
- [x] Combine duration fixing with Cues metadata addition
- [x] Add comprehensive error handling and fallbacks
- [x] Ensure backward compatibility

#### Phase 3: Testing & Validation
- [x] Update existing utils tests for new functionality
- [x] Add tests for Cues metadata injection
- [ ] Manually test with recorded WebM videos (requires user testing)
- [ ] Verify seeking works throughout entire video (requires user testing)

#### Phase 4: Documentation & Cleanup
- [x] Add detailed code comments explaining EBML/Cues structure
- [x] Update this task file with completion status
- [x] Document any limitations or known issues

### Technical Details

WebM Container Structure:
- EBML Header
- Segment
  - SeekHead (optional)
  - Info (contains duration)
  - Tracks
  - **Cues** (← MISSING - needed for seeking)
  - Cluster (video data)

MediaRecorder only creates the basic structure without Cues.

### Implementation Summary

**What was implemented:**
1. Enhanced `fixWebmDuration()` function in `src/common/utils.ts`
   - Combines duration fixing (webm-duration-fix) with Cues metadata injection (ts-ebml)
   - Two-step process: fix duration first, then add Cues
   - Comprehensive error handling with fallback to duration-fix-only
   
2. Added `addCuesMetadata()` helper function
   - Uses ts-ebml Decoder/Encoder/Reader to parse WebM structure
   - Calls `tools.makeMetadataSeekable()` to inject Cues element
   - Logs success metrics (size, cue points, duration)

3. Added TypeScript support
   - Type declarations in `env.d.ts` for ts-ebml CDN import
   - Proper typing for Decoder, Encoder, Reader, and tools namespace

4. Testing infrastructure
   - Jest mock for ts-ebml in `tests/__mocks__/ts-ebml.js`
   - Comprehensive test suite in `tests/common/utils.test.ts`
   - Module mapper in `jest.config.js` for CDN import

**How it works:**
1. MediaRecorder creates WebM blob → `fixWebmDuration()` called
2. Step 1: webm-duration-fix sets proper Duration element
3. Step 2: ts-ebml reads EBML structure, generates Cues index
4. ts-ebml encodes metadata with Cues + original video data
5. Result: Fully seekable WebM file

**Benefits:**
- Videos are now seekable throughout entire duration
- Not limited to buffered ranges (~1 second)
- Maintains backward compatibility
- Graceful fallback if Cues addition fails
- Works for both recording service and export functionality

### Limitations & Known Issues

1. **Browser Compatibility**
   - Requires modern browsers with MediaRecorder API support
   - ts-ebml library requires ES6+ features
   - CDN imports require network connectivity during initial load

2. **Processing Overhead**
   - Adding Cues metadata adds processing time (typically < 1 second)
   - For very large videos (>100MB), processing may take longer
   - Memory usage temporarily increases during processing

3. **WebM-Specific Solution**
   - Only works for WebM/Matroska container format
   - Does not affect MP4 or other formats from MediaRecorder
   - MP4 files have different seeking mechanisms (moov atom)

4. **Cues Generation**
   - ts-ebml generates Cues based on cluster boundaries
   - Seeking granularity depends on keyframe frequency
   - MediaRecorder's keyframe settings affect seek precision

5. **Error Handling**
   - If Cues addition fails, falls back to duration-fix-only
   - This means seeking may still be limited in rare failure cases
   - Errors are logged to console for debugging

6. **Testing Limitations**
   - Jest mocks simulate Cues addition but don't test actual EBML parsing
   - Full integration testing requires real MediaRecorder blobs
   - Manual testing needed to verify seeking in actual video players

### Manual Testing Instructions

To verify the implementation works correctly:

1. **Record a video:**
   ```
   - Open the app in a browser
   - Start screen or camera recording
   - Record for at least 30 seconds
   - Stop recording
   ```

2. **Test seeking:**
   ```
   - Load the recorded video in the timeline
   - Try seeking to different positions (start, middle, end)
   - Verify immediate response (not just buffered range)
   - Check console logs for "Cues metadata added successfully"
   ```

3. **Check exported videos:**
   ```
   - Export a project using MediaRecorder exporter
   - Download and open in video player (VLC, Chrome, etc.)
   - Test seeking throughout the video
   - Verify smooth seeking without delays
   ```

4. **Verify console output:**
   ```
   Expected logs:
   - "Cues metadata added successfully: { cuePoints: X, duration: Y }"
   - No "Failed to add Cues metadata" warnings
   ```

### Future Enhancements

1. **Keyframe Configuration**
   - Allow users to configure keyframe frequency
   - Add timeslice parameter to MediaRecorder for more seek points
   
2. **Progress Indicator**
   - Show progress during Cues metadata generation for large files
   - Improve user feedback during processing

3. **Alternative Libraries**
   - Investigate webm-writer or other alternatives
   - Consider using WebCodecs API for re-muxing

4. **MP4 Support**
   - Research MP4 seeking metadata requirements
   - Implement similar solution for MP4 format if needed

