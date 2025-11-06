# Studio Package Tests

## Overview
Add comprehensive test coverage for the `src/studio` package, testing all components from utilities to the main VideoStudio orchestrator.

## Implementation Steps

### Phase 1: Utilities and Standalone UI Components
- [x] Create test file for `utils.ts` functions
  - [x] Test `ext_map` mappings
  - [x] Test `uploadSupportedType` function
  - [x] Test `getSupportedMimeTypes` function
  - [x] Test `popup` function
  - [x] Test `exportToJson` function
  - [x] Test `addText` function

- [x] Create test file for `AspectRatioSelector`
  - [x] Test constructor and DOM creation
  - [x] Test mounting to parent element
  - [x] Test dropdown toggle functionality
  - [x] Test aspect ratio selection
  - [x] Test callback invocation on ratio change
  - [x] Test click outside to close
  - [x] Test active state management

- [x] Create test file for `LoadingPopup`
  - [x] Test constructor and element retrieval
  - [x] Test `startLoading` method
  - [x] Test `updateProgress` method
  - [x] Test multiple concurrent loading operations
  - [x] Test progress calculation for multiple loads
  - [x] Test auto-hide after completion
  - [x] Test display updates

### Phase 2: Event Handlers
- [x] Create test file for `StudioControls`
  - [x] Test initialization and event listener setup
  - [x] Test keyboard shortcuts (Space, Ctrl+J)
  - [x] Test drag and drop file handling
  - [x] Test paste event handling
  - [x] Test window resize handling
  - [x] Test touch move prevention

- [x] Create test file for `DragItemHandler`
  - [x] Test constructor and setup
  - [x] Test mouse drag events
  - [x] Test touch drag events
  - [x] Test callback invocation with coordinates
  - [x] Test drag only when layer is selected

- [x] Create test file for `PinchHandler`
  - [x] Test constructor and setup
  - [x] Test touch pinch gesture detection
  - [x] Test scale calculation
  - [x] Test rotation calculation
  - [x] Test callback invocation

### Phase 3: Service Classes
- [x] Create test file for `LayerLoader`
  - [x] Test `addLayerFromFile` method
  - [x] Test `loadLayerFromURI` method
  - [x] Test `loadLayersFromJson` method
  - [x] Test different layer types (Video, Image, Text, Audio)
  - [x] Test error handling for unsupported files
  - [x] Test layer initialization

- [x] Create test file for `SpeedControlInput`
  - [x] Test initialization
  - [x] Test speed value updates
  - [x] Test layer association
  - [x] Test UI updates

- [x] Create test file for `ControlsHandler`
  - [x] Test media transformation controls
  - [x] Test layer selection handling
  - [x] Test control updates

### Phase 4: Integration Tests
- [x] Create test file for `VideoStudio`
  - [x] Test constructor and component initialization
  - [x] Test `init` method
  - [x] Test `addLayer` method
  - [x] Test `remove` method
  - [x] Test `getMedias` method
  - [x] Test `getMediaById` method
  - [x] Test `getSelectedLayer` method
  - [x] Test `setSelectedLayer` method
  - [x] Test `cloneLayer` method
  - [x] Test `play` and `pause` methods
  - [x] Test `resize` method
  - [x] Test `upload` method
  - [x] Test `loadLayersFromJson` method
  - [x] Test `dumpToJson` method
  - [x] Test video export setup
  - [x] Test render loop
  - [x] Test total time calculation

## Testing Guidelines
- Use Jest mocking for DOM elements
- Mock external dependencies (canvas, timeline, media services)
- Follow existing test patterns from `tests/common/`
- Ensure proper cleanup in afterEach hooks
- Test both success and error scenarios
- Mock browser APIs appropriately (using tests/setup.js)

## Success Criteria
- All studio components have test coverage
- Tests pass successfully
- Code coverage maintained or improved
- Tests follow repository conventions

