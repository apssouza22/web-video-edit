# CLAUDE.md

This medialibrary provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web Video Edit is a browser-based video editor that combines AI and modern web technologies. It enables users to edit videos entirely in the browser without downloads or installations. The application uses vanilla JavaScript/TypeScript with ES Modules, Vite for bundling, and various Web APIs (Canvas, WebCodecs, MediaRecorder) for video processing.

**Demo**: https://apssouza22.github.io/web-video-edit/index.html

## Development Commands

### Setup and Development
```bash
npm install          # Install dependencies
npm start           # Start dev server (Vite) at http://localhost:8001
npm run dev         # Alias for npm start
npm run build       # Build for production
npm run preview     # Preview production build
```

### Testing
```bash
npm test                    # Run all tests (requires --experimental-vm-modules flag)
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
```

**Note**: Jest uses ECMAScript modules, requiring the `--experimental-vm-modules` Node flag (handled automatically in package.json scripts).

## Architecture

### High-Level Design

The application follows an **event-driven architecture** with a centralized `EventBus` for component communication. This enables loose coupling between modules.

**Key Design Patterns**:
- **Singleton**: `StudioState`, `EventBus`
- **Factory**: `TimelineLayerFactory`, `createDemuxer()`, `createVideoMuxer()`
- **Observer**: EventBus pub/sub system
- **Strategy**: Multiple demuxer/muxer implementations
- **Facade**: `VideoStudio` orchestrates all subsystems

### Module Structure

The codebase is organized into domain-driven packages under `src/`:

- **`studio/`**: Main orchestration, UI controls, and event handling
- **`canvas/`**: Video canvas rendering and playback (`VideoCanvas`, `CanvasLayer`)
- **`timeline/`**: Timeline UI, drag/drop, and layer visualization
- **`mediaclip/`**: Media layer abstractions (`AbstractMedia`, `VideoMedia`, `AudioMedia`, `ImageMedia`, `TextMedia`)
- **`video/`**: Video demuxing (MP4Box, MediaBunny, HTML5) and muxing (MediaRecorder, WebCodecs)
- **`audio/`**: Audio processing, pitch preservation, and Web Audio API integration
- **`record/`**: Screen/camera recording using MediaRecorder API
- **`transcription/`**: AI-powered speech-to-text using Transformers.js
- **`frame/`**: Frame extraction, storage, and management
- **`common/`**: Shared utilities, EventBus, StudioState, browser detection

**Dependency Rules**:
- All modules can depend on `common/`
- Higher-level modules (studio) can depend on lower-level modules
- `common/` should NOT depend on domain modules
- Domain modules should NOT depend on `studio/`
- Use EventBus for cross-domain communication (avoid direct coupling)

### Event System

Components communicate through typed events via the centralized EventBus. Key events include:

- `player:timeUpdate` - Playback time changes (VideoCanvas → Timeline, Controls)
- `player:layerTransformed` - Layer moved/scaled/rotated (CanvasLayer → Timeline)
- `timeline:timeUpdate` - User scrubs timeline (Timeline → VideoCanvas)
- `timeline:layerUpdate` - Layers added/removed/reordered (Timeline → VideoCanvas, Studio)
- `transcription:removeInterval` - Remove audio/video intervals (TranscriptionView → MediaService)
- `transcription:seek` - Seek to timestamp (TranscriptionView → Timeline, Canvas)
- `ui:speedChange` - Playback speed changed (SpeedControl → Media layers)
- `ui:aspectRatioChange` - Canvas aspect ratio changed (AspectRatioSelector → Canvas)
- `mediaclip:loadUpdate` - Media loading progress (MediaLoader → Studio, LoadingPopup)
- `record:videoFileCreated` - Recording complete (RecordService → Studio)

See `docs/architecture/03-event-system.md` for detailed event flow diagrams.

### Video Processing Pipeline

1. **Demuxing**: Video files → Frame extraction
   - Strategy selection: MP4Box.js (Web Worker) → MediaBunny → HTML5 Video (fallback)
   - Codec detection and format support
   - Progress tracking via callbacks

2. **Rendering**: Frames → Canvas 2D rendering
   - Layer transformations (position, scale, rotation)
   - Time-based frame selection
   - Caching to avoid redundant renders

3. **Export**: Canvas → Encoded video
   - Strategy selection: MediaRecorder API → WebCodecs API
   - Audio synchronization via Web Audio API

## Code Style and Conventions

### TypeScript Migration
The codebase is **incrementally migrating from JavaScript to TypeScript**:
- New code MUST be written in TypeScript
- Existing code is gradually converted
- `allowJs: true` enables mixed JS/TS

### File and Class Naming
- **Files**: `kebab-case` (e.g., `video-demux.ts`, `timeline-layer-factory.ts`)
- **Classes**: `PascalCase` (e.g., `VideoDemuxService`, `TimelineLayerFactory`)
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

### Class Structure
- **One class per medialibrary** (use PascalCase for class name matching medialibrary name)
- **Private methods** for helpers not intended for external use (use `#privateMethod()` or `private` keyword)
- **Avoid global variables/functions** - encapsulate within classes
- **Avoid package coupling** - use EventBus for cross-package communication

### Import Aliases
Use the `@/` alias for absolute imports:
```typescript
import { EventBus } from '@/common';
import { VideoMedia } from '@/mediaclip';
import { Timeline } from '@/timeline';
```

This is configured in `tsconfig.json` (`paths`) and `jest.config.js` (`moduleNameMapper`).

## Task Execution Workflow

**IMPORTANT**: Based on `.cursor/rules/general-rules.mdc`, follow this workflow for non-trivial tasks:

1. **Plan the task step-by-step** before writing code
2. **Create a task medialibrary**: `tasks/name-of-the-task.md` with GitHub-style checkboxes
3. **List all implementation steps** as `- [ ] Step Description`
4. **Update checkboxes** after completing each step: change `- [ ]` to `- [x]`
5. **Proceed sequentially**: only move to next step after checking off previous one
6. **Announce which step you are starting** before implementing it

Example task medialibrary structure:
```markdown
# Task: Add Speed Control to Timeline

- [ ] Add speed input UI component
- [ ] Wire up speed change event
- [ ] Update mediaclip layer speed in MediaService
- [ ] Apply pitch preservation to audio
- [ ] Update timeline visualization
- [ ] Add tests for speed control
```

## Key Implementation Notes

### Media Layer Cloning
Media layers implement cloning via the **Template Method pattern**:
- `AbstractMedia.clone()` handles common cloning logic
- Each subclass implements `_createCloneInstance(): this` to create a new instance
- `TextMedia` overrides `clone()` to also copy `color` and `shadow` properties
- `AudioMedia._createCloneInstance()` copies `playerAudioContext` and `audioBuffer`

### Frame Management
- Frames are stored in `FrameService` and indexed by time
- Each mediaclip layer has its own `FrameService` instance
- Video frames reference `VideoFrame` objects from WebCodecs API
- Non-video mediaclip (text, image) use static frames with transformation data

### Render Caching
Media layers implement render caching to avoid redundant rendering:
- `shouldReRender(currentTime)` checks if re-render is needed
- `updateRenderCache(currentTime)` updates cache after rendering
- `#resetRenderCache()` forces re-render (called after transformations)

### Audio Synchronization
- Audio playback uses Web Audio API via `AudioSource` class
- Audio is connected to `AudioContext.destination` or `MediaStreamAudioDestinationNode` (for export)
- Speed changes use pitch preservation via `PitchPreservationProcessor`
- Audio is synchronized with video playback time in the render loop

### Testing with Web APIs
Tests mock browser APIs that aren't available in jsdom:
- `MediaRecorder` - mocked in `tests/setup.js`
- `Canvas` and `CanvasRenderingContext2D` - mocked in `tests/setup.js`
- `AudioContext` and `OfflineAudioContext` - mocked in `tests/setup.js`
- Web Workers - mocked with message passing simulation

## Architecture Documentation

Comprehensive architecture documentation is available in `docs/architecture/`:
1. **System Overview** - High-level component relationships
2. **Module Structure** - Detailed package organization and responsibilities
3. **Event System** - Complete event catalog and flow patterns
4. **Video Pipeline** - Demuxing, rendering, and export flow
5. **Timeline & Layers** - Timeline system and mediaclip layer architecture
6. **Recording System** - Screen/camera recording architecture
7. **Data Flow** - End-to-end data flow patterns

Refer to these docs when making architectural changes or adding new features.

## Common Gotchas

### TypeScript Path Resolution
- Vite handles `@/` imports at build time
- Jest uses `moduleNameMapper` for test resolution
- Both must be kept in sync with `tsconfig.json` paths

### Web Worker Communication
- MP4Box demuxer runs in Web Worker for performance
- Communication is async via `postMessage`/`onmessage`
- Worker must be properly terminated to avoid memory leaks

### Canvas Rendering Performance
- Use `shouldReRender()` to avoid redundant renders
- Call `#resetRenderCache()` after transformations
- Keep frame data lightweight (reference VideoFrame instead of copying)

### EventBus Memory Leaks
- Always unsubscribe when components are destroyed
- Use the returned unsubscribe function: `const unsubscribe = eventBus.subscribe(...)`
- Or use `eventBus.once()` for one-time listeners

### Audio Buffer Management
- Audio buffers are large - avoid unnecessary copies
- Disconnect audio sources before reconnecting
- Use `dispose()` methods to clean up resources
