# Data Flow Patterns

## Overview

This document describes the major data flow patterns in the Web Video Edit application, showing how data moves through the system from user input to final output.

## 1. Media Upload and Loading Flow

### Complete Upload Pipeline

```mermaid
graph TB
    subgraph "User Input"
        FileInput[File Input Element]
        DragDrop[Drag & Drop]
        RecordedFile[Recorded Video]
    end
    
    subgraph "Initial Processing"
        FileValidation[File Validation<br/>Type, Size]
        LayerLoader[LayerLoader]
        TypeDetection{Detect Type}
    end
    
    subgraph "Type-Specific Loading"
        VideoLoader[VideoLoader]
        AudioLoader[AudioLoader]
        ImageLoader[ImageLoader]
        TextCreation[Text Creation]
    end
    
    subgraph "Content Processing"
        VideoDemux[Video Demuxing]
        AudioDecode[Audio Decoding]
        ImageDecode[Image Loading]
        FrameExtraction[Frame Extraction]
    end
    
    subgraph "Layer Creation"
        VideoMedia[VideoMedia]
        AudioMedia[AudioMedia]
        ImageMedia[ImageMedia]
        TextMedia[TextMedia]
    end
    
    subgraph "Integration"
        EventBus[EventBus<br/>MediaLoadUpdateEvent]
        MediaArray[Media Array]
        Timeline[Timeline Display]
        Canvas[Canvas Player]
    end
    
    FileInput --> FileValidation
    DragDrop --> FileValidation
    RecordedFile --> FileValidation
    
    FileValidation --> LayerLoader
    LayerLoader --> TypeDetection
    
    TypeDetection -->|Video| VideoLoader
    TypeDetection -->|Audio| AudioLoader
    TypeDetection -->|Image| ImageLoader
    TypeDetection -->|Text| TextCreation
    
    VideoLoader --> VideoDemux
    AudioLoader --> AudioDecode
    ImageLoader --> ImageDecode
    
    VideoDemux --> FrameExtraction
    FrameExtraction --> VideoMedia
    AudioDecode --> AudioMedia
    ImageDecode --> ImageMedia
    TextCreation --> TextMedia
    
    VideoMedia --> EventBus
    AudioMedia --> EventBus
    ImageMedia --> EventBus
    TextMedia --> EventBus
    
    EventBus --> MediaArray
    MediaArray --> Timeline
    MediaArray --> Canvas
    
    style LayerLoader fill:#fff3cd
    style EventBus fill:#fff3cd
    style Canvas fill:#d4edda
    style Timeline fill:#d4edda
```

### Detailed Video Loading Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Loader as LayerLoader
    participant VideoLoader
    participant Demux as VideoDemuxService
    participant FrameSvc as FrameService
    participant Layer as VideoMedia
    participant EventBus
    participant Studio

    User->>UI: Upload video medialibrary
    UI->>Loader: loadMedia(medialibrary)
    
    Loader->>VideoLoader: loadVideo(medialibrary)
    VideoLoader->>Demux: initDemux(medialibrary)
    
    Demux->>Demux: Select demuxer strategy
    
    loop Progress Updates
        Demux->>FrameSvc: Store frames
        Demux->>VideoLoader: Progress callback (%)
        VideoLoader->>Layer: Update progress
        Layer->>EventBus: emit(MediaLoadUpdateEvent)
        EventBus->>Studio: Update UI
    end
    
    Demux->>VideoLoader: Complete callback
    VideoLoader->>Layer: Set metadata
    Layer->>Layer: ready = true
    Layer->>EventBus: emit(MediaLoadUpdateEvent, 100%)
    EventBus->>Studio: Add to timeline
    Studio->>Studio: Render timeline & canvas
```

---

## 2. Playback Flow

### Real-time Playback Pipeline

```mermaid
graph TB
    subgraph "Playback Control"
        PlayButton[Play Button]
        PauseButton[Pause Button]
        SeekBar[Seek Bar]
    end
    
    subgraph "Player Core"
        Player[VideoCanvas]
        RenderLoop[requestAnimationFrame Loop]
        TimeManagement[Time Management]
    end
    
    subgraph "Layer Rendering"
        LayerIteration[Iterate Media Layers]
        ActiveCheck{Layer Active<br/>at Time?}
        CanvasLayer[Canvas Layer Renderer]
    end
    
    subgraph "Media Rendering"
        VideoRender[Video Frame Render]
        AudioPlayback[Audio Playback]
        ImageRender[Image Render]
        TextRender[Text Render]
    end
    
    subgraph "Audio System"
        AudioContext[Web Audio Context]
        AudioSource[Audio Buffer Source]
        AudioScheduling[Audio Scheduling]
    end
    
    subgraph "Output"
        Canvas[Canvas 2D Context]
        AudioOutput[Audio Output]
        TimelineSync[Timeline Sync]
    end
    
    PlayButton --> Player
    PauseButton --> Player
    SeekBar --> Player
    
    Player --> RenderLoop
    RenderLoop --> TimeManagement
    TimeManagement --> LayerIteration
    
    LayerIteration --> ActiveCheck
    ActiveCheck -->|Yes| CanvasLayer
    ActiveCheck -->|No| LayerIteration
    
    CanvasLayer --> VideoRender
    CanvasLayer --> AudioPlayback
    CanvasLayer --> ImageRender
    CanvasLayer --> TextRender
    
    VideoRender --> Canvas
    ImageRender --> Canvas
    TextRender --> Canvas
    
    AudioPlayback --> AudioContext
    AudioContext --> AudioSource
    AudioSource --> AudioScheduling
    AudioScheduling --> AudioOutput
    
    Player --> TimelineSync
    
    style Player fill:#d4edda
    style RenderLoop fill:#fff3cd
    style Canvas fill:#e1f5ff
```

### Frame-by-Frame Playback Logic

```mermaid
sequenceDiagram
    participant RAF as requestAnimationFrame
    participant Player as VideoCanvas
    participant Layers as Media Layers
    participant Canvas as Canvas 2D
    participant Audio as Web Audio
    participant EventBus

    loop Animation Frame
        RAF->>Player: render(timestamp)
        Player->>Player: Calculate delta time
        
        alt Playing
            Player->>Player: time += deltaTime
            Player->>EventBus: emit(PlayerTimeUpdateEvent)
        end
        
        Player->>Player: ctx.clearRect()
        
        loop For each layer
            Player->>Layers: Check if active at time
            
            alt Layer is active
                Layers->>Layers: Get frame at time
                Layers->>Canvas: Render frame
                Layers->>Audio: Update audio position
            end
        end
        
        Player->>Player: Draw overlays
        RAF->>Player: Schedule next frame
    end
```

---

## 3. Timeline Interaction Flow

### Layer Manipulation on Timeline

```mermaid
graph TB
    subgraph "User Actions"
        Click[Click Layer]
        Drag[Drag Layer]
        Resize[Resize Handle]
        ContextMenu[Right Click]
    end
    
    subgraph "Event Handling"
        MouseHandler[Mouse Event Handler]
        DragHandler[Drag Handler]
        HitTest[Hit Test Detection]
    end
    
    subgraph "Timeline Updates"
        TimeCalc[Time Calculation]
        PositionUpdate[Update Layer Position]
        DurationUpdate[Update Duration]
        Validation[Validate Bounds]
    end
    
    subgraph "State Management"
        LayerUpdate[Update Layer State]
        EventEmit[Emit Timeline Event]
        EventBus[EventBus]
    end
    
    subgraph "Visual Updates"
        TimelineRender[Redraw Timeline]
        PlayerUpdate[Update Player]
        CanvasRender[Redraw Canvas]
    end
    
    Click --> MouseHandler
    Drag --> MouseHandler
    Resize --> MouseHandler
    ContextMenu --> MouseHandler
    
    MouseHandler --> HitTest
    HitTest --> DragHandler
    
    DragHandler --> TimeCalc
    TimeCalc --> PositionUpdate
    TimeCalc --> DurationUpdate
    
    PositionUpdate --> Validation
    DurationUpdate --> Validation
    
    Validation --> LayerUpdate
    LayerUpdate --> EventEmit
    EventEmit --> EventBus
    
    EventBus --> TimelineRender
    EventBus --> PlayerUpdate
    PlayerUpdate --> CanvasRender
    
    style EventBus fill:#fff3cd
    style DragHandler fill:#e1f5ff
```

### Layer Split Flow

```mermaid
sequenceDiagram
    participant User
    participant Timeline
    participant MediaService
    participant Original as Original Layer
    participant Clone as New Layer
    participant EventBus
    participant Player

    User->>Timeline: Split at time marker
    Timeline->>Timeline: Get selected layer
    Timeline->>Timeline: Get split time
    
    Timeline->>MediaService: splitMedia(layer, time)
    
    MediaService->>Original: Calculate split index
    MediaService->>Clone: Create clone
    
    par Split frames
        MediaService->>Original: Remove frames before split
        MediaService->>Original: Adjust startTime
    and
        MediaService->>Clone: Keep frames before split
        MediaService->>Clone: Set duration
    end
    
    MediaService->>Timeline: Return clone
    Timeline->>EventBus: emit(TimelineLayerUpdateEvent, 'split')
    EventBus->>Player: Add new layer
    Timeline->>Timeline: Render both layers
    Player->>Player: Update canvas
```

---

## 4. Export Flow

### Complete Export Pipeline

```mermaid
graph TB
    subgraph "User Configuration"
        ExportBtn[Export Button]
        QualitySelect[Quality Selection]
        FormatSelect[Format Selection]
        FPSSelect[FPS Selection]
    end
    
    subgraph "Export Service"
        ExportService[VideoExportService]
        StrategySelect{Select Strategy}
        Config[Export Config]
    end
    
    subgraph "Rendering Pipeline"
        FrameGen[Frame Generation]
        Player[VideoCanvas Render]
        AudioMix[Audio Mixing]
    end
    
    subgraph "Encoding"
        MediaRecorderEnc[MediaRecorder Encode]
        WebCodecEnc[WebCodec Encode]
    end
    
    subgraph "Processing"
        Muxing[Audio/Video Muxing]
        BlobCreation[Create Blob]
        MetadataFix[Fix Metadata]
    end
    
    subgraph "Output"
        Download[Download File]
        Success[Success Notification]
    end
    
    ExportBtn --> ExportService
    QualitySelect --> Config
    FormatSelect --> Config
    FPSSelect --> Config
    
    ExportService --> StrategySelect
    Config --> StrategySelect
    
    StrategySelect -->|Simple| MediaRecorderEnc
    StrategySelect -->|Advanced| WebCodecEnc
    
    ExportService --> FrameGen
    FrameGen --> Player
    FrameGen --> AudioMix
    
    Player --> MediaRecorderEnc
    Player --> WebCodecEnc
    AudioMix --> MediaRecorderEnc
    AudioMix --> WebCodecEnc
    
    MediaRecorderEnc --> Muxing
    WebCodecEnc --> Muxing
    
    Muxing --> BlobCreation
    BlobCreation --> MetadataFix
    MetadataFix --> Download
    Download --> Success
    
    style ExportService fill:#f8d7da
    style Player fill:#d4edda
```

### Export Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Export as ExportService
    participant Player as VideoCanvas
    participant Encoder
    participant Browser

    User->>UI: Click Export
    UI->>UI: Show config dialog
    User->>UI: Configure quality/format
    UI->>Export: startExport(config)
    
    Export->>Export: Select encoder strategy
    Export->>Player: Prepare for export
    Player->>Player: Stop playback
    Player->>Player: Reset time to 0
    
    loop For each frame
        Export->>Player: renderFrame(time)
        Player->>Player: Render all layers
        Player->>Export: Frame data
        Export->>Encoder: encode(frame)
        Export->>UI: Progress update
    end
    
    Export->>Encoder: flush()
    Encoder->>Export: Complete
    Export->>Export: Create blob
    Export->>Browser: Download blob
    Export->>UI: Show success
```

---

## 5. Recording to Edit Flow

### End-to-End Recording Integration

```mermaid
graph TB
    subgraph "Recording Phase"
        RecordBtn[Record Button]
        Capture[Screen/Camera Capture]
        Recording[MediaRecorder]
        Chunks[Chunk Storage]
    end
    
    subgraph "Processing Phase"
        StopBtn[Stop Button]
        BlobCreate[Create Blob]
        DurationFix[Fix Duration]
        FileCreate[Create File]
    end
    
    subgraph "Integration Phase"
        EventEmit[Emit RecordVideoFileCreatedEvent]
        EventBus[EventBus]
        Studio[VideoStudio]
    end
    
    subgraph "Loading Phase"
        LayerLoader[LayerLoader]
        VideoLoad[Video Loading]
        Demux[Demuxing]
        LayerCreate[Create VideoMedia]
    end
    
    subgraph "Editor Phase"
        Timeline[Add to Timeline]
        Canvas[Add to Canvas]
        Ready[Ready for Editing]
    end
    
    RecordBtn --> Capture
    Capture --> Recording
    Recording --> Chunks
    
    StopBtn --> BlobCreate
    Chunks --> BlobCreate
    BlobCreate --> DurationFix
    DurationFix --> FileCreate
    
    FileCreate --> EventEmit
    EventEmit --> EventBus
    EventBus --> Studio
    
    Studio --> LayerLoader
    LayerLoader --> VideoLoad
    VideoLoad --> Demux
    Demux --> LayerCreate
    
    LayerCreate --> Timeline
    LayerCreate --> Canvas
    Timeline --> Ready
    Canvas --> Ready
    
    style EventBus fill:#fff3cd
    style Recording fill:#d1ecf1
    style Demux fill:#f8d7da
```

---

## 6. Transcription Flow

### AI Transcription Pipeline

```mermaid
graph TB
    subgraph "Input"
        VideoMedia[Video Layer]
        AudioExtract[Extract Audio]
    end
    
    subgraph "Transcription Service"
        TransService[TranscriptionService]
        Worker[Web Worker]
        AIModel[Transformers.js Model]
    end
    
    subgraph "Processing"
        AudioProcess[Process Audio]
        SpeechToText[Speech to Text]
        Timestamps[Generate Timestamps]
    end
    
    subgraph "Output"
        TranscriptUI[Transcript UI]
        WordList[Word List with Times]
        InteractiveView[Interactive View]
    end
    
    subgraph "Actions"
        SeekToWord[Seek to Word]
        RemoveInterval[Remove Interval]
        Export[Export Transcript]
    end
    
    VideoMedia --> AudioExtract
    AudioExtract --> TransService
    TransService --> Worker
    Worker --> AIModel
    
    AIModel --> AudioProcess
    AudioProcess --> SpeechToText
    SpeechToText --> Timestamps
    
    Timestamps --> TranscriptUI
    TranscriptUI --> WordList
    WordList --> InteractiveView
    
    InteractiveView --> SeekToWord
    InteractiveView --> RemoveInterval
    InteractiveView --> Export
    
    style TransService fill:#e2d5f0
    style Worker fill:#fff3cd
```

---

## 7. Event-Driven Data Flow

### Cross-Component Communication

```mermaid
graph TB
    subgraph "Publishers"
        Player[VideoCanvas]
        Timeline[Timeline]
        UI[UI Controls]
        MediaLoader[Media Loader]
        Recording[Recording Service]
    end
    
    subgraph "Event Bus"
        EventBus[Central EventBus]
    end
    
    subgraph "Event Types"
        PlayerEvents[Player Events<br/>Time, Transform]
        TimelineEvents[Timeline Events<br/>Layer Updates]
        UIEvents[UI Events<br/>Speed, Aspect]
        MediaEvents[Media Events<br/>Load Progress]
        RecordEvents[Record Events<br/>File Created]
    end
    
    subgraph "Subscribers"
        TimelineUI[Timeline UI]
        PlayerUI[Player UI]
        Studio[Studio]
        Controls[Controls]
        MediaLayers[Media Layers]
    end
    
    Player --> PlayerEvents
    Timeline --> TimelineEvents
    UI --> UIEvents
    MediaLoader --> MediaEvents
    Recording --> RecordEvents
    
    PlayerEvents --> EventBus
    TimelineEvents --> EventBus
    UIEvents --> EventBus
    MediaEvents --> EventBus
    RecordEvents --> EventBus
    
    EventBus -.-> TimelineUI
    EventBus -.-> PlayerUI
    EventBus -.-> Studio
    EventBus -.-> Controls
    EventBus -.-> MediaLayers
    
    style EventBus fill:#fff3cd
```

### Event Flow Example: Time Synchronization

```mermaid
sequenceDiagram
    participant Timeline
    participant EventBus
    participant Player
    participant Audio
    participant UI

    Note over Timeline,UI: User seeks on timeline
    
    Timeline->>EventBus: emit(TimelineTimeUpdateEvent)
    
    par Notify all subscribers
        EventBus->>Player: time changed
        EventBus->>Audio: time changed
        EventBus->>UI: time changed
    end
    
    Player->>Player: setTime(newTime)
    Audio->>Audio: Refresh audio sources
    UI->>UI: Update time display
    
    Note over Timeline,UI: Playback starts
    
    loop Every frame
        Player->>EventBus: emit(PlayerTimeUpdateEvent)
        EventBus->>Timeline: time updated
        Timeline->>Timeline: Move time marker
    end
```

---

## 8. Clip Settings Update Flow

Shows how clip property changes flow through the system when a user edits clip properties.

```mermaid
sequenceDiagram
    participant User
    participant Timeline
    participant EventBus
    participant ClipSettingsView
    participant ClipSettingsService
    participant AbstractClip
    participant Canvas

    User->>Timeline: Select clip
    Timeline->>EventBus: emit(TimelineLayerUpdateEvent, 'select')
    EventBus->>ClipSettingsService: Clip selected
    ClipSettingsService->>ClipSettingsView: updateClip(selectedClip)
    ClipSettingsView->>ClipSettingsView: Populate property fields

    User->>ClipSettingsView: Change property (e.g., x: 100)
    ClipSettingsView->>ClipSettingsService: handlePropertyChange('x', 100)
    ClipSettingsService->>ClipSettingsService: Throttle update (16ms)
    ClipSettingsService->>AbstractClip: update({x: 100}, currentTime)
    AbstractClip->>AbstractClip: Update all frames
    AbstractClip->>AbstractClip: Reset render cache
    ClipSettingsService->>EventBus: emit(PlayerLayerTransformedEvent)
    EventBus->>Canvas: Re-render frame
    EventBus->>Timeline: Update layer display
```

### Key Points
- Updates are throttled to 60fps (16ms) for smooth performance during real-time editing
- Transform properties (x, y, scale, rotation) use the `update()` method to modify all frames
- Timing properties (startTime, duration) use direct setters for immediate effect
- Speed changes use the SpeedController for pitch-preserved playback
- Render cache is invalidated to force visual refresh after property changes
- Event-driven architecture keeps Canvas and Timeline synchronized

---

## 9. State Management Flow

### Global State Updates

```mermaid
graph TB
    subgraph "State Sources"
        UserAction[User Actions]
        PlayerState[Player State]
        LoadingState[Loading State]
    end
    
    subgraph "State Container"
        StudioState[StudioState Singleton]
        StateProps[State Properties]
    end
    
    subgraph "State Consumers"
        UI[UI Components]
        Player[Player]
        Timeline[Timeline]
        Controls[Controls]
    end
    
    UserAction --> StudioState
    PlayerState --> StudioState
    LoadingState --> StudioState
    
    StudioState --> StateProps
    
    StateProps -.-> UI
    StateProps -.-> Player
    StateProps -.-> Timeline
    StateProps -.-> Controls
    
    style StudioState fill:#fff3cd
```

**State Properties**:
- Playing state (play/pause)
- Selected layer
- Current time
- Zoom level
- Aspect ratio
- Loading progress

---

## Data Flow Principles

### 1. Unidirectional Flow
Data flows in one direction: User Action → Processing → State Update → UI Update

### 2. Event-Driven Updates
Components communicate through events, not direct calls

### 3. Centralized State
Critical state lives in singletons (StudioState, EventBus)

### 4. Async Operations
Heavy operations (demuxing, transcription) run asynchronously with progress updates

### 5. Lazy Loading
Resources loaded on-demand to minimize initial load time

### 6. Memory Management
Large data (frames, audio buffers) cleaned up when not needed

### 7. Progressive Enhancement
Features degrade gracefully when APIs unavailable

---

## Performance Considerations

### 1. Frame Caching
Rendered frames cached to avoid re-rendering

### 2. Web Workers
Heavy processing (demuxing, transcription) in workers

### 3. Request Animation Frame
Smooth 60fps playback using RAF

### 4. Debouncing
UI updates debounced to avoid excessive renders

### 5. Virtual Scrolling
Timeline uses virtual scrolling for many layers

### 6. Lazy Frame Extraction
Frames extracted progressively during load

### 7. Audio Scheduling
Web Audio scheduled ahead for glitch-free playback

