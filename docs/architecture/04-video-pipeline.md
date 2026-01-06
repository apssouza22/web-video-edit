# Video Processing Pipeline

## Overview

The video processing pipeline handles video from import through demuxing, frame extraction, playback, and export. The system supports multiple demuxing and muxing strategies based on browser capabilities and video format.

## Complete Video Pipeline

```mermaid
graph TB
    subgraph "Input Stage"
        UserFile[User File Upload]
        RecordedVideo[Recorded Video]
    end
    
    subgraph "Loading & Detection"
        VideoLoader[VideoLoader]
        FormatDetect{Detect Format<br/>& Codec}
        BrowserCheck{Check Browser<br/>Support}
    end
    
    subgraph "Demuxing Strategy"
        DemuxService[VideoDemuxService<br/>Strategy Orchestrator]
        
        MediaBunny[MediaBunny Demuxer<br/>Modern Codecs]
        MP4Box[MP4Box Demuxer<br/>MP4 Files<br/>Web Worker]
        HTML5[HTML5 Video Demuxer<br/>Fallback Strategy]
    end
    
    subgraph "Frame Processing"
        FrameExtract[Frame Extraction]
        Canvas2D[Canvas2D Render]
        FrameService[Frame Service<br/>Frame Storage]
        FrameQuality[Quality Adjustment]
    end
    
    subgraph "Clip Layer"
        VideoMedia[VideoMedia/ComposedMedia<br/>Clip Representation]
        Metadata[Video Metadata<br/>FPS, Duration, Size]
    end
    
    subgraph "Playback Pipeline"
        Player[VideoCanvas<br/>Player]
        RenderLoop[Render Loop<br/>requestAnimationFrame]
        TimeSync[Time Synchronization]
        CanvasRender[Canvas Rendering]
    end
    
    subgraph "Export Pipeline"
        ExportService[VideoExportService<br/>Strategy Orchestrator]
        
        MediaRecorderExp[MediaRecorder Exporter<br/>Simple Export]
        WebCodecExp[WebCodec Exporter<br/>Advanced Export]
        
        ExportConfig[Export Configuration<br/>Quality, Format, FPS]
    end
    
    subgraph "Output Stage"
        VideoBlob[Video Blob]
        Download[Download File]
    end
    
    UserFile --> VideoLoader
    RecordedVideo --> VideoLoader
    
    VideoLoader --> FormatDetect
    FormatDetect --> BrowserCheck
    BrowserCheck --> DemuxService
    
    DemuxService --> MediaBunny
    DemuxService --> MP4Box
    DemuxService --> HTML5
    
    MediaBunny --> FrameExtract
    MP4Box --> FrameExtract
    HTML5 --> FrameExtract
    
    FrameExtract --> Canvas2D
    Canvas2D --> FrameService
    FrameService --> FrameQuality
    
    FrameService --> VideoMedia
    Metadata --> VideoMedia
    
    VideoMedia --> Player
    Player --> RenderLoop
    RenderLoop --> TimeSync
    TimeSync --> CanvasRender
    
    VideoMedia --> ExportService
    Player --> ExportService
    ExportService --> ExportConfig
    ExportConfig --> MediaRecorderExp
    ExportConfig --> WebCodecExp
    
    MediaRecorderExp --> VideoBlob
    WebCodecExp --> VideoBlob
    VideoBlob --> Download
    
    style DemuxService fill:#f8d7da
    style ExportService fill:#f8d7da
    style VideoMedia fill:#fff3cd
    style Player fill:#d4edda
    style FrameService fill:#e1f5ff
```

## Demuxing Pipeline

### Strategy Selection

```mermaid
flowchart TD
    Start[Video File] --> CheckWebCodecs{WebCodecs<br/>Supported?}
    
    CheckWebCodecs -->|No| HTML5Fallback[Use HTML5 Video Demuxer]
    CheckWebCodecs -->|Yes| CheckFormat{Video Format?}
    
    CheckFormat -->|WebM/MKV| UseMediaBunny[Use MediaBunny Demuxer]
    CheckFormat -->|MP4| UseMP4Box[Use MP4Box Demuxer]
    CheckFormat -->|Other| UseMediaBunny
    
    HTML5Fallback --> Extract[Extract Frames]
    UseMediaBunny --> Extract
    UseMP4Box --> Extract
    
    Extract --> Process[Process & Store Frames]
    Process --> Complete[Ready for Playback]
    
    style HTML5Fallback fill:#ffc107
    style UseMediaBunny fill:#28a745
    style UseMP4Box fill:#007bff
```

### MediaBunny Demuxer

**Purpose**: Modern demuxer for WebM, MKV, and other formats using WebCodecs.

```mermaid
sequenceDiagram
    participant Loader as VideoLoader
    participant Demux as MediaBunnyDemuxer
    participant MediaBunny as MediaBunny Library
    participant Decoder as VideoDecoder
    participant Canvas as Canvas2D
    participant Frame as FrameService

    Loader->>Demux: initialize(medialibrary, canvas)
    Demux->>MediaBunny: Load video data
    MediaBunny->>MediaBunny: Parse container
    MediaBunny->>Decoder: Create VideoDecoder
    
    loop For each frame
        MediaBunny->>Decoder: Decode frame
        Decoder->>Canvas: Render to canvas
        Canvas->>Frame: Store frame data
        Demux->>Loader: Progress callback
    end
    
    Demux->>Loader: Complete callback
    Demux->>Loader: Metadata callback
```

**Key Features**:
- Uses native VideoDecoder API
- Efficient memory usage
- Progress tracking
- Supports modern codecs (VP8, VP9, AV1)

---

### MP4Box Demuxer

**Purpose**: Demux MP4 files using MP4Box.js in a Web Worker.

```mermaid
sequenceDiagram
    participant Loader as VideoLoader
    participant Demux as CodecDemuxer
    participant Worker as DemuxWorker
    participant MP4Box as MP4Box.js
    participant VideoDecoder
    participant AudioDecoder
    participant Main as Main Thread

    Loader->>Demux: initialize(medialibrary)
    Demux->>Worker: Create Web Worker
    Demux->>Worker: Send medialibrary buffer
    
    Worker->>MP4Box: Initialize
    MP4Box->>MP4Box: Parse MP4 structure
    MP4Box->>MP4Box: Extract tracks
    
    par Video Track
        MP4Box->>VideoDecoder: Decode video
        VideoDecoder->>Main: Send video frames
    and Audio Track
        MP4Box->>AudioDecoder: Decode audio
        AudioDecoder->>Main: Send audio data
    end
    
    Main->>Demux: Receive frames
    Demux->>Loader: Progress updates
    Demux->>Loader: Complete
```

**Key Features**:
- Runs in Web Worker (non-blocking)
- Handles MP4 container format
- Separate video and audio decoding
- Supports H.264, H.265

**Worker Communication**:
```javascript
// Messages to worker
{ type: 'start', arrayBuffer: videoData }
{ type: 'stop' }

// Messages from worker
{ type: 'progress', progress: 50 }
{ type: 'videoFrame', frame: videoFrame }
{ type: 'audioData', data: audioData }
{ type: 'complete' }
```

---

### HTML5 Video Demuxer

**Purpose**: Fallback strategy using HTML5 video element when WebCodecs is unavailable.

```mermaid
sequenceDiagram
    participant Loader as VideoLoader
    participant Demux as HTMLVideoDemuxer
    participant Video as HTMLVideoElement
    participant Canvas as Canvas2D
    participant Frame as FrameService

    Loader->>Demux: initialize(medialibrary)
    Demux->>Video: Create video element
    Demux->>Video: Set video source
    Video->>Video: Load metadata
    Video->>Demux: metadata loaded
    
    loop Extract frames
        Demux->>Video: seekToTime(time)
        Video->>Video: Seek complete
        Demux->>Canvas: drawImage(video)
        Canvas->>Frame: Capture frame
        Demux->>Loader: Progress update
    end
    
    Demux->>Loader: Complete
```

**Key Features**:
- Browser compatibility (works everywhere)
- No special codec support needed
- Sequential frame extraction
- Automatic frame quality detection
- Slower than WebCodecs

**Frame Quality Optimization**:
```typescript
// Adjusts extraction based on video duration
class FrameQuality {
  determineQuality(duration: number): Quality {
    if (duration < 60) return 'high';      // < 1 min: extract all frames
    if (duration < 300) return 'medium';   // < 5 min: extract every 2nd
    return 'low';                          // > 5 min: extract every 3rd
  }
}
```

---

## Frame Management

### Frame Service Architecture

```mermaid
graph TB
    subgraph "Frame Collection"
        Input[Video Frames]
        FrameArray[Frame Array<br/>Indexed Storage]
        FrameMetadata[Frame Metadata<br/>Timestamp, Index]
    end
    
    subgraph "Frame Operations"
        Store[Store Frame]
        Retrieve[Retrieve Frame]
        Interpolate[Interpolate Between Frames]
        Adjust[Adjust Frame Timing]
    end
    
    subgraph "Usage"
        Render[Render at Time]
        Speed[Speed Control]
        Split[Frame Split]
    end
    
    Input --> Store
    Store --> FrameArray
    Store --> FrameMetadata
    
    FrameArray --> Retrieve
    FrameMetadata --> Retrieve
    
    Retrieve --> Interpolate
    Adjust --> Interpolate
    
    Interpolate --> Render
    Interpolate --> Speed
    Interpolate --> Split
    
    style FrameArray fill:#e1f5ff
    style Interpolate fill:#fff3cd
```

### Frame Retrieval

```typescript
class FrameService {
  // Get frame at specific time
  getFrameAtTime(time: number, fps: number): Frame {
    const frameIndex = Math.floor((time / 1000) * fps);
    return this.frames[frameIndex] || this.frames[this.frames.length - 1];
  }
  
  // Interpolate between frames for smooth playback
  interpolateFrame(frame1: Frame, frame2: Frame, ratio: number): Frame {
    // Blending logic for smooth transitions
  }
}
```

---

## Export Pipeline

### Export Strategy Selection

```mermaid
flowchart TD
    Start[Export Request] --> CheckCodecs{WebCodecs<br/>Available?}
    
    CheckCodecs -->|Yes| CheckConfig{User Config?}
    CheckCodecs -->|No| UseMediaRecorder[MediaRecorder Exporter]
    
    CheckConfig -->|High Quality| UseWebCodec[WebCodec Exporter]
    CheckConfig -->|Standard| UseMediaRecorder
    
    UseMediaRecorder --> ConfigMR[Configure MediaRecorder<br/>Codec, Bitrate]
    UseWebCodec --> ConfigWC[Configure WebCodecs<br/>Encoder Settings]
    
    ConfigMR --> Render[Render Frames]
    ConfigWC --> Render
    
    Render --> Encode[Encode Video]
    Encode --> Mux[Mux Audio/Video]
    Mux --> Blob[Create Blob]
    Blob --> Download[Download File]
    
    style UseWebCodec fill:#28a745
    style UseMediaRecorder fill:#007bff
```

### MediaRecorder Exporter

**Purpose**: Simple export using MediaRecorder API with canvas stream.

```mermaid
sequenceDiagram
    participant User
    participant Export as VideoExportService
    participant Exporter as MediaRecorderExporter
    participant Player as VideoCanvas
    participant Recorder as MediaRecorder
    participant Stream as CanvasStream

    User->>Export: exportVideo()
    Export->>Exporter: export(player)
    Exporter->>Player: canvas.captureStream()
    Player->>Stream: Return MediaStream
    
    Exporter->>Recorder: new MediaRecorder(stream)
    Recorder->>Recorder: start()
    
    Exporter->>Player: play()
    
    loop Until video ends
        Player->>Player: render frame
        Player->>Stream: Update stream
        Stream->>Recorder: Capture frame
    end
    
    Player->>Exporter: onended
    Exporter->>Recorder: stop()
    Recorder->>Exporter: ondataavailable
    Exporter->>User: Download blob
```

**Advantages**:
- Simple implementation
- Wide browser support
- Automatic encoding
- Real-time capture

**Limitations**:
- Quality depends on canvas stream
- Limited codec control
- Cannot export faster than real-time

---

### WebCodec Exporter

**Purpose**: Advanced export with full control over encoding settings.

```mermaid
sequenceDiagram
    participant Export as VideoExportService
    participant Exporter as WebCodecExporter
    participant Player as VideoCanvas
    participant Encoder as VideoEncoder
    participant Muxer as Video Muxer

    Export->>Exporter: export(player, config)
    Exporter->>Encoder: Configure encoder
    
    loop For each frame
        Exporter->>Player: renderFrame(time)
        Player->>Exporter: Canvas frame
        Exporter->>Encoder: encode(frame)
        Encoder->>Muxer: Encoded chunk
    end
    
    Exporter->>Encoder: flush()
    Encoder->>Muxer: Final chunks
    Muxer->>Exporter: Complete video
    Exporter->>Export: Download blob
```

**Advantages**:
- Full quality control
- Custom bitrate and codec
- Can export faster than real-time
- Better compression

**Configuration**:
```typescript
interface ExportConfig {
  codec: 'h264' | 'vp8' | 'vp9' | 'av1';
  width: number;
  height: number;
  framerate: number;
  bitrate: number;  // bits per second
}
```

---

## Performance Optimizations

### 1. Web Worker for Heavy Processing
MP4Box demuxing runs in a Web Worker to avoid blocking the main thread.

### 2. Progressive Frame Loading
Frames are loaded progressively with progress callbacks.

### 3. Frame Quality Adaptation
HTML5 demuxer adjusts extraction rate based on video duration.

### 4. Canvas Caching
Frames are cached to avoid re-decoding.

### 5. Async Frame Extraction
Frames are extracted asynchronously to maintain UI responsiveness.

---

## Error Handling

### Demuxing Errors
```typescript
try {
  await demuxer.initialize(medialibrary, renderer);
} catch (error) {
  if (error.name === 'UnsupportedFormatError') {
    // Try fallback demuxer
  } else if (error.name === 'CorruptedFileError') {
    // Show error to user
  }
}
```

### Export Errors
```typescript
try {
  await exporter.export(player, config);
} catch (error) {
  if (error.name === 'CodecNotSupportedError') {
    // Fall back to MediaRecorder
  } else if (error.name === 'ExportTimeoutError') {
    // Retry with lower quality
  }
}
```

---

## Codec Support Matrix

| Codec | MediaBunny | MP4Box | HTML5 | Export |
|-------|------------|--------|-------|--------|
| H.264 | ✅ | ✅ | ✅ | ✅ |
| H.265 | ✅ | ✅ | ⚠️ | ⚠️ |
| VP8 | ✅ | ❌ | ✅ | ✅ |
| VP9 | ✅ | ❌ | ✅ | ✅ |
| AV1 | ✅ | ❌ | ⚠️ | ⚠️ |

✅ Full support  
⚠️ Browser-dependent  
❌ Not supported

---

## Video Metadata

```typescript
interface VideoMetadata {
  duration: number;        // milliseconds
  width: number;          // pixels
  height: number;         // pixels
  fps: number;            // frames per second
  codec: string;          // codec name
  frames: Frame[];        // extracted frames
  hasAudio: boolean;      // audio track present
}
```

---

## Best Practices

### 1. Progressive Enhancement
Use the best available demuxer, fall back gracefully.

### 2. Memory Management
Clean up video elements and decoders when done.

### 3. Progress Feedback
Always provide progress updates during long operations.

### 4. Error Recovery
Implement fallback strategies for unsupported formats.

### 5. Quality vs Performance
Balance frame extraction quality with performance needs.

