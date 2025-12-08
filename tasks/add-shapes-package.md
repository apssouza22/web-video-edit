# Add Shapes Package

## Overview
Add a new shapes package to the video editor that allows drawing shapes (ellipse, square, line, arrows) on the canvas. This feature will be accessible via a new tab in the left navigation.

## Implementation Steps

- [x] 1. Create shape types (`src/mediaclip/shape/types.ts`)
- [x] 2. Create ShapeMedia class (`src/mediaclip/shape/shape.ts`)
- [x] 3. Create shape mediaclip index (`src/mediaclip/shape/index.ts`)
- [x] 4. Create ShapeTimelineLayer (`src/timeline/layers/shape-timeline-layer.ts`)
- [x] 5. Create ShapeView UI component (`src/shape/shape-view.ts`)
- [x] 6. Create shape package types (`src/shape/types.ts`)
- [x] 7. Create shape package index (`src/shape/index.ts`)
- [x] 8. Update index.html with shapes tab
- [x] 9. Update TimelineLayerFactory to handle ShapeMedia
- [x] 10. Update mediaclip index.ts to export shape functions
- [x] 11. Update main.ts to initialize shape controls

## Summary of Changes

### New Files Created

1. **`src/mediaclip/shape/types.ts`** - Shape type definitions including:
   - `ShapeType` enum (ELLIPSE, SQUARE, LINE, ARROW)
   - `ShapeStyle` interface (fillColor, strokeColor, strokeWidth, opacity)
   - `ShapeConfig` interface
   - Default styles and presets for each shape type

2. **`src/mediaclip/shape/shape.ts`** - `ShapeMedia` class extending `FlexibleMedia`:
   - Renders ellipse, square, line, and arrow shapes
   - Supports customizable colors, stroke width, and opacity
   - Implements clone and render methods

3. **`src/mediaclip/shape/index.ts`** - Exports for shape mediaclip module

4. **`src/timeline/layers/shape-timeline-layer.ts`** - Timeline layer for shapes:
   - Green color scheme for shape layers
   - Square symbol for visual identification

5. **`src/shape/shape-view.ts`** - UI component for shapes tab:
   - Grid of shape buttons
   - Click handlers to create shapes

6. **`src/shape/types.ts`** - Shape button configuration with SVG icons

7. **`src/shape/index.ts`** - Exports for shape UI module

### Modified Files

1. **`index.html`** - Added shapes tab button and content area

2. **`src/timeline/timeline-layer-factory.ts`** - Added case for `ShapeMedia`

3. **`src/mediaclip/index.ts`** - Added exports for shapes and `createMediaShape` factory

4. **`src/main.ts`** - Added shape controls initialization

5. **`assets/css/style.css`** - Added styles for shapes grid and buttons
