# Building a Browser-Based Video Editor with Modern Web Technologies

## Introduction

The web platform has evolved dramatically over the past decade. What started as a simple document viewer has transformed into a powerful application runtime capable of rivaling native desktop software. Nowhere is this transformation more evident than in the realm of multimedia processing. Just a few years ago, the idea of editing videos directly in a browser—with no plugins, no downloads, and no server-side processing—would have seemed far-fetched. Today, it's not only possible but practical.

Traditional video editing has long been the domain of heavyweight desktop applications like Adobe Premiere, Final Cut Pro, or DaVinci Resolve. These tools are powerful but come with significant drawbacks: they require substantial downloads (often multiple gigabytes), consume considerable system resources, and most critically, require users to upload their personal videos to cloud services for processing. This raises privacy concerns and creates friction in the user experience.

Enter the modern web platform. With the introduction of APIs like WebCodecs, WebAssembly (WASM), and WebGPU, browsers have gained native capabilities that were previously impossible. WebCodecs provides direct access to browser-native video encoders and decoders, WebAssembly enables near-native performance for compute-intensive tasks, and WebGPU unlocks hardware-accelerated graphics and AI inference. Combined with established technologies like Canvas API and Web Workers, these tools form a complete toolkit for building sophisticated video editing applications that run entirely in the browser.

This article presents a deep technical exploration of building a production-grade browser-based video editor called Smart Web Video Edit. Unlike simple video player demos or proof-of-concept prototypes, this is a full-featured editing suite that handles real-world use cases: trimming and cutting clips, adding text overlays and effects, integrating AI-powered features like automatic transcription and text-to-speech, and exporting high-quality video files—all while keeping user data completely private by processing everything locally in the browser.

You can try the application yourself at [https://apssouza22.github.io/smart-video-flow](https://apssouza22.github.io/smart-video-flow) to experience these capabilities firsthand, or watch the demonstration video at [https://www.youtube.com/watch?v=fq0kdTsJaDk&t=36s](https://www.youtube.com/watch?v=fq0kdTsJaDk&t=36s) to see it in action.

### What You'll Learn

In this comprehensive guide, you'll gain practical knowledge about four critical areas of modern web development:

**Event-Driven Architecture for Complex Applications**: We'll explore how to structure a large-scale web application using event-driven patterns that promote loose coupling between modules. You'll learn how to implement a centralized EventBus that coordinates communication between dozens of independent packages, making the codebase scalable, testable, and maintainable.

**WebCodecs API Mastery**: You'll dive deep into the WebCodecs API to understand how to decode video files frame-by-frame, implement efficient caching strategies, render frames to canvas, and encode the final output with professional-grade quality presets. We'll cover codec selection strategies, bitrate calculation, memory management, and the critical details that separate toy demos from production-ready implementations.

**AI Integration in the Browser**: Discover how to integrate cutting-edge AI models directly into your web application. We'll examine three real implementations: OpenAI's Whisper model for speech-to-text transcription, Kokoro for text-to-speech synthesis, and Florence-2 for video content understanding. You'll learn about model quantization strategies, Web Worker patterns for non-blocking inference, and the trade-offs between WebGPU and WebAssembly execution.

**Performance Optimization Techniques**: Video processing is demanding work. We'll explore battle-tested optimization techniques including LRU caching for video frames, OffscreenCanvas for rendering performance, audio/video synchronization strategies, and memory management patterns that prevent leaks in long-running applications.

### Project Overview: Smart Web Video Edit

Smart Web Video Edit demonstrates what's achievable with modern web technologies. The application is built with TypeScript and follows a modular, package-based architecture where each domain (video processing, timeline management, AI features, canvas rendering) is isolated into its own package with clear interfaces.

The key architectural principles include:

- **100% client-side processing**: All video decoding, processing, and encoding happens in the browser. User videos never leave their device, ensuring complete privacy and eliminating server costs.

- **Modular package-based architecture**: The codebase is organized into self-contained packages (canvas, timeline, video, mediaclip, transcription, speech, search) that communicate through events rather than direct dependencies.

- **Real-time video rendering**: A 60fps render loop synchronizes the video canvas with the timeline UI, providing smooth playback and instant feedback during editing.

- **AI-powered features**: Integrated AI models enable automatic transcription, text-to-speech generation, and semantic video search—all running locally in the browser.

By the end of this article, you'll understand not just how to use these technologies, but why certain architectural decisions were made and what trade-offs exist. Whether you're building a video editor, image processor, audio workstation, or any other media-heavy web application, the patterns and techniques presented here will provide a solid foundation.

**Try it yourself**: You can explore the live demo at [https://apssouza22.github.io/smart-video-flow](https://apssouza22.github.io/smart-video-flow) or watch the video demonstration at [https://www.youtube.com/watch?v=fq0kdTsJaDk&t=36s](https://www.youtube.com/watch?v=fq0kdTsJaDk&t=36s) to see these capabilities in action before diving into the technical details.

Let's begin by examining the architectural foundation that makes all of this possible.

---

## Architecture Foundation

A video editor is a complex application with many moving parts: video decoding, timeline management, rendering, effects processing, audio synchronization, and export. Managing this complexity requires thoughtful architecture. In this section, we'll explore the foundational architectural patterns that keep the Smart Web Video Edit codebase maintainable and scalable.

### Package Organization Philosophy

The project follows a domain-driven package structure under the `src/` directory. Each package represents a distinct domain with clear responsibilities and minimal coupling to other packages. This organizational approach is inspired by domain-driven design principles and microservices architecture, adapted for front-end applications.

Here's the high-level package map:

```
src/
├── canvas/          Canvas rendering and visual effects
├── timeline/        Timeline UI with drag-drop, zoom/pan
├── video/           Video encoding/decoding
│   ├── mux/        Video export and encoding
│   └── demux/      Video import and decoding
├── mediaclip/       Media abstractions (Video, Audio, Image, Text)
├── studio/          Main orchestration and coordination
├── common/          Foundation layer (EventBus, State, utilities)
├── transcription/   Speech-to-text using Whisper
├── speech/          Text-to-speech using Kokoro
├── search/          AI-powered video search
├── recording/       Screen and camera recording
└── medialibrary/    Asset management and storage
```

Each package is self-contained with its own concerns. The `canvas/` package knows how to render video frames and apply effects but doesn't know how the timeline UI works. The `timeline/` package manages the user interface for arranging clips but doesn't know how video decoding works. The `video/demux/` package handles video file decoding but doesn't know how frames will be rendered.

**Dependency Rules**: The architecture follows a bottom-up dependency flow. The `common/` package sits at the foundation and has no dependencies on other packages. Domain packages (`canvas/`, `timeline/`, `video/`) depend only on `common/` and their own internals. The orchestration layer (`studio/`) sits at the top and coordinates everything but contains minimal business logic itself.

This structure provides three key benefits:

1. **Testability**: Each package can be tested in isolation. You can unit test the video decoder without needing the timeline UI, or test the canvas renderer without needing actual video files.

2. **Maintainability**: Changes are localized. If you need to add a new video codec, you modify the `video/mux/` package. If you want to redesign the timeline UI, you change the `timeline/` package. Other packages remain untouched.

3. **Scalability**: New features integrate cleanly. Want to add a new AI-powered feature? Create a new package, expose events for integration points, and plug it into the existing system without modifying core packages.

### Event-Driven Architecture

The glue that holds these independent packages together is an event-driven architecture. Rather than packages directly calling methods on each other (which creates tight coupling), they communicate by emitting and subscribing to events through a centralized EventBus.

The EventBus implementation is found in `src/common/event-bus.ts`:

```typescript
abstract class BaseEvent {
  abstract getEventType(): string;
}

class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  subscribe<T extends BaseEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, handler);
  }

  emit<T extends BaseEvent>(event: T): void {
    const eventType = event.getEventType();
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }
}
```

The beauty of this pattern is its simplicity and power. Events are strongly typed classes that extend `BaseEvent`, ensuring type safety across the entire application. Here are some examples:

```typescript
class PlayerTimeUpdateEvent extends BaseEvent {
  constructor(public readonly currentTime: number) {
    super();
  }
  getEventType() { return 'player:time-update'; }
}

class TimelineLayerUpdateEvent extends BaseEvent {
  constructor(public readonly layers: AbstractClip[]) {
    super();
  }
  getEventType() { return 'timeline:layer-update'; }
}
```

**Event Flow Examples**: Let's trace a typical interaction to see events in action.

1. User scrubs the timeline to a new position
2. Timeline package emits `TimelineTimeUpdateEvent` with the new time
3. Canvas package subscribes to this event and seeks video to that time
4. Audio layers subscribe to this event and reset their audio contexts
5. UI controls subscribe to update the time display

Another example: during video playback:

1. Canvas render loop emits `PlayerTimeUpdateEvent` every frame with current playback time
2. Timeline package subscribes and updates the playhead position
3. Waveform visualizers subscribe and update their display
4. Time display subscribes and shows the current timestamp

**Centralized Event Handler**: To maintain visibility into all inter-package communication, the application uses a centralized event subscription registry in `src/studio/studio-event-handler.ts`. The `StudioEventHandler` class subscribes to all events and routes them to appropriate handlers:

```typescript
class StudioEventHandler {
  init(): void {
    this.subscribeToTimelineEvents();
    this.subscribeToPlayerEvents();
    this.subscribeToTranscriptionEvents();
    this.subscribeToMediaEvents();
  }

  private subscribeToTimelineEvents(): void {
    eventBus.subscribe('timeline:time-update', (event) => {
      this.studio.seekToTime(event.time);
    });

    eventBus.subscribe('timeline:layer-update', (event) => {
      this.studio.updateLayers(event.layers);
    });
  }
}
```

This centralized approach creates a clear registry of all communication patterns, making it easy to understand data flow and debug issues.

The benefits of event-driven architecture are substantial:

- **Complete package decoupling**: Packages don't need to know about each other's implementation details. They only need to know what events to emit and which events to subscribe to.

- **Easy to trace data flow**: When debugging, you can search for event emissions and subscriptions to understand how data moves through the system.

- **Testable components**: In tests, you can emit fake events to trigger behavior or subscribe to verify that expected events are emitted.

- **Flexible integration**: New features integrate by subscribing to existing events. No need to modify existing code.

### State Management

While events handle communication, the application needs a centralized place to store and query current state. This is handled by the `StudioState` singleton class in `src/common/studio-state.ts`:

```typescript
class StudioState {
  private static instance: StudioState;

  private medias: AbstractClip[] = [];
  private selectedMedia: AbstractClip | null = null;
  private playingTime: number = 0;
  private currentAspectRatio: string = '16:9';
  private isPlaying: boolean = false;

  static getInstance(): StudioState {
    if (!StudioState.instance) {
      StudioState.instance = new StudioState();
    }
    return StudioState.instance;
  }

  // Getters and setters
  getMedias(): AbstractClip[] { return this.medias; }
  setMedias(medias: AbstractClip[]): void { this.medias = medias; }

  getSelectedMedia(): AbstractClip | null { return this.selectedMedia; }
  setSelectedMedia(media: AbstractClip | null): void {
    this.selectedMedia = media;
  }

  // Query helpers
  getMediaVideo(): AbstractClip[] {
    return this.medias.filter(m => m.type === 'video');
  }

  getMediaAudio(): AbstractClip[] {
    return this.medias.filter(m => m.type === 'audio');
  }
}
```

The state object acts as a bridge between event-driven communication and direct access. While events notify interested parties about changes, components can also query the state directly for read-only access. This hybrid approach combines the best of both worlds:

- Events for reactive updates (when something changes, notify interested parties)
- Direct state access for queries (what's the current playback time?)

This pattern reduces excessive event dependencies for simple read operations while maintaining reactivity for updates.

### Initialization Flow

Understanding how the application initializes helps clarify the architectural layers. The initialization happens in two distinct phases:

**Phase 1: Construction** (`src/main.ts`):

```typescript
// Create core services
const studio = initStudio();
const speechService = createSpeechService();
const searchService = createSearchService();

// Wire up UI components
const shapeView = createShapeView('shapes', (shapeType) => {
  studio.addLayer(createMediaShape(shapeType));
});
```

**Phase 2: Event Wiring** (`src/studio/initializer.ts`):

```typescript
export function initStudio(): VideoStudio {
  const mediaService = createMediaService();
  const mediaLibrary = getMediaLibrary();
  const studio = new VideoStudio(mediaService, mediaLibrary);

  studio.init();  // Initialize subsystems

  const mediaOps = new MediaOps(studio, mediaService, StudioState.getInstance());
  const eventHandler = new StudioEventHandler(studio, mediaOps);
  eventHandler.init();  // Wire all event subscriptions

  return studio;
}
```

This two-phase approach is critical. All objects are constructed first, then event listeners are attached. This ensures that when events start firing, all subscribers already exist and are ready to handle them. If you tried to wire events during construction, you'd risk missing events or having incomplete dependency graphs.

**The Render Loop**: At the heart of the application is a continuous render loop running at 60fps:

```typescript
async #loop(realtime: number): Promise<void> {
  // 1. Sync layer lists if they've changed
  if (this.getMedias().length !== this.player.getLayersLength()) {
    this.player.addLayers(this.getMedias());
    this.timeline.addLayers(this.getMedias());
  }

  // 2. Render video frame at current time
  await this.player.render(realtime);

  // 3. Update timeline UI
  this.timeline.render();

  // 4. Schedule next frame
  window.requestAnimationFrame(this.#loop.bind(this));
}
```

This loop demonstrates a fundamental principle: continuous synchronization between the model (StudioState) and the views (Canvas, Timeline). Rather than trying to perfectly coordinate updates through events, the render loop simply checks every frame whether the views match the model, and updates them if they don't. This approach is simple, robust, and performs well even at 60fps.

---

## WebCodecs API Deep Dive

The WebCodecs API is the cornerstone of browser-based video processing. Introduced in 2021, it provides direct access to browser-native video and audio encoders and decoders—the same ones that power `<video>` playback. Before WebCodecs, developers had to either use the limited capabilities of Media Source Extensions (MSE) or resort to JavaScript-based codecs that were orders of magnitude slower. WebCodecs changes the game entirely.

In this section, we'll explore both sides of video processing: demuxing (decoding/importing video files) and muxing (encoding/exporting video files). We'll examine real production code, discuss performance optimizations, and highlight the critical details that separate toy demos from reliable implementations.

### Video Demuxing: Decoding and Import

Demuxing is the process of extracting individual video frames and audio samples from a container format (MP4, WebM, MOV, etc.). The implementation needs to handle various video codecs (H.264, H.265, VP9, AV1), extract frames efficiently, and provide random access for timeline scrubbing.

#### Worker-Based Architecture

The first critical architectural decision is running video decoding in a Web Worker. Video decoding is computationally intensive—a single 4K video frame can contain over 8 million pixels. Decoding on the main thread would freeze the UI and create a terrible user experience.

The implementation uses a three-component architecture:

1. **Main Thread** (`src/video/demux/mediabunny-demuxer.ts`): Coordinates requests and manages the worker lifecycle
2. **Worker Thread** (`src/video/demux/demux-worker.ts`): Hosts the decoder and handles messages
3. **Processor** (`src/video/demux/demux-processor.ts`): Contains the actual decoding logic

The worker communicates with the main thread via postMessage, using ImageBitmap for zero-copy frame transfer:

```typescript
// In worker: Transfer ImageBitmap to main thread
const imageBitmap = await createImageBitmap(videoFrame);
postMessage(
  { type: 'frame', videoId: this.videoId, index, frame: imageBitmap },
  [imageBitmap]  // Transferable objects array
);
```

The `[imageBitmap]` in the second parameter is crucial. It transfers ownership of the ImageBitmap from the worker to the main thread without copying pixel data. For a 1080p frame, this saves copying ~8MB of data per frame—a massive performance win.

#### The Decoding Pipeline

Here's the complete decoding pipeline in `src/video/demux/demux-processor.ts`:

```typescript
async initialize(file: File, targetFps: number): Promise<void> {
  // Step 1: Create input source from file
  const source = new BlobSource(file);
  this.input = new Input({
    source,
    formats: ALL_FORMATS,  // Support MP4, WebM, MOV, etc.
  });

  // Step 2: Get video track and check codec support
  const totalDuration = await this.input.computeDuration();
  const videoTrack = await this.input.getPrimaryVideoTrack();

  if (videoTrack.codec === null) {
    this.postError('Unsupported video codec');
    return;
  }

  // Critical: Verify the browser can decode this codec
  if (!(await videoTrack.canDecode())) {
    this.postError('Unable to decode the video track');
    return;
  }

  // Step 3: Create video sink for frame extraction
  this.videoSink = new VideoSampleSink(videoTrack);

  // Step 4: Extract timestamps for all frames at target FPS
  const timestamps = await this.extractTimestamps(totalDuration, targetFps);

  // Step 5: Post metadata back to main thread
  this.postMessage({
    type: 'complete',
    videoId: this.videoId,
    timestamps: [...timestamps],
    width: videoTrack.displayWidth,
    height: videoTrack.displayHeight,
    totalTimeInMilSeconds: totalDuration * 1000
  });
}
```

The codec support check is essential. Not all browsers support all codecs. Safari, for example, doesn't support VP9 or AV1. The `canDecode()` check prevents cryptic errors later.

#### Frame Extraction and Timestamp Calculation

The `extractTimestamps()` method is fascinating. It walks through the entire video file once, recording the actual timestamp of each frame. This is necessary because video files don't have uniform frame times—they use variable frame rates and may have duplicate frames:

```typescript
async extractTimestamps(totalDuration: number, targetFps: number): Promise<number[]> {
  const frameInterval = 1 / targetFps;
  const totalFramesTarget = Math.floor(totalDuration * targetFps);

  let currentFrameIndex = 0;
  let nextTargetTime = 0;

  // Iterate through all video samples
  const frameIterator = this.videoSink.samples(0);

  for await (const videoSample of frameIterator) {
    try {
      const timestamp = videoSample.timestamp;

      // Record timestamp if we're at or past the next target time
      if (timestamp >= nextTargetTime && currentFrameIndex < totalFramesTarget) {
        this.timestamps.push(timestamp);
        currentFrameIndex++;
        nextTargetTime = currentFrameIndex * frameInterval;
      }

      if (currentFrameIndex >= totalFramesTarget) break;
    } finally {
      videoSample.close();  // Critical: Release resources immediately
    }
  }

  return this.timestamps;
}
```

This approach ensures uniform playback at the target FPS regardless of the source video's frame rate. A 60fps source played at 30fps will skip every other frame. A 24fps source played at 30fps will duplicate some frames.

The `finally` block with `videoSample.close()` is absolutely critical. Each video sample holds decoded frame data in GPU memory. Failing to close samples causes memory leaks that will crash the browser tab after processing a few videos.

#### On-Demand Frame Retrieval

Once initialization completes and timestamps are extracted, the main thread can request specific frames:

```typescript
async getFrame(index: number): Promise<void> {
  const timestamp = this.timestamps[index];
  const sample = await this.videoSink.getSample(timestamp);

  if (sample) {
    const videoFrame = sample.toVideoFrame();
    try {
      // Convert to ImageBitmap for efficient transfer
      const imageBitmap = await createImageBitmap(videoFrame);

      // Transfer to main thread
      this.postMessage(
        { type: 'frame', videoId: this.videoId, index, frame: imageBitmap },
        [imageBitmap]  // Transfer ownership
      );
    } finally {
      videoFrame.close();  // Free GPU memory
      sample.close();
    }
  }
}
```

The conversion to ImageBitmap might seem unnecessary—why not transfer the VideoFrame directly? The answer is browser compatibility and transfer semantics. ImageBitmap is a well-supported transferable type that works consistently across browsers. VideoFrame transfer support is newer and less consistent.

#### Frame Caching Strategy

Requesting individual frames works but would be inefficient for playback. Imagine playing a 30fps video—you'd need to request 30 frames per second, and each request has latency (worker communication + disk I/O + decoding). The solution is aggressive caching with intelligent prefetching.

The caching implementation (`src/video/demux/frame-cache.ts`) uses an LRU (Least Recently Used) eviction policy:

```typescript
export class FrameCache {
  private cache: Map<number, ImageBitmap>;
  private maxSize: number;
  private accessOrder: number[];

  constructor(maxSize: number = 30) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  set(index: number, frame: ImageBitmap): void {
    // Evict oldest frame if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(index)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(index, frame);
    this.updateAccessOrder(index);
  }

  private evictLeastRecentlyUsed(): void {
    const lruIndex = this.accessOrder.shift();
    if (lruIndex !== undefined) {
      const frame = this.cache.get(lruIndex);
      frame?.close();  // Critical: Close ImageBitmap to free GPU memory
      this.cache.delete(lruIndex);
    }
  }

  get(index: number): ImageBitmap | null {
    const frame = this.cache.get(index);
    if (frame) {
      this.updateAccessOrder(index);
      return frame;
    }
    return null;
  }

  private updateAccessOrder(index: number): void {
    // Remove from current position
    const currentPos = this.accessOrder.indexOf(index);
    if (currentPos !== -1) {
      this.accessOrder.splice(currentPos, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(index);
  }
}
```

The default cache size of 30 frames is carefully chosen. At 1080p, each frame is about 8MB of GPU memory. 30 frames = 240MB, which is reasonable for most systems. The cache typically holds about one second of video at 30fps, providing smooth playback.

**Batch Prefetching**: The system goes beyond simple caching with batch prefetching. When you seek to a new position or start playback, the implementation prefetches the next 5 seconds of frames in the background:

```typescript
async getBatchFrames(startIndex: number, endIndex: number, requestId: string): Promise<void> {
  this.activeBatchRequest = requestId;
  const totalFrames = endIndex - startIndex;
  let processedFrames = 0;

  const startTimestamp = this.timestamps[startIndex];
  const endTimestamp = endIndex < this.timestamps.length
    ? this.timestamps[endIndex - 1] + 0.001
    : Infinity;

  // Iterate through frames in range
  const frameIterator = this.videoSink.samples(startTimestamp, endTimestamp);
  let currentIndex = startIndex;

  for await (const videoSample of frameIterator) {
    try {
      // Check if batch was cancelled (user seeked elsewhere)
      if (this.activeBatchRequest !== requestId) {
        console.log(`Batch ${requestId} cancelled`);
        return;
      }

      let videoFrame: VideoFrame | null = null;
      let imageBitmap: ImageBitmap | null = null;

      try {
        videoFrame = videoSample.toVideoFrame();
        imageBitmap = await createImageBitmap(videoFrame);

        processedFrames++;
        const isComplete = processedFrames === totalFrames;

        this.postMessage({
          type: 'batch-frame',
          videoId: this.videoId,
          requestId,
          index: currentIndex,
          frame: imageBitmap,
          progress: processedFrames / totalFrames,
          isComplete,
        }, [imageBitmap]);
      } finally {
        videoFrame?.close();
      }

      currentIndex++;
    } finally {
      videoSample.close();
    }
  }
}
```

The cancellation mechanism is important. If the user seeks to a new position while a batch is loading, the old batch is cancelled to avoid wasting resources loading frames that won't be used.

### Video Muxing: Encoding and Export

Muxing is the opposite of demuxing—taking individual video frames and audio samples and encoding them into a container format. This is more complex than demuxing because you control every aspect: frame rate, resolution, codec, bitrate, audio channels, and more.

#### Export Architecture

The export implementation (`src/video/mux/web-codec-exporter.ts`) uses a synchronous rendering approach. Unlike playback which needs real-time performance, export can take its time to ensure quality:

```typescript
async export(
  progressCallback: ProgressCallback | null = null,
  completionCallback: CompletionCallback | null = null
): Promise<void> {
  if (this.isEncoding) return;

  this.isEncoding = true;
  this.totalDuration = this.getTotalDuration();
  this.totalFrames = Math.ceil((this.totalDuration / 1000) * this.frameRate);

  try {
    this.createRecordingCanvas();
    await this.setupMediaBunnyOutput();
    await this.setupAudioContext();
    await this.renderFramesSynchronously();
    await this.createAndDownloadFile();

    if (progressCallback) {
      progressCallback(100);
    }
  } catch (error) {
    console.error('Error during export:', error);
    alert('Failed to export video: ' + (error as Error).message);
  }
}
```

#### OffscreenCanvas Setup

The export process uses OffscreenCanvas for better performance:

```typescript
private createRecordingCanvas(): void {
  const dimensions = getExportDimensions();
  this.recordingCanvas = new OffscreenCanvas(
    dimensions.width,
    dimensions.height
  );

  // Optimize context settings for export
  this.recordingCtx = this.recordingCanvas.getContext('2d', {
    alpha: false,                // No transparency needed
    desynchronized: true,        // Better performance
    colorSpace: 'srgb',         // Standard color space
    willReadFrequently: false    // Write-only context
  });

  if (this.recordingCtx) {
    this.recordingCtx.imageSmoothingEnabled = true;
    this.recordingCtx.imageSmoothingQuality = 'high';
  }
}
```

Each context option is chosen deliberately. `desynchronized: true` allows the browser to optimize rendering by not guaranteeing immediate canvas updates. `willReadFrequently: false` tells the browser this is a write-only canvas, allowing further optimizations.

#### Encoder Configuration

The encoder setup uses MediaBunny library with BufferTarget for in-memory encoding:

```typescript
async setupMediaBunnyOutput(): Promise<void> {
  this.output = new Output({
    target: new BufferTarget(),      // In-memory buffer
    format: new Mp4OutputFormat(),   // MP4 container
  });

  const exportWidth = this.recordingCanvas.width;
  const exportHeight = this.recordingCanvas.height;

  // Smart codec selection
  const videoCodec = await selectBestVideoCodec(
    this.output.format.getSupportedVideoCodecs(),
    {
      width: exportWidth,
      height: exportHeight,
      preferredCodecs: this.exportOptions.preferredCodecs,
      fallbackToFirst: true
    }
  );

  if (!videoCodec) {
    throw new Error('Browser doesn\'t support video encoding.');
  }

  // Calculate bitrate based on resolution and quality preset
  const bitrate = this.exportOptions.customBitrate ||
    calculateBitrate(exportWidth, exportHeight, this.qualityPreset);

  // Create canvas source - feeds frames to encoder
  this.canvasSource = new CanvasSource(this.recordingCanvas, {
    codec: videoCodec,
    bitrate: bitrate,
    bitrateMode: this.qualityPreset.bitrateMode,      // 'constant' | 'variable'
    latencyMode: this.qualityPreset.latencyMode,      // 'quality' | 'realtime'
    keyFrameInterval: this.qualityPreset.keyFrameInterval,
    hardwareAcceleration: this.exportOptions.hardwareAcceleration || 'no-preference',
  });

  // Add video track to output
  this.output.addVideoTrack(this.canvasSource, { frameRate: this.frameRate });

  // Configure audio if needed
  const audioLayers = this.getAudioLayers();
  if (audioLayers.length > 0) {
    const audioCodec = await getFirstEncodableAudioCodec(
      this.output.format.getSupportedAudioCodecs(),
      {
        numberOfChannels: this.numberOfChannels,
        sampleRate: this.sampleRate,
      }
    );

    if (audioCodec) {
      this.audioBufferSource = new AudioBufferSource({
        codec: audioCodec,
        bitrate: QUALITY_VERY_HIGH,
      });
      this.output.addAudioTrack(this.audioBufferSource);
    }
  }

  await this.output.start();
}
```

#### Smart Codec Selection

The codec selection strategy prioritizes quality while maintaining compatibility. Implementation in `src/video/mux/codec-selector.ts`:

```typescript
const QUALITY_CODEC_PREFERENCES: CodecPreference[] = [
  { codec: 'hevc', priority: 5, description: 'HEVC/H.265 - Excellent quality, QuickTime compatible' },
  { codec: 'avc', priority: 4, description: 'H.264/AVC - High quality, universally compatible' },
  { codec: 'av1', priority: 3, description: 'AV1 - Best compression (not QuickTime compatible)' },
  { codec: 'vp9', priority: 2, description: 'VP9 - Good quality (not QuickTime compatible)' },
  { codec: 'vp8', priority: 1, description: 'VP8 - Legacy codec' }
];

export async function selectBestVideoCodec(
  supportedCodecs: VideoCodec[],
  options: CodecSelectionOptions
): Promise<VideoCodec | null> {
  const { width, height, preferredCodecs, fallbackToFirst = true } = options;

  // Try user preferences first
  if (preferredCodecs && preferredCodecs.length > 0) {
    for (const codec of preferredCodecs) {
      if (supportedCodecs.includes(codec)) {
        const canEncode = await canEncodeVideo(codec, {
          width,
          height,
          bitrate: QUALITY_VERY_HIGH,
          latencyMode: 'quality',
          bitrateMode: 'variable'
        });
        if (canEncode) {
          return codec;
        }
      }
    }
  }

  // Try codecs in quality order
  const sortedPreferences = QUALITY_CODEC_PREFERENCES
    .filter(pref => supportedCodecs.includes(pref.codec))
    .sort((a, b) => b.priority - a.priority);

  for (const preference of sortedPreferences) {
    const canEncode = await canEncodeVideo(preference.codec, {
      width,
      height,
      bitrate: QUALITY_VERY_HIGH,
      latencyMode: 'quality',
      bitrateMode: 'variable'
    });

    if (canEncode) {
      console.log(`Selected codec: ${preference.codec} - ${preference.description}`);
      return preference.codec;
    }
  }

  // Fallback to first available
  if (fallbackToFirst && supportedCodecs.length > 0) {
    console.warn('Falling back to first supported codec:', supportedCodecs[0]);
    return supportedCodecs[0];
  }

  return null;
}
```

The strategy prioritizes HEVC (H.265) for its excellent quality-to-size ratio and QuickTime compatibility. This matters for users who want to edit videos in Final Cut Pro or iMovie. AV1 offers better compression but isn't universally supported in professional tools yet.

The `canEncodeVideo()` check is crucial. Just because a browser reports supporting a codec doesn't mean it can actually encode at your target resolution. Some browsers can decode 4K HEVC but only encode up to 1080p.

#### The Synchronous Rendering Pipeline

This is where everything comes together. The export loop renders every frame, feeds it to the encoder, and waits for the encoder to accept it:

```typescript
async renderFramesSynchronously(): Promise<void> {
  if (!this.canvasSource) {
    throw new Error('Canvas source not initialized');
  }

  for (let currentFrame = 0; currentFrame < this.totalFrames; currentFrame++) {
    const currentTime = (currentFrame / this.frameRate) * 1000;
    const videoProgress = currentFrame / this.totalFrames;
    const overallProgress = videoProgress * (this.audioBufferSource ? 0.9 : 0.95);

    if (this.progressCallback) {
      this.progressCallback(Math.round(overallProgress * 100));
    }

    // Render all media layers to canvas at current time
    await this.renderFrameAtTime(currentTime);

    // CRITICAL: Await the add() call
    // This implements backpressure - if the encoder is slower than rendering,
    // this await will pause until the encoder is ready for more frames
    await this.canvasSource.add(currentTime / 1000, 1 / this.frameRate);
  }

  this.canvasSource.close();  // Signal end of video frames

  // Render audio if available
  if (this.audioBufferSource && this.audioContext) {
    if (this.progressCallback) {
      this.progressCallback(90);
    }
    await this.renderAudioOffline();
  }

  // Finalize output - wait for encoding to complete
  if (this.progressCallback) {
    this.progressCallback(95);
  }

  await this.output!.finalize();
}

private async renderFrameAtTime(currentTime: number): Promise<void> {
  if (!this.recordingCtx || !this.recordingCanvas) return;

  // Clear canvas
  this.recordingCtx.clearRect(0, 0, this.recordingCanvas.width, this.recordingCanvas.height);

  // Render each media layer at this time
  const medias = this.studioState.getMedias();
  for (const media of medias) {
    await media.render(this.recordingCtx, currentTime, false);
  }
}
```

The `await this.canvasSource.add()` line is the most critical detail in the entire export implementation. This await implements backpressure. If you remove it and just call `this.canvasSource.add()` without awaiting, the loop will render frames faster than the encoder can process them. Memory usage will skyrocket as frames pile up in the encoder's queue, eventually crashing the browser tab.

With the await, if the encoder gets behind, the rendering loop automatically pauses until the encoder catches up. This self-regulating flow control keeps memory usage stable throughout the export.

#### Audio Rendering with OfflineAudioContext

Audio export uses a different approach than video. Instead of feeding samples frame-by-frame, all audio is rendered at once using OfflineAudioContext:

```typescript
private async renderAudioOffline(): Promise<void> {
  if (!this.audioBufferSource || !this.audioContext) return;

  // Connect all audio layers to the offline context
  for (const layer of this.getAudioLayers()) {
    if (layer.audioBuffer) {
      layer.connectAudioSource(this.audioContext);
      layer.playStart(layer.startTime);
    }
  }

  // Render entire audio track at once
  const audioBuffer = await this.audioContext.startRendering();
  await this.audioBufferSource.add(audioBuffer);
  this.audioBufferSource.close();
}
```

OfflineAudioContext is designed exactly for this use case. It renders the entire audio graph to a buffer as fast as possible (not real-time), applying all effects, mixing multiple layers, and handling timing automatically. The result is a single AudioBuffer that perfectly matches the video duration.

This completes our deep dive into WebCodecs. We've covered frame-by-frame decoding with workers, intelligent caching strategies, professional-grade encoding with quality presets, and the critical implementation details that ensure reliability and performance.

---

## AI Integration in the Browser

One of the most exciting developments in web technology is the ability to run sophisticated AI models directly in the browser. Smart Web Video Edit integrates three AI models: Whisper for speech-to-text transcription, Kokoro for text-to-speech synthesis, and Florence-2 for video content understanding and semantic search. Each model demonstrates different aspects of browser-based AI: inference optimization, worker isolation, and device-aware execution.

### Overall AI Architecture

All three models follow a common architectural pattern that maximizes performance and user experience:

**Web Worker Isolation**: Model inference runs in dedicated Web Workers to prevent UI blocking. Loading a 300MB model or running inference for 30 seconds would freeze the interface if done on the main thread.

**Device-Aware Loading**: The implementation automatically detects WebGPU support and adjusts model configuration accordingly. WebGPU provides hardware-accelerated inference (often 10-50x faster than CPU), but when unavailable, the models fall back to WebAssembly with quantization.

**Progressive Loading**: Users see loading progress (0-100%) as models download and initialize. This is critical for large models—users need feedback that something is happening.

**Model Quantization**: The implementation uses different quantization strategies based on the execution device. WebGPU uses full precision (fp32) for accuracy, while WebAssembly uses 8-bit or 4-bit quantization to reduce model size and improve inference speed.

The device detection logic is simple but fundamental (`src/common/device.ts`):

```typescript
export function getExecDevice() {
  if (!('gpu' in navigator)) {
    return "wasm";
  }
  console.log("WebGPU is supported. Using WebGPU as execution device.");
  return "webgpu";
}
```

This single function determines how all AI models execute. The presence of `navigator.gpu` indicates WebGPU support, unlocking dramatically faster inference.

### Whisper: Speech-to-Text Transcription

Whisper, developed by OpenAI, is a state-of-the-art speech recognition model. The browser implementation uses the ONNX-converted version from Hugging Face: `onnx-community/whisper-base_timestamped`.

The implementation (`src/transcription/model.ts`) configures Whisper for word-level timestamps:

```typescript
export async function loadTranscriptionModel(
  onProgress: (progress: number) => void
): Promise<any> {
  const device = getExecDevice();

  // Configure pipeline for automatic speech recognition
  const transcriber = await pipeline(
    'automatic-speech-recognition',
    'onnx-community/whisper-base_timestamped',
    {
      quantized: device === 'wasm',    // Use quantization for WASM
      device: device,
      dtype: device === 'webgpu' ? 'fp32' : 'q8',  // Full precision for WebGPU
      progress_callback: (progress: any) => {
        if (progress.status === 'progress') {
          const progressPercent = Math.round((progress.progress / progress.total) * 100);
          onProgress(progressPercent);
        }
      }
    }
  );

  return transcriber;
}
```

The configuration reveals key decisions:

- **Chunk Length**: 30 seconds. Whisper processes audio in chunks rather than all at once. 30 seconds balances memory usage and context.
- **Stride Length**: 5 seconds. Chunks overlap by 5 seconds to ensure word boundaries aren't lost between chunks.
- **Return Timestamps**: Word-level. This enables precise highlighting of transcribed words as video plays.
- **Quantization Strategy**: q8 (8-bit) for WASM provides a good balance—the model is 4x smaller than fp32 with minimal accuracy loss.

**Worker Pattern**: The transcription runs in a dedicated worker (`src/transcription/worker.ts`):

```typescript
// In worker
let model: any = null;

async function loadModel(onProgress: (progress: number) => void) {
  if (!model) {
    model = await loadTranscriptionModel(onProgress);
  }
  return model;
}

self.addEventListener('message', async (event) => {
  const { type, audioBuffer, sampleRate } = event.data;

  if (type === 'load') {
    await loadModel((progress) => {
      self.postMessage({ type: 'loadProgress', progress });
    });
    self.postMessage({ type: 'loadComplete' });
  }

  if (type === 'transcribe') {
    const startTime = performance.now();

    const result = await model(audioBuffer, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: 'word',
      language: 'en',
      task: 'transcribe'
    });

    const duration = performance.now() - startTime;
    console.log(`Transcription completed in ${duration.toFixed(0)}ms`);

    self.postMessage({
      type: 'transcribeComplete',
      result: result,
      duration: duration
    });
  }
});
```

The worker maintains the model instance across transcription requests. Loading the model once and reusing it for multiple audio files is far more efficient than reloading each time.

The timing log is valuable for performance analysis. On WebGPU, transcribing 60 seconds of audio typically takes 5-10 seconds. On WASM, it might take 30-60 seconds. This 3-6x difference is why device detection matters.

### Kokoro: Text-to-Speech Synthesis

Kokoro is a high-quality neural TTS model that generates natural-sounding speech. The implementation uses `onnx-community/Kokoro-82M-v1.0-ONNX` via the kokoro-js library.

The model factory (`src/speech/model-factory.ts`) uses a singleton pattern with deferred loading:

```typescript
class SpeechModelFactory {
  private static instance: SpeechModelFactory;
  private model: any | null = null;
  private loadingPromise: Promise<any> | null = null;

  static getInstance(): SpeechModelFactory {
    if (!SpeechModelFactory.instance) {
      SpeechModelFactory.instance = new SpeechModelFactory();
    }
    return SpeechModelFactory.instance;
  }

  async getModel(onProgress?: (progress: number) => void): Promise<any> {
    // Return cached model if available
    if (this.model) {
      return this.model;
    }

    // Return in-progress load if already loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading
    this.loadingPromise = this.loadModelInternal(onProgress);
    this.model = await this.loadingPromise;
    this.loadingPromise = null;

    return this.model;
  }

  private async loadModelInternal(onProgress?: (progress: number) => void): Promise<any> {
    const device = getExecDevice();

    const model = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype: device === 'webgpu' ? 'fp32' : 'q8',
      device: device,
      progress_callback: (progress: any) => {
        if (onProgress && progress.status === 'progress') {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          onProgress(percent);
        }
      }
    });

    return model;
  }
}

export async function loadSpeechModel(onProgress?: (progress: number) => void): Promise<any> {
  return SpeechModelFactory.getInstance().getModel(onProgress);
}
```

The singleton pattern ensures the 82MB model is loaded only once, even if multiple components request TTS. The deferred loading means the model isn't loaded until actually needed—saving bandwidth if the user never uses TTS.

The worker implementation (`src/speech/worker.ts`) handles generation:

```typescript
self.addEventListener('message', async (event) => {
  const { type, text, voice, speed } = event.data;

  if (type === 'generate') {
    const model = await loadSpeechModel((progress) => {
      self.postMessage({ type: 'loadProgress', progress });
    });

    // Generate speech with specified voice and speed
    const audio = await model.generate(text, {
      voice: voice || 'af',
      speed: speed || 1.0,
      lang: 'en-us'
    });

    // Convert to AudioBuffer format
    const audioBuffer = {
      sampleRate: 24000,
      numberOfChannels: 1,
      length: audio.length,
      data: audio
    };

    self.postMessage({
      type: 'generateComplete',
      audioBuffer: audioBuffer
    });
  }
});
```

Kokoro supports multiple voices (af, af_bella, af_sarah, am_adam, etc.) and adjustable speed (0.5x to 2.0x). The model outputs raw audio samples at 24kHz which are converted to an AudioBuffer for playback or integration into the timeline.

### Florence-2: Video Content Understanding

Florence-2 is a vision-language model from Microsoft that can describe image content. Smart Web Video Edit uses it to generate detailed captions for video frames, enabling semantic search ("find frames with a person speaking" or "find outdoor scenes").

The implementation requires four components (`src/search/model-factory.ts`):

```typescript
class SearchModelFactory {
  private model: any | null = null;
  private processor: any | null = null;
  private tokenizer: any | null = null;
  private embedder: any | null = null;

  async loadModels(onProgress?: (progress: number) => void): Promise<void> {
    if (this.model) return;  // Already loaded

    const device = getExecDevice();

    // Load all four components in parallel
    const [model, processor, tokenizer, embedder] = await Promise.all([
      // Main vision-language model
      Florence2ForConditionalGeneration.from_pretrained(
        'onnx-community/Florence-2-base-ft',
        {
          device: device,
          dtype: device === 'webgpu' ? 'fp32' : 'q4',  // 4-bit quantization for WASM
        }
      ),

      // Image processor
      AutoProcessor.from_pretrained('onnx-community/Florence-2-base-ft'),

      // Text tokenizer
      AutoTokenizer.from_pretrained('onnx-community/Florence-2-base-ft'),

      // Embedding model for semantic similarity
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: device === 'wasm',
        device: device
      })
    ]);

    this.model = model;
    this.processor = processor;
    this.tokenizer = tokenizer;
    this.embedder = embedder;
  }
}
```

The frame analyzer (`src/search/frame-analyzer.ts`) uses these components:

```typescript
export async function analyzeFrame(
  imageDataUrl: string,
  models: LoadedModels
): Promise<FrameAnalysis> {
  // Load image from data URL
  const image = await RawImage.fromURL(imageDataUrl);

  // Prepare prompt for detailed captioning
  const prompt = '<DETAILED_CAPTION>';

  // Process image and generate caption
  const inputs = await models.processor(image, prompt);
  const generated_ids = await models.model.generate({
    ...inputs,
    max_new_tokens: 100
  });

  // Decode generated tokens to text
  const generated_text = models.tokenizer.batch_decode(
    generated_ids,
    { skip_special_tokens: true }
  )[0];

  // Generate embedding vector for semantic search
  const embedding = await models.embedder(generated_text, {
    pooling: 'mean',
    normalize: true
  });

  return {
    caption: generated_text,
    embedding: Array.from(embedding.data)  // Convert to regular array
  };
}
```

The `<DETAILED_CAPTION>` task token tells Florence-2 to generate rich descriptions rather than simple labels. Instead of "person", you get "a person in a blue shirt speaking into a microphone in an office setting".

The embedding vector enables semantic search. Two frames with similar content ("person speaking" and "man presenting") will have similar embedding vectors even though the text differs. Cosine similarity between vectors determines relevance:

```typescript
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}
```

**Caching Strategy**: Analyzing every frame in a video would be expensive. The implementation uses IndexedDB to cache analyses:

```typescript
// Save to IndexedDB
await cache.saveFrameAnalysis(videoId, timestamp, {
  caption: analysis.caption,
  embedding: analysis.embedding
});

// Load from cache on subsequent searches
const cached = await cache.getFrameAnalysis(videoId, timestamp);
if (cached) {
  return cached;  // Skip re-analysis
}
```

This makes the second search nearly instant—no model loading, no inference, just database lookups and similarity calculations.

### Performance Characteristics

The performance difference between WebGPU and WASM is dramatic:

**Whisper (60 seconds of audio)**:
- WebGPU: ~5-10 seconds
- WASM (q8): ~30-60 seconds

**Kokoro (100 words)**:
- WebGPU: ~2-3 seconds
- WASM (q8): ~8-12 seconds

**Florence-2 (single frame)**:
- WebGPU: ~0.5-1 second
- WASM (q4): ~3-5 seconds

These numbers come from testing on a mid-range laptop (M1 MacBook Pro). WebGPU leverages the GPU's thousands of parallel cores, while WASM runs on a handful of CPU cores. The quantization (q8/q4) helps WASM performance significantly—without it, inference would be 2-3x slower and use 4x more memory.

This explains why device-aware loading is essential. The automatic fallback to WASM ensures the features work everywhere, while WebGPU provides a premium experience on capable hardware.

---

## Performance Optimization Techniques

Video processing pushes browsers to their limits. A single 4K frame contains 8.3 million pixels. At 30fps, that's 249 million pixels per second to decode, process, and render. Without careful optimization, the application would be unusably slow or crash from memory exhaustion. This section explores the battle-tested optimization techniques that make smooth performance possible.

### Memory Management: The Critical Challenge

Memory leaks are the death of video applications. Unlike typical web apps where a few leaked objects don't matter, video apps handle gigabytes of data. A single leaked 1080p frame (8MB) repeated 30 times per second will exhaust memory in minutes.

**The LRU Frame Cache** (`src/video/demux/frame-cache.ts`) is the first line of defense:

```typescript
private evictLeastRecentlyUsed(): void {
  const lruIndex = this.accessOrder.shift();
  if (lruIndex !== undefined) {
    const frame = this.cache.get(lruIndex);
    frame?.close();  // CRITICAL: Explicitly close ImageBitmap
    this.cache.delete(lruIndex);
  }
}
```

The `.close()` call is non-negotiable. ImageBitmaps hold decoded pixels in GPU memory, and JavaScript's garbage collector doesn't know about GPU memory. Without explicit closure, GPU memory fills up even though JavaScript heap looks fine. The browser eventually crashes with an out-of-memory error despite plenty of RAM being available.

**IndexedDB for Persistent Caching** (`src/search/analyzed-frame-cache.ts`):

Analyzed frames (with AI-generated captions and embeddings) are cached in IndexedDB rather than memory:

```typescript
async saveFrameAnalysis(videoId: string, timestamp: number, analysis: FrameAnalysis): Promise<void> {
  const db = await this.openDatabase();
  const tx = db.transaction('analyzed-frames', 'readwrite');
  const store = tx.objectStore('analyzed-frames');

  // Serialize embedding vector
  const record = {
    videoId,
    timestamp,
    caption: analysis.caption,
    embedding: new Float32Array(analysis.embedding)
  };

  await store.put(record);
}
```

Float32Array enables efficient storage of embedding vectors (384 dimensions × 4 bytes = 1.5KB per frame). IndexedDB can hold gigabytes of data across sessions, making subsequent searches instant.

**Resource Cleanup Pattern**:

Everywhere video frames are handled, the pattern is identical:

```typescript
try {
  const videoFrame = sample.toVideoFrame();
  const imageBitmap = await createImageBitmap(videoFrame);
  // Use imageBitmap
} finally {
  videoFrame?.close();    // Free GPU memory
  sample?.close();         // Free decoder resources
}
```

The `finally` block ensures cleanup happens even if errors occur. Failing to close these resources causes cascading memory leaks that manifest as performance degradation over time—playback starts smoothly but gets progressively worse.

### Canvas Optimization: Drawing Performance

The canvas renderer (`src/canvas/canvas.ts`) must draw 30-60 frames per second. Any slowdown causes dropped frames and janky playback.

**OffscreenCanvas for Export** (`src/video/mux/web-codec-exporter.ts`):

Export uses OffscreenCanvas instead of regular Canvas for several reasons:

```typescript
const canvas = new OffscreenCanvas(width, height);
const ctx = canvas.getContext('2d', {
  alpha: false,           // Disable alpha channel (not needed)
  desynchronized: true,   // Allow async rendering
  colorSpace: 'srgb',    // Standard color space
  willReadFrequently: false  // Write-only canvas
});
```

Each option enables specific optimizations:

- `alpha: false`: Saves 25% memory (RGB vs RGBA) and enables faster compositing
- `desynchronized: true`: Tells the browser it doesn't need to synchronize canvas updates with display refresh, allowing batch operations
- `willReadFrequently: false`: Indicates the canvas is write-only, letting the browser keep pixel data in GPU memory without copying to CPU

**Selective Re-rendering**:

The playback renderer only redraws when necessary:

```typescript
render(currentTime: number): void {
  if (!this.shouldReRender(currentTime)) {
    return;  // Skip rendering if nothing changed
  }

  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

  for (const layer of this.layers) {
    if (layer.isVisibleAt(currentTime)) {
      layer.render(this.ctx, currentTime);
    }
  }
}
```

If the playhead hasn't moved and no layers changed, skip the entire render. This saves CPU/GPU cycles when paused or during timeline scrubbing where the user hovers at one position.

**High-DPI Display Handling** (`src/common/render-2d.ts`):

Modern displays have device pixel ratios of 2x or 3x. The renderer scales the canvas appropriately:

```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = displayWidth * dpr;
canvas.height = displayHeight * dpr;
canvas.style.width = `${displayWidth}px`;
canvas.style.height = `${displayHeight}px`;
ctx.scale(dpr, dpr);
```

This ensures crisp rendering on Retina displays while maintaining correct coordinate systems for mouse input. The physical canvas is 2x or 3x larger, but CSS keeps the display size correct.

### Audio/Video Synchronization

Audio/video sync is one of the hardest problems in video playback. Even 100ms of drift is noticeable and annoying.

**Lookahead Scheduling** (`src/canvas/canvas.ts`):

The implementation uses Web Audio API's precise scheduling:

```typescript
private startScheduledAudio(currentTime: number): void {
  const audioContext = this.audioContext;
  const lookahead = 0.1;  // 100ms lookahead

  for (const audioLayer of this.getAudioLayers()) {
    if (audioLayer.isActiveAt(currentTime)) {
      const offsetInSeconds = (currentTime - audioLayer.startTime) / 1000;
      const scheduleTime = audioContext.currentTime + lookahead;

      audioLayer.scheduleStart(scheduleTime, offsetInSeconds);
    }
  }
}
```

The 100ms lookahead gives the audio system time to prepare buffers. Without it, audio would glitch and stutter because buffers aren't ready when playback starts.

**Synchronized Time Calculation**:

Video rendering uses audio context time as the source of truth:

```typescript
private calculateAudioSyncedTime(): number {
  if (!this.isPlaying || !this.audioContext) {
    return this.playingTime;
  }

  const audioTime = this.audioContext.currentTime;
  const elapsedAudio = audioTime - this.playbackStartAudioTime;
  return this.playbackStartTime + (elapsedAudio * 1000);
}
```

`AudioContext.currentTime` is a high-resolution timestamp maintained by the audio hardware. It doesn't drift like `Date.now()` or `performance.now()`. By syncing video to audio time, the two stay perfectly aligned.

**Offline Audio Context for Export**:

Export doesn't use real-time audio synchronization—it renders audio offline:

```typescript
const durationInSeconds = this.totalDuration / 1000;
this.audioContext = new OfflineAudioContext(
  this.numberOfChannels,
  this.sampleRate * durationInSeconds,
  this.sampleRate
);

// Connect all audio sources
for (const layer of audioLayers) {
  layer.connectAudioSource(this.audioContext);
  layer.playStart(layer.startTime);
}

// Render entire audio track at once
const audioBuffer = await this.audioContext.startRendering();
```

`OfflineAudioContext` renders as fast as possible (not real-time), applying all audio processing, mixing, and effects in a single operation. The result is a complete audio buffer ready to mux with video.

### Performance Monitoring and Profiling

The implementation includes performance metrics throughout:

```typescript
const startTime = performance.now();
await processVideo();
const duration = performance.now() - startTime;
console.log(`Video processing completed in ${duration.toFixed(0)}ms`);
```

These logs aren't just for debugging—they help identify performance bottlenecks during development and testing. If transcription suddenly takes twice as long, the logs immediately reveal the regression.

**Chrome DevTools Integration**:

The architecture facilitates profiling with Chrome DevTools:

- **Performance Tab**: Record during playback to see rendering bottlenecks
- **Memory Tab**: Take heap snapshots to find memory leaks
- **Network Tab**: Monitor model downloads and identify slow requests

Web Workers appear as separate threads in the performance timeline, making it easy to see if the UI thread is blocked or if workers are the bottleneck.

### Batch Operations and Prefetching

Batching reduces overhead by amortizing costs across multiple operations:

```typescript
async getBatchFrames(startIndex: number, endIndex: number): Promise<void> {
  const frameIterator = this.videoSink.samples(startTimestamp, endTimestamp);

  for await (const videoSample of frameIterator) {
    // Process frame
    // ...
    // Send to main thread
    postMessage({ type: 'batch-frame', frame: imageBitmap }, [imageBitmap]);
  }
}
```

Rather than requesting frames individually (which requires worker communication + disk I/O + decoding for each frame), batch prefetching requests 150 frames at once (5 seconds at 30fps). The overhead of worker communication happens once instead of 150 times.

The prefetch strategy is adaptive:

- During playback: Prefetch next 5 seconds
- After seek: Prefetch around the new position
- When paused: No prefetching (save resources)

### Memory Budget Management

The application maintains an implicit memory budget:

- **Frame Cache**: 30 frames × 8MB = 240MB
- **AI Models**: ~500MB when loaded (Whisper + Kokoro + Florence-2)
- **Audio Buffers**: ~10MB per minute of audio
- **Misc State**: ~50MB

Total peak memory usage: ~800MB-1GB, which is reasonable for modern systems. The key is keeping GPU memory under control through explicit ImageBitmap closure and limiting cache sizes.

If users report out-of-memory errors, the first investigation points are:
1. Are ImageBitmaps being closed?
2. Is the frame cache size appropriate?
3. Are audio buffers being released after use?
4. Are AI models unloaded when not needed?

These optimizations combine to make smooth 60fps playback and reliable export possible. Without them, the application would feel sluggish, stutter during playback, and crash randomly—unusable for real work.

---

## Lessons Learned and Best Practices

Building Smart Web Video Edit taught valuable lessons about browser-based video processing. Some were learned the hard way through bugs and performance issues. Here's what matters most:

### Architectural Lessons

**Event-Driven Architecture Pays Off**: The loose coupling between packages made development far easier than anticipated. Features could be added or modified without touching core systems. When implementing the semantic search feature, it required zero changes to the video decoder or canvas renderer—just subscribe to the relevant events and integrate.

The centralized event registry (StudioEventHandler) proved invaluable for debugging. When investigating why the timeline wasn't updating, tracing event subscriptions immediately revealed the issue. Without this central registry, finding the problem would have required searching the entire codebase.

**State + Events Hybrid Works**: Initially, the architecture used only events. Everything that changed state emitted an event, and everything that read state subscribed to events. This caused event cascades where one event triggered another which triggered another. The hybrid approach—events for changes, direct reads for queries—eliminated these cascades.

**Two-Phase Initialization is Critical**: Wiring events during object construction led to subtle bugs where some subscribers existed but others didn't. Separating construction from event wiring ensured consistency. All objects exist before any events fire.

### WebCodecs Insights

**Always Check Codec Support**: Browser codec support is wildly inconsistent. Safari doesn't support VP9 or AV1. Some Chrome versions can decode 4K HEVC but only encode 1080p. Checking support dynamically prevents cryptic failures.

The pattern became: enumerate supported codecs → filter by capability → test actual encoding at target resolution → fall back if needed. Never assume support.

**Resource Management is Non-Negotiable**: This cannot be emphasized enough. GPU memory leaks will kill your application. The pattern is simple: acquire resource → use it → close it in a finally block. No exceptions.

**Backpressure Matters**: The `await canvasSource.add()` detail in export took hours to discover. Without it, memory usage spiraled out of control during export. With it, exports are rock-solid. Always implement backpressure when feeding data to encoders.

**Offline Rendering Simplifies Export**: Trying to sync real-time audio/video during export was complex and fragile. OfflineAudioContext eliminated the complexity—render all audio at once, done. For export workflows, offline rendering is almost always better.

### AI Integration Lessons

**Workers Are Essential**: Loading AI models on the main thread freezes the UI for 10-30 seconds. Users see a frozen browser and think it crashed. Workers make loading seamless—the UI stays responsive with a progress bar.

**Progressive Loading is UX**: Without progress indicators, users don't know if the browser is downloading a 300MB model or if it's stuck. The progress callback implementation took 20 lines of code but transformed the user experience.

**Quantization Strategy Requires Testing**: Initially, all models used q8 quantization. Florence-2's accuracy suffered significantly—captions became vague and generic. Switching to q4 improved speed with acceptable quality loss, but q8 was worse than both. Test quantization levels empirically; don't assume more quantization always means acceptable quality loss.

**Caching is Key**: The second semantic search being 50x faster than the first (database lookup vs AI inference) made caching indispensable. For any expensive operation (AI inference, video decode, audio processing), cache results aggressively.

### Performance Best Practices

**Profile First, Optimize Second**: Premature optimization wasted time on code that didn't matter. The render loop seemed like an obvious bottleneck—60fps means only 16ms per frame! Profiling revealed it typically took 2-3ms. The actual bottleneck was video decoding in the worker. Measure don't guess.

**Measure Everything**: Performance logging throughout the codebase enabled quick identification of regressions. When export suddenly took twice as long after a refactor, the logs pinpointed the problem immediately—the ImageBitmap conversion was happening on the main thread instead of the worker.

**Cache Aggressively, Evict Intelligently**: The LRU cache with 30-frame limit balanced performance and memory. Increasing to 60 frames helped occasional seeks but doubled memory usage for marginal gain. Decreasing to 15 frames caused stuttering during playback. The sweet spot required testing with real videos.

**Batch When Possible**: Every worker postMessage has overhead (~0.1ms). For 150-frame prefetch, that's 15ms of pure communication overhead if done individually. Batching reduced it to 0.1ms. For operations with repeated small data transfers, batching is essential.

### General Wisdom

**Browser APIs Evolve Rapidly**: WebCodecs, WebGPU, and other cutting-edge APIs are still stabilizing. Implementation details change between browser versions. Build with graceful degradation in mind—detect capabilities and fall back when needed.

**TypeScript is Worth It**: TypeScript caught dozens of bugs during development. Event type safety prevented passing wrong data shapes. The upfront cost of typing everything paid off many times over.

**Real-World Testing Matters**: Testing with diverse video files revealed edge cases never imagined: variable frame rates, unusual codecs, corrupt frames, gigantic files. Each edge case improved robustness. Don't just test with your own sample videos.

---

## Conclusion

Building a browser-based video editor is an ambitious undertaking, but modern web technologies make it not just possible but practical. The combination of WebCodecs for native video processing, WebAssembly and WebGPU for computational performance, Web Workers for threading, and sophisticated AI models running entirely client-side creates capabilities that would have been science fiction a few years ago.

### What We've Accomplished

Smart Web Video Edit demonstrates that the web platform is ready for professional-grade media applications. The implementation handles real-world videos, provides smooth 60fps playback, integrates AI-powered features that rival desktop applications, and exports high-quality video—all while keeping user data completely private through client-side processing.

The architectural patterns explored here—event-driven design with centralized state, worker-based video processing, device-aware AI loading, and aggressive performance optimization—apply beyond video editing. Any media-heavy web application (image editors, audio workstations, 3D modeling tools) benefits from these techniques.

### The State of Browser Capabilities

WebCodecs API has matured significantly. Browser support is good and improving: Chrome, Edge, and Opera support it fully; Safari has partial support with ongoing improvements. The performance is impressive—native video codecs running at full speed without plugins or downloads.

WebGPU is earlier in its lifecycle but already usable. Chrome and Edge support it; Safari and Firefox have it in development. The performance gains for AI inference are dramatic enough to justify implementing the WASM fallback.

Web Workers are mature and reliable across all modern browsers. They're essential for any CPU-intensive web application—there's no excuse for blocking the main thread.

### Future Possibilities

The foundation built here opens many possibilities:

**Real-Time Collaboration**: WebRTC enables multiple users editing the same project simultaneously. Operational transforms can sync timeline changes. Imagine Google Docs-style collaboration for video editing.

**More AI Features**: Object removal, style transfer, video super-resolution, automatic scene detection—dozens of AI models could enhance the editing experience. The infrastructure for model loading and inference is already in place.

**Advanced Effects**: WebGL/WebGPU shaders enable custom video effects impossible with 2D canvas. Blur, color grading, chroma key, particle effects—all executable on the GPU.

**Cloud Integration**: While processing stays local, optional cloud features make sense: project storage, asset libraries, render farms for final export. Privacy-preserving collaboration remains the default.

### Getting Started

The complete source code is available on GitHub at [https://github.com/apssouza22/web-video-edit](https://github.com/apssouza22/web-video-edit). The repository includes:

- Full implementation with detailed comments
- Architecture documentation with diagrams
- Setup instructions for local development
- Examples of adding new features

**Experience it yourself**:
- **Live Demo**: [https://apssouza22.github.io/smart-video-flow](https://apssouza22.github.io/smart-video-flow) - Load a video, try the AI features, export a clip. See what's possible in the browser today.
- **Video Walkthrough**: [https://www.youtube.com/watch?v=fq0kdTsJaDk&t=36s](https://www.youtube.com/watch?v=fq0kdTsJaDk&t=36s) - Watch a comprehensive demonstration of all features and capabilities.

### Contributing

This project benefits from community contributions. Whether you're adding features, fixing bugs, improving documentation, or optimizing performance, contributions are welcome. The modular architecture makes it easy to add new packages or enhance existing ones without touching core systems.

### Final Thoughts

The web platform's evolution has been remarkable. What started as a document viewer now runs applications rivaling native software. Video editing in the browser isn't a novelty or proof-of-concept—it's a viable approach with real advantages: no installation, cross-platform by default, automatic updates, and complete privacy.

The patterns and techniques presented here represent months of development, countless bugs, and hard-won insights. Use them as a foundation for your own projects. Whether building a video editor, image processor, audio tool, or entirely different application, the principles apply: modular architecture, event-driven communication, worker-based processing, device-aware optimization, and relentless attention to performance.

The future of web applications is incredibly bright. Modern APIs provide the capabilities. The only limit is our imagination.

Now go build something amazing.

---

## Additional Resources

**Project Links**:
- **GitHub Repository**: [https://github.com/apssouza22/web-video-edit](https://github.com/apssouza22/web-video-edit)
- **Live Demo**: [https://apssouza22.github.io/smart-video-flow](https://apssouza22.github.io/smart-video-flow)
- **Video Demonstration**: [https://www.youtube.com/watch?v=fq0kdTsJaDk&t=36s](https://www.youtube.com/watch?v=fq0kdTsJaDk&t=36s)
- **Architecture Documentation**: [docs/architecture](https://github.com/apssouza22/web-video-edit/tree/main/docs/architecture)

**Relevant Specifications**:
- [WebCodecs API](https://www.w3.org/TR/webcodecs/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [Web Workers](https://html.spec.whatwg.org/multipage/workers.html)

**Useful Libraries**:
- [Transformers.js](https://huggingface.co/docs/transformers.js) - Run Hugging Face models in the browser
- [MediaBunny](https://github.com/ThaUnknown/mediabunny) - WebCodecs-based video processing
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) - Run ONNX models in browsers

---

**About the Author**: This article documents the architecture and implementation of Smart Web Video Edit, an open-source browser-based video editor. The project demonstrates cutting-edge web technologies applied to a real-world problem: professional video editing without desktop software.

