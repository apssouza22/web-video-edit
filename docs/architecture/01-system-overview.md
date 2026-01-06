# System Overview Architecture

## High-Level Architecture

This diagram shows the main components of the Web Video Edit application and their relationships.
<img src="system-overview.png" alt="System Architecture Overview" width="800"/>

## Component Descriptions

### User Interface Layer
- **HTML/CSS UI**: Static HTML structure and styles
- **Studio Controls**: Play/pause, export, settings buttons
- **Timeline Component**: Visual timeline for mediaclip arrangement
- **Video Canvas Display**: Main canvas for video preview

### Core Orchestration
- **VideoStudio**: Main orchestrator that initializes and coordinates all subsystems
- **EventBus**: Centralized event system for decoupled communication
- **StudioState**: Singleton managing global application state

### Clip Management
- **MediaService**: Handles clip operations (split, clone, remove intervals)
- **LayerLoader**: Manages loading of different clip types
- **Clip Layers**: Abstract clip representations (Video, Audio, Image, Text, Caption, Shape, Composed)

### Playback & Rendering
- **VideoCanvas**: Main player component with render loop
- **Canvas Layers**: Individual layer renderers with transformations
- **Web Audio API**: Audio playback synchronization

### Timeline System
- **Timeline**: Timeline manager handling display and interactions
- **Timeline Layers**: Visual representations of clips on timeline
- **Time Marker**: Current time indicator
- **Timeline Cursor**: Cursor state management for drag operations
- **Drag & Drop Handler**: Clip manipulation on timeline

### Settings System
- **ClipSettingsService**: Manages clip property updates
- **ClipSettingsView**: UI panel for editing clip properties

**Integration**:
- Subscribes to PlayerLayerTransformedEvent (canvas updates)
- Subscribes to TimelineLayerUpdateEvent (selection changes)
- Updates clips via AbstractClip.update() method
- Throttles updates for performance (16ms/60fps)

**Properties Managed**:
- Transform: x, y, scale, rotation
- Timing: startTime, duration, speed
- Audio: volume (for audio clips)

### Video Processing
- **VideoDemuxService**: Orchestrates video demuxing strategy
- **MP4Box Demuxer**: MP4 demuxing using MP4Box.js (in Web Worker)
- **MediaBunny Demuxer**: Alternative demuxer using MediaBunny
- **HTML5 Video Demuxer**: Fallback using HTML5 video element
- **Frame Service**: Frame extraction and management

### Export System
- **VideoExportService**: Manages video export strategy
- **MediaRecorder Exporter**: Export using MediaRecorder API
- **WebCodec Exporter**: Export using WebCodecs API

### Recording System
- **UserMediaRecordingService**: Screen/camera recording orchestration
- **Recording Preview**: Live preview during recording
- **MediaStream API**: Capture display or camera

### AI Features
- **TranscriptionService**: Manages video transcription
- **Transformers.js Model**: AI model for speech-to-text

### Audio Processing
- **Audio Loader**: Loads and decodes audio files
- **Audio Split Handler**: Handles audio splitting operations
- **Pitch Preservation**: Maintains pitch during speed changes

## Communication Patterns

### Event-Driven Communication (shown with dotted lines)
Components communicate through the EventBus rather than direct coupling:
- Player emits time updates → Timeline synchronizes
- Timeline emits layer updates → Player refreshes
- Record emits video file created → Studio loads clip
- UI emits speed changes → Clip layers adjust
- Settings emits property changes → Clips update

### Direct Dependencies (shown with solid lines)
Some components have direct relationships:
- Studio manages lifecycle of all subsystems
- LayerLoader uses Demux services to load video
- Player renders CanvasLayers
- Export uses Player for rendering frames

## Initialization Flow

```mermaid
sequenceDiagram
    participant Main
    participant Studio
    participant EventBus
    participant Player
    participant Timeline
    participant Services

    Main->>Studio: initStudio()
    Studio->>Studio: constructor()
    Studio->>Player: new VideoCanvas()
    Studio->>Timeline: new Timeline()
    Studio->>Services: Create services
    Studio->>EventBus: Register listeners
    Studio->>Studio: init()
    Studio->>Player: mount(container)
    Studio->>Timeline: mount(container)
    Studio->>Studio: Start render loop
    Studio-->>Main: Return studio instance
```

## Data Flow Summary

1. **User uploads clip** → LayerLoader → Demux/AudioLoader → Clip Layer → EventBus (load update)
2. **User interacts with timeline** → Timeline → EventBus → Player updates
3. **User edits clip properties** → ClipSettingsView → ClipSettingsService → AbstractClip.update() → EventBus → Canvas/Timeline refresh
4. **Playback** → Player render loop → Canvas Layers → Clip Layers render
5. **Export** → VideoExportService → Player renders frames → MediaRecorder/WebCodec → Download
6. **Recording** → UserMediaRecordingService → MediaStream → MediaRecorder → EventBus → Studio loads

## Technology Integration

### Web APIs Used
- **Canvas 2D API**: Video rendering and effects
- **Web Audio API**: Audio playback and synchronization
- **MediaRecorder API**: Recording and export
- **WebCodecs API**: Advanced video encoding/decoding
- **MediaStream API**: Screen and camera capture
- **File API**: File handling and reading

### External Libraries
- **MP4Box.js**: MP4 demuxing in Web Worker
- **MediaBunny**: Alternative video demuxing
- **Transformers.js**: AI transcription
- **webm-duration-fix**: Fix WebM duration metadata

## Design Patterns

1. **Singleton Pattern**: StudioState, EventBus
2. **Factory Pattern**: Timeline layer creation, Demuxer creation
3. **Observer Pattern**: EventBus pub/sub system
4. **Strategy Pattern**: Multiple demuxer strategies
5. **Facade Pattern**: VideoStudio as system facade

