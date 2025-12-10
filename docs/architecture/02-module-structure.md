# Module Structure

## Package Organization

The application is organized into domain-driven modules under `src/`. Each module is self-contained and follows single responsibility principle.
<img src="package-organisation.png" alt="System Architecture Overview" width="800"/>

## Module Responsibilities

### 📦 studio/
**Responsibility**: Main application orchestration and UI control

**Key Classes**:
- `VideoStudio` - Main orchestrator, initializes all subsystems
- `StudioEventHandler` - Handles DOM events and user interactions
- `StudioControls` - Playback and export controls
- `ControlsHandler` - Media transformation controls
- `LayerLoader` - Loads mediaclip files into layers
- `DragHandler` - Canvas drag and transform functionality
- `AspectRatioSelector` - Aspect ratio management
- `SpeedControlInput` - Speed adjustment UI
- `LoadingPopup` - Loading state UI

**Dependencies**: canvas, timeline, mediaclip, video, audio, recording, transcription, common

---

### 🎨 canvas/
**Responsibility**: Video canvas rendering and playback

**Key Classes**:
- `VideoCanvas` - Main player with render loop and time management
- `CanvasLayer` - Individual layer rendering with transformations

**Features**:
- 2D canvas rendering
- Audio synchronization via Web Audio API
- Layer transformations (move, resize, rotate)
- Playback controls
- Time-based rendering

**Dependencies**: mediaclip, common

---

### ⏱️ timeline/
**Responsibility**: Timeline UI and mediaclip arrangement

**Key Classes**:
- `Timeline` - Timeline manager
- `TimelineLayer` - Base timeline layer renderer
- `TimelineLayerFactory` - Creates specific timeline layer types
- `TimelineLayerRender` - Orchestrates layer rendering on timeline
- `AudioTimelineLayer`, `VideoTimelineLayer`, `ImageTimelineLayer`, `TextTimelineLayer` - Type-specific renderers

**Features**:
- Visual timeline representation
- Drag and drop mediaclip
- Zoom and pan
- Time marker
- Layer reordering
- Waveform display for audio

**Dependencies**: mediaclip, common

---

### 🎬 mediaclip/
**Responsibility**: Media layer abstractions and operations

**Key Classes**:
- `AbstractMedia` - Base class for all mediaclip types
- `VideoMedia` - Video mediaclip layer
- `AudioMedia` - Audio mediaclip layer
- `ImageMedia` - Image mediaclip layer
- `TextMedia` - Text mediaclip layer
- `MediaService` - Media operations (split, clone, remove intervals)
- `SpeedController` - Speed adjustment logic

**Features**:
- Unified mediaclip interface
- Frame-based rendering
- Time-based operations
- Speed control
- Transform properties

**Dependencies**: audio, frame, common

---

### 🎥 video/
**Responsibility**: Video demuxing and muxing

#### video/demux/
**Key Classes**:
- `VideoDemuxService` - Demuxing strategy orchestrator
- `MediaBunnyDemuxer` - MediaBunny-based demuxing
- `CodecDemuxer` - MP4Box.js demuxing (Web Worker)
- `HTMLVideoDemuxer` - HTML5 video fallback

**Features**:
- Multiple demuxing strategies
- Automatic codec detection
- Frame extraction
- Metadata extraction
- Progress tracking

#### video/muxer/
**Key Classes**:
- `VideoExportService` - Export orchestrator
- `MediaRecorderExporter` - MediaRecorder API export
- `WebCodecExporter` - WebCodecs API export

**Features**:
- Multiple export strategies
- Format selection
- Quality control
- Progress tracking

**Dependencies**: frame, canvas, common

---

### 🔊 audio/
**Responsibility**: Audio processing and manipulation

**Key Classes**:
- `AudioLoader` - Loads and decodes audio
- `AudioSource` - Audio source management
- `AudioCutter` - Audio cutting operations
- `AudioSplitHandler` - Audio splitting logic
- `PitchPreservationProcessor` - Maintains pitch during speed changes

**Features**:
- Audio decoding
- Audio buffer management
- Pitch preservation
- Audio splitting
- Web Audio API integration

**Dependencies**: common

---

### 📹 recording/
**Responsibility**: Screen and camera recording

**Key Classes**:
- `UserMediaRecordingService` - Recording orchestrator
- `RecordingPreview` - Live preview component
- `RecordControls` - Recording UI controls

**Features**:
- Screen capture (getDisplayMedia)
- Camera capture (getUserMedia)
- MediaRecorder integration
- Preview during recording
- Audio mixing (screen + microphone)
- Memory management
- WebM duration fixing

**Dependencies**: common

---

### 📝 transcription/
**Responsibility**: AI-powered speech-to-text

**Key Classes**:
- `TranscriptionService` - Transcription orchestrator
- `TranscriptionView` - Transcription UI
- `TranscriptionModel` - AI model management (Web Worker)

**Features**:
- Speech-to-text using Transformers.js
- Word-level timestamps
- Interactive transcript
- Seek to timestamp
- Remove intervals based on transcript

**Dependencies**: common

---

### 🖼️ frame/
**Responsibility**: Frame management and extraction

**Key Classes**:
- `FrameService` - Frame collection management
- `Frame` - Individual frame representation
- `FrameAdjust` - Frame adjustment utilities

**Features**:
- Frame storage and retrieval
- Frame interpolation
- Frame quality management

**Dependencies**: common

---

### 🎭 animation/
**Responsibility**: Animation utilities

**Key Classes**:
- Animation helpers for smooth transitions

**Dependencies**: None

---

### 🛠️ common/
**Responsibility**: Shared utilities and infrastructure

**Key Classes**:
- `EventBus` - Centralized event system
- `StudioState` - Global state singleton
- `Utils` - Utility functions
- `BrowserSupport` - Browser capability detection
- `Render2D` - Canvas rendering utilities
- `PinchHandler` - Touch/pinch gesture handling

**Features**:
- Type-safe events
- Global state management
- Browser detection
- Utility functions
- Touch support

**Dependencies**: None (foundation module)

---

## Module Dependency Rules

### ✅ Allowed Dependencies
1. Any module can depend on `common/`
2. Higher-level modules (studio) can depend on lower-level modules (mediaclip, canvas, timeline)
3. Services can depend on domain modules within their scope

### ❌ Forbidden Dependencies
1. `common/` should not depend on any domain module
2. Domain modules should not depend on `studio/`
3. Circular dependencies between domain modules
4. Direct coupling between parallel domains (use EventBus instead)

### Communication Pattern
Modules communicate through:
1. **EventBus** for decoupled communication
2. **Factory functions** for object creation
3. **Dependency injection** via constructors
4. **Callbacks** for specific operations

## File Naming Conventions

- **kebab-case** for all files and directories
- **PascalCase** for classes
- **camelCase** for functions and variables
- **UPPER_SNAKE_CASE** for constants

Examples:
- `video-demux.ts` contains `VideoDemuxService`
- `timeline-layer-factory.ts` contains `TimelineLayerFactory`
- `event-bus.ts` contains `EventBus`

## Module Interfaces

### Typical Module Structure
```
module-name/
├── index.ts           # Public API exports
├── types.ts           # TypeScript types/interfaces
├── main-class.ts      # Main class implementation
├── helper-class.ts    # Helper classes
└── utils.ts           # Module-specific utilities
```

### Index Files
Each major module has an `index.ts` that exports the public API:
- Hides internal implementation details
- Provides clean import paths
- Acts as the module boundary

Example:
```typescript
// src/video/demux/index.ts
export { VideoDemuxService } from './video-demux';
export function createDemuxer(): VideoDemuxService {
  return new VideoDemuxService(/*...*/);
}
```

## Testing Structure

Tests mirror the source structure under `tests/`:
```
tests/
├── audio/              # Audio module tests
├── video/              # Video module tests
├── studio/             # Studio module tests
├── common/             # Common module tests
└── setup.js            # Jest setup and mocks
```

Test files use `.test.ts` or `.spec.ts` extension.

