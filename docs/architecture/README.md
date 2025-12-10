# Video-Demux Architecture Documentation

## Overview

This directory contains comprehensive architecture diagrams for the video-demux project (Web Video Edit). The project is a browser-based video editor that combines AI and modern web technologies to enable video editing without downloads or installations.

## Technology Stack

- **Frontend**: Vanilla JavaScript/TypeScript (ES Modules)
- **Build Tool**: Vite
- **Testing**: Jest with jsdom
- **Video Processing**: WebCodecs API, MediaRecorder API, MP4Box.js, MediaBunny
- **AI**: Transformers.js for transcription
- **Canvas**: 2D Canvas API for rendering

## Architecture Diagrams

### 1. [System Overview](./01-system-overview.md)
High-level architecture showing the main components and their relationships:
- VideoStudio (main orchestrator)
- Canvas Player
- Timeline
- Media Layers
- Video Processing (Demux/Mux)
- Recording System
- Transcription Service

### 2. [Module Structure](./02-module-structure.md)
Detailed package/domain organization:
- `src/audio/` - Audio processing and manipulation
- `src/video/` - Video demuxing and muxing
- `src/timeline/` - Timeline management and rendering
- `src/studio/` - Main studio orchestration
- `src/mediaclip/` - Media layer abstractions
- `src/canvas/` - Canvas rendering and player
- `src/recording/` - Screen recording functionality
- `src/transcription/` - AI-powered transcription
- `src/common/` - Shared utilities and event bus

### 3. [Event System](./03-event-system.md)
Event-driven architecture using a centralized EventBus:
- Player events (time updates, transformations)
- Timeline events (layer updates, selections)
- UI events (speed changes, aspect ratio)
- Media events (load updates)
- Transcription events (seek, remove interval)
- Recording events (video medialibrary created)

### 4. [Video Pipeline](./04-video-pipeline.md)
Complete video processing flow:
- Video demuxing (MP4Box, MediaBunny, HTML5 Video)
- Frame extraction and management
- Canvas rendering
- Video export (MediaRecorder, WebCodecs)

### 5. [Timeline & Layers](./05-timeline-layers.md)
Timeline system and mediaclip layer architecture:
- Timeline rendering and interaction
- Layer types (Video, Audio, Image, Text)
- Layer transformations and updates
- Time synchronization

### 6. [Recording System](./06-recording-system.md)
Screen and camera recording architecture:
- MediaStream capture
- MediaRecorder integration
- Preview management
- Recording state machine

### 7. [Data Flow](./07-data-flow.md)
Data flow patterns throughout the application:
- User interaction flow
- Media loading flow
- Playback flow
- Export flow

## Design Principles

### 1. Event-Driven Architecture
The system uses a centralized EventBus to decouple components. Modules communicate through typed events rather than direct dependencies.

### 2. Factory Pattern
Factories are used to create complex objects:
- `TimelineLayerFactory` for timeline renderers
- `createDemuxer()` for video demuxers
- `createVideoMuxer()` for video exporters

### 3. Single Responsibility
Each module has a clear, focused responsibility:
- `VideoDemuxService` handles only video demuxing
- `MediaService` manages mediaclip operations (split, clone, etc.)
- `Timeline` handles timeline rendering and interaction

### 4. Browser-First
The application is designed for the browser:
- Uses Web APIs (Canvas, WebCodecs, MediaRecorder)
- No Node.js dependencies in core code
- Progressive enhancement for codec support

### 5. Incremental TypeScript Adoption
The codebase is migrating from JavaScript to TypeScript:
- New code written in TypeScript
- Existing code gradually converted
- `main.ts` bootstraps the JS entry point

## Key Components

### VideoStudio
The main orchestrator that:
- Initializes all subsystems
- Manages mediaclip layers
- Coordinates player and timeline
- Handles aspect ratio and settings

### VideoCanvas (Player)
Renders mediaclip layers on canvas:
- Manages playback state
- Synchronizes audio and video
- Handles layer transformations
- Implements animation loop

### Timeline
Visual timeline interface:
- Displays mediaclip layers
- Handles drag and drop
- Manages time markers
- Supports zoom and scroll

### VideoDemuxService
Video processing pipeline:
- Detects video format and codec
- Selects appropriate demuxer (MP4Box, MediaBunny, HTML5)
- Extracts frames
- Provides metadata

### EventBus
Type-safe event system:
- Subscribe/unsubscribe to events
- One-time listeners
- Error handling
- Event type safety

## Testing Strategy

- Unit tests for core logic
- Mocked Web APIs (MediaRecorder, Canvas, etc.)
- Jest with jsdom environment
- Coverage tracking for all modules

## Build and Development

```bash
# Install dependencies
npm install

# Start dev server (Vite)
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm build
```

## Contributing

When adding new features:
1. Follow the event-driven pattern
2. Use TypeScript for new code
3. Add tests for new functionality
4. Update architecture docs if adding new modules
5. Keep modules self-contained and decoupled

## Resources

- [Main README](../../README.md)
- [Testing Setup](../../TESTING-SETUP.md)
- [Repository Guidelines](../../AGENTS.md)

