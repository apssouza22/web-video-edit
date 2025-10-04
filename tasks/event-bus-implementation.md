# Event Bus Implementation Task

## Overview
Create a centralized EventBus class to replace the current single-listener event handling pattern throughout the codebase.

## Implementation Steps

- [x] Create EventBus class in `src/common/event-bus.ts`
  - [x] Implement core EventBus class with subscribe/unsubscribe/emit methods
  - [x] Add TypeScript types for event payloads
  - [x] Define standard event names as constants
  - [x] Create singleton instance for global use
  - [x] Add JSDoc documentation

- [x] Write tests for EventBus
  - [x] Test basic subscribe/emit functionality
  - [x] Test multiple listeners per event
  - [x] Test unsubscribe functionality
  - [x] Test event payload typing
  - [x] Test memory leak prevention

- [x] Update exports in `src/common/index.ts` (if exists) or create it

## Event Types to Support

Based on codebase analysis, the following events need to be supported:

### Player Events
- `player:timeUpdate` - Time position changes (newTime, oldTime)
- `player:layerTransformed` - Layer transformation (layer)

### Timeline Events
- `timeline:timeUpdate` - Timeline scrubbing (newTime, oldTime)
- `timeline:layerUpdate` - Layer actions (action, layer, oldLayer, extra)

### Transcription Events
- `transcription:removeInterval` - Remove time interval (startTime, endTime)
- `transcription:seek` - Seek to timestamp (timestamp)

### UI Events
- `ui:speedChange` - Playback speed change (speed)
- `ui:aspectRatioChange` - Aspect ratio change (ratio, oldRatio)

### Media Events
- `media:loadUpdate` - Layer loading progress (layer, progress, ctx, audioBuffer)

## Notes
- Follow repository coding style (PascalCase for classes, camelCase for methods, # for private)
- Ensure self-contained implementation
- Avoid coupling between packages
- Use events for communication between different packages

