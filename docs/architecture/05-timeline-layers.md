# Timeline & Media Layers Architecture

## Overview

The Timeline system provides a visual interface for arranging and manipulating medialayer. Media layers represent different types of content (video, audio, image, text) with unified interfaces for both timeline display and canvas rendering.

## Timeline System Architecture

```mermaid
graph TB
    subgraph "Timeline UI"
        TLCanvas[Timeline Canvas]
        TimeMarker[Time Marker]
        Zoom[Zoom Controls]
        Scroll[Scroll Handler]
    end
    
    subgraph "Timeline Core"
        Timeline[Timeline Manager]
        TLRender[Timeline Layer Render]
        TLFactory[Timeline Layer Factory]
        DragHandler[Drag Handler]
        ReorderHandler[Layer Reorder Handler]
    end
    
    subgraph "Timeline Layers"
        TLBase[TimelineLayer<br/>Base Class]
        VideoTL[VideoTimelineLayer]
        AudioTL[AudioTimelineLayer]
        ImageTL[ImageTimelineLayer]
        TextTL[TextTimelineLayer]
    end
    
    subgraph "Media Layers"
        MediaBase[AbstractMedia<br/>Base Class]
        VideoMedia[VideoMedia]
        AudioMedia[AudioMedia]
        ImageMedia[ImageMedia]
        TextMedia[TextMedia]
    end
    
    subgraph "Player System"
        Player[VideoCanvas]
        CanvasLayers[Canvas Layers]
    end
    
    subgraph "Event System"
        EventBus[EventBus]
        TimelineEvents[Timeline Events]
        PlayerEvents[Player Events]
    end
    
    TLCanvas --> Timeline
    TimeMarker --> Timeline
    Zoom --> Timeline
    Scroll --> Timeline
    
    Timeline --> TLRender
    Timeline --> DragHandler
    Timeline --> ReorderHandler
    TLRender --> TLFactory
    
    TLFactory --> VideoTL
    TLFactory --> AudioTL
    TLFactory --> ImageTL
    TLFactory --> TextTL
    
    VideoTL --> TLBase
    AudioTL --> TLBase
    ImageTL --> TLBase
    TextTL --> TLBase
    
    TLBase -.-> MediaBase
    VideoTL -.-> VideoMedia
    AudioTL -.-> AudioMedia
    ImageTL -.-> ImageMedia
    TextTL -.-> TextMedia
    
    MediaBase --> Player
    VideoMedia --> CanvasLayers
    AudioMedia --> CanvasLayers
    ImageMedia --> CanvasLayers
    TextMedia --> CanvasLayers
    
    Timeline --> EventBus
    Player --> EventBus
    EventBus --> TimelineEvents
    EventBus --> PlayerEvents
    
    style Timeline fill:#d4edda
    style TLFactory fill:#fff3cd
    style MediaBase fill:#e1f5ff
    style Player fill:#d4edda
    style EventBus fill:#fff3cd
```

## Media Layer Hierarchy

### AbstractMedia Base Class

All medialayer types inherit from `AbstractMedia`, providing a unified interface.

```mermaid
classDiagram
    class AbstractMedia {
        <<abstract>>
        +id: string
        +name: string
        +startTime: number
        +totalTimeInMilSeconds: number
        +width: number
        +height: number
        +x: number
        +y: number
        +rotation: number
        +canvas: HTMLCanvasElement
        +ctx: CanvasRenderingContext2D
        +ready: boolean
        +framesCollection: FrameService
        +render(ctx, time, playing)
        +adjustTotalTime(diff)
        +removeInterval(start, end)
    }
    
    class VideoMedia {
        +medialibrary: File
        +videoMetadata: VideoMetadata
        +fps: number
        +loadVideo()
        +render(ctx, time, playing)
    }
    
    class AudioMedia {
        +audioBuffer: AudioBuffer
        +audioSource: AudioBufferSourceNode
        +playerAudioContext: AudioContext
        +loadAudio()
        +connectAudioSource()
        +render(ctx, time, playing)
    }
    
    class ImageMedia {
        +image: HTMLImageElement
        +loadImage()
        +render(ctx, time, playing)
    }
    
    class TextMedia {
        +text: string
        +fontSize: number
        +fontFamily: string
        +color: string
        +render(ctx, time, playing)
    }
    
    AbstractMedia <|-- VideoMedia
    AbstractMedia <|-- AudioMedia
    AbstractMedia <|-- ImageMedia
    AbstractMedia <|-- TextMedia
```

### Common Properties

All medialayer layers share:
- **Position**: `x`, `y` coordinates on canvas
- **Size**: `width`, `height` dimensions
- **Timing**: `startTime`, `totalTimeInMilSeconds`
- **Transform**: `rotation`, scale, opacity
- **Canvas**: Own canvas for rendering
- **State**: `ready` flag, loading progress

---

## Timeline Layer System

### Timeline Layer Factory

Creates appropriate timeline renderers based on medialayer type.

```typescript
class TimelineLayerFactory {
  static createTimelineLayer(
    ctx: CanvasRenderingContext2D,
    layer: MediaInterface,
    totalTime: number,
    canvasWidth: number
  ): TimelineLayer {
    const layerType = layer.constructor.name;
    
    switch (layerType) {
      case 'AudioMedia':
        return new AudioTimelineLayer(ctx, layer, totalTime, canvasWidth);
      case 'VideoMedia':
        return new VideoTimelineLayer(ctx, layer, totalTime, canvasWidth);
      case 'ImageMedia':
        return new ImageTimelineLayer(ctx, layer, totalTime, canvasWidth);
      case 'TextMedia':
        return new TextTimelineLayer(ctx, layer, totalTime, canvasWidth);
    }
  }
}
```

### Timeline Layer Rendering

```mermaid
sequenceDiagram
    participant Timeline
    participant Render as TimelineLayerRender
    participant Factory as TimelineLayerFactory
    participant TLLayer as Timeline Layer
    participant Media as Media Layer

    Timeline->>Render: render()
    
    loop For each medialayer layer
        Render->>Factory: createTimelineLayer(medialayer)
        Factory->>TLLayer: new VideoTimelineLayer()
        TLLayer->>Media: Get properties
        Render->>TLLayer: render(yPos, height, selected)
        TLLayer->>TLLayer: Draw track background
        TLLayer->>TLLayer: Draw waveform/thumbnail
        TLLayer->>TLLayer: Draw symbol
        TLLayer->>TLLayer: Draw layer name
        TLLayer->>TLLayer: Draw resize handles
    end
```

### Timeline Layer Types

#### VideoTimelineLayer
```mermaid
graph LR
    A[Video Track] --> B[Blue Gradient]
    B --> C[Film Strip Symbol]
    C --> D[Layer Name]
    D --> E[Resize Handles]
    
    style A fill:#2196F3
```

**Visual Features**:
- Blue color scheme
- Film strip icon (🎬)
- Thumbnail preview (if available)
- Waveform if audio present

---

#### AudioTimelineLayer
```mermaid
graph LR
    A[Audio Track] --> B[Green Gradient]
    B --> C[Waveform Display]
    C --> D[Layer Name]
    D --> E[Resize Handles]
    
    style A fill:#4CAF50
```

**Visual Features**:
- Green color scheme
- Audio waveform visualization
- Peak amplitude indicators
- Duration display

---

#### ImageTimelineLayer
```mermaid
graph LR
    A[Image Track] --> B[Orange Gradient]
    B --> C[Image Icon]
    C --> D[Layer Name]
    D --> E[Resize Handles]
    
    style A fill:#FF9800
```

**Visual Features**:
- Orange color scheme
- Image icon (🖼️)
- Thumbnail preview
- Duration bar

---

#### TextTimelineLayer
```mermaid
graph LR
    A[Text Track] --> B[Purple Gradient]
    B --> C[Text Symbol]
    C --> D[Layer Name]
    D --> E[Resize Handles]
    
    style A fill:#9C27B0
```

**Visual Features**:
- Purple color scheme
- "T" symbol
- Text preview
- Duration bar

---

## Timeline Interactions

### Drag and Drop

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Dragging: mousedown on layer
    Dragging --> Dragging: mousemove
    Dragging --> Dropped: mouseup
    Dropped --> Idle: update layer position
    
    Idle --> Resizing: mousedown on handle
    Resizing --> Resizing: mousemove
    Resizing --> Resized: mouseup
    Resized --> Idle: update layer duration
```

**Drag Handler**:
```typescript
class DragHandler {
  private draggedLayer: AbstractMedia | null = null;
  private dragStartX: number = 0;
  private dragStartTime: number = 0;
  
  onMouseDown(event: MouseEvent, layer: AbstractMedia): void {
    this.draggedLayer = layer;
    this.dragStartX = event.clientX;
    this.dragStartTime = layer.startTime;
  }
  
  onMouseMove(event: MouseEvent): void {
    if (!this.draggedLayer) return;
    
    const deltaX = event.clientX - this.dragStartX;
    const deltaTime = this.pixelsToTime(deltaX);
    
    this.draggedLayer.startTime = this.dragStartTime + deltaTime;
    this.emit(new TimelineLayerUpdateEvent('select', this.draggedLayer));
  }
}
```

### Layer Reordering

```mermaid
sequenceDiagram
    participant User
    participant Handler as ReorderHandler
    participant Timeline
    participant Studio as VideoStudio
    participant Player

    User->>Handler: Drag layer up/down
    Handler->>Handler: Calculate new index
    Handler->>Timeline: Reorder layer
    Timeline->>Studio: emit(TimelineLayerUpdateEvent)
    Studio->>Player: Update layer order
    Player->>Player: Re-render
```

### Time Marker

```mermaid
graph LR
    A[Time Marker] --> B[Current Time Display]
    B --> C[Vertical Line]
    C --> D[Draggable Handle]
    
    style A fill:#ff5722
```

**Features**:
- Shows current playback time
- Draggable to seek
- Snaps to frames
- Synchronized with player

---

## Layer Operations

### Split Layer

```mermaid
sequenceDiagram
    participant User
    participant Timeline
    participant MediaService
    participant Original as Original Layer
    participant Clone as Cloned Layer

    User->>Timeline: Split at time T
    Timeline->>MediaService: splitMedia(layer, time)
    MediaService->>Original: Calculate split point
    MediaService->>Clone: Clone layer
    MediaService->>Original: Truncate frames before T
    MediaService->>Clone: Keep frames before T
    Original->>Original: Adjust startTime
    Clone->>Clone: Keep original startTime
    MediaService->>Timeline: Return cloned layer
    Timeline->>Timeline: Add both layers
```

**Split Logic**:
```typescript
splitMedia(layer: AbstractMedia, splitTime: number): AbstractMedia {
  const clone = this.clone(layer);
  
  // Calculate percentage through layer
  const pct = (splitTime - layer.startTime) / layer.totalTimeInMilSeconds;
  const splitIndex = Math.round(pct * layer.framesCollection.frames.length);
  
  // Clone gets frames before split
  clone.framesCollection.frames = layer.framesCollection.frames.splice(0, splitIndex);
  clone.totalTimeInMilSeconds = pct * layer.totalTimeInMilSeconds;
  
  // Original gets frames after split
  layer.startTime = layer.startTime + clone.totalTimeInMilSeconds;
  layer.totalTimeInMilSeconds -= clone.totalTimeInMilSeconds;
  
  return clone;
}
```

---

### Clone Layer

```mermaid
sequenceDiagram
    participant User
    participant Timeline
    participant MediaService
    participant Original as Original Layer
    participant Clone as New Layer

    User->>Timeline: Clone layer
    Timeline->>MediaService: clone(layer)
    MediaService->>Clone: Create new instance
    MediaService->>Clone: Copy all properties
    MediaService->>Clone: Copy frame references
    Clone->>Clone: Offset startTime (+100ms)
    MediaService->>Timeline: Return clone
    Timeline->>Timeline: Add to layers
```

---

### Remove Interval

```mermaid
sequenceDiagram
    participant User
    participant Transcription
    participant MediaService
    participant VideoLayers
    participant AudioLayers

    User->>Transcription: Select interval to remove
    Transcription->>MediaService: removeInterval(start, end)
    
    par Remove from video
        MediaService->>VideoLayers: removeVideoInterval()
        VideoLayers->>VideoLayers: Remove frames in range
        VideoLayers->>VideoLayers: Shift later frames
    and Remove from audio
        MediaService->>AudioLayers: removeAudioInterval()
        AudioLayers->>AudioLayers: Cut audio buffer
        AudioLayers->>AudioLayers: Shift later audio
    end
    
    MediaService->>User: Interval removed
```

---

## Player Canvas Rendering

### Layer Rendering Order

```mermaid
graph TD
    A[Render Loop] --> B[Clear Canvas]
    B --> C[Get Layers in Order]
    C --> D{For Each Layer}
    D --> E[Check if Active]
    E -->|Yes| F[Render Layer]
    E -->|No| D
    F --> G[Apply Transformations]
    G --> H[Draw to Canvas]
    H --> D
    D --> I[Restore Context]
    
    style A fill:#d4edda
    style F fill:#fff3cd
```

### Layer Transformation

```typescript
class CanvasLayer {
  render(ctx: CanvasRenderingContext2D, time: number, playing: boolean): void {
    const medialayer = this.medialayer;
    
    // Check if layer is active at current time
    if (time < medialayer.startTime || 
        time > medialayer.startTime + medialayer.totalTimeInMilSeconds) {
      return;
    }
    
    ctx.save();
    
    // Apply transformations
    ctx.translate(medialayer.x, medialayer.y);
    ctx.rotate(medialayer.rotation * Math.PI / 180);
    ctx.globalAlpha = medialayer.opacity || 1;
    
    // Render layer content
    medialayer.render(ctx, time - medialayer.startTime, playing);
    
    // Draw selection border if selected
    if (this.selected) {
      this.drawSelectionBorder(ctx);
      this.drawTransformHandles(ctx);
    }
    
    ctx.restore();
  }
}
```

---

## Time Synchronization

### Timeline ↔ Player Sync

```mermaid
sequenceDiagram
    participant Timeline
    participant EventBus
    participant Player

    Note over Timeline,Player: User seeks on timeline
    Timeline->>Timeline: Calculate new time
    Timeline->>EventBus: emit(TimelineTimeUpdateEvent)
    EventBus->>Player: Notify time change
    Player->>Player: setTime(newTime)
    Player->>Player: Refresh audio
    Player->>Player: Render frame
    
    Note over Timeline,Player: Player updates during playback
    Player->>Player: Update time
    Player->>EventBus: emit(PlayerTimeUpdateEvent)
    EventBus->>Timeline: Notify time change
    Timeline->>Timeline: Update time marker
```

---

## Zoom and Pan

### Zoom Functionality

```typescript
class ZoomHandler {
  private zoomLevel: number = 1.0;
  private minZoom: number = 0.1;
  private maxZoom: number = 10.0;
  
  zoom(delta: number, centerX: number): void {
    const oldZoom = this.zoomLevel;
    this.zoomLevel = Math.max(this.minZoom, 
                              Math.min(this.maxZoom, 
                                      this.zoomLevel + delta));
    
    // Adjust scroll position to zoom toward cursor
    const scrollAdjust = centerX * (this.zoomLevel - oldZoom);
    this.timeline.scrollX += scrollAdjust;
    
    this.timeline.render();
  }
}
```

**Zoom Levels**:
- **0.1x**: See hours of content
- **1.0x**: Default view
- **10.0x**: Frame-by-frame precision

---

## Layer Properties

### Standard Layer Interface

```typescript
interface MediaInterface {
  id: string;
  name?: string;
  startTime: number;              // milliseconds
  totalTimeInMilSeconds: number;   // milliseconds
  
  // Adjust duration
  adjustTotalTime(diff: number): void;
  
  // Render at specific time
  render(ctx: CanvasRenderingContext2D, time: number, playing?: boolean): void;
}
```

### Transform Properties

```typescript
interface TransformProperties {
  x: number;          // X position on canvas
  y: number;          // Y position on canvas
  width: number;      // Width in pixels
  height: number;     // Height in pixels
  rotation: number;   // Rotation in degrees
  scaleX: number;     // Horizontal scale
  scaleY: number;     // Vertical scale
  opacity: number;    // 0.0 to 1.0
}
```

---

## Best Practices

### 1. Layer Lifecycle
```typescript
class MediaLayer {
  load() {
    // Load resources
  }
  
  render(ctx, time, playing) {
    // Render content
  }
  
  cleanup() {
    // Clean up resources
  }
}
```

### 2. Performance Optimization
- Cache rendered frames
- Only render visible layers
- Use requestAnimationFrame for smooth updates
- Debounce timeline updates

### 3. Error Handling
- Handle missing frames gracefully
- Validate time ranges
- Check canvas context availability

### 4. User Feedback
- Show loading state during operations
- Provide visual feedback for drag operations
- Display layer information on hover

### 5. Accessibility
- Keyboard shortcuts for common operations
- Clear visual indicators
- Screen reader support for timeline

