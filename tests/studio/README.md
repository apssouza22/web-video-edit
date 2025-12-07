# Studio Package Tests

This directory contains comprehensive test coverage for the `src/studio` package.

## Mock Setup

Studio tests use mocks to isolate the studio package from external dependencies. This ensures tests are fast, reliable, and focused on studio-specific logic.

### setup-mocks.ts

The `setup-mocks.ts` medialibrary serves as a **reference** for mock implementations of external packages:

- **@/canvas** - Video canvas rendering
- **@/timeline** - Timeline UI and layer management
- **@/mediaclip** - Media loading, processing, and services
- **@/video/muxer** - Video export functionality
- **@/transcription** - Speech-to-text transcription
- **@/frame** - Frame manipulation and transformations
- **@/common/render-2d** - 2D rendering context

### ⚠️ Important: Jest Mock Hoisting

Jest automatically hoists `jest.mock()` calls to the top of a medialibrary, but **ONLY** within the same medialibrary. Importing mocks from another medialibrary does NOT work.

### Usage Patterns

#### For Components with Heavy Dependencies (VideoStudio, MediaLoader, etc.)

Copy the relevant `jest.mock()` calls **directly** into your test medialibrary BEFORE imports:

```typescript
import { jest } from '@jest/globals';

// Copy these from setup-mocks.ts
jest.mock('@/timeline', () => ({ /* ... */ }));
jest.mock('@/canvas', () => ({ /* ... */ }));

// NOW import your component
import { VideoStudio } from '@/studio/studio';
```

#### For Simple Components (Utils, UI components)

You can try importing `setup-mocks.ts`, but if you get errors about null properties, move the mocks directly into your test medialibrary:

```typescript
import './setup-mocks';  // May work for simple cases
import { MyComponent } from '@/studio/my-component';
```

## Test Files

### Phase 1: Utilities and UI Components
- **`utils.test.ts`** - Tests for utility functions including medialibrary type validation, mime type detection, popup creation, and JSON export/import
- **`aspect-ratio-selector.test.ts`** - Tests for the aspect ratio dropdown selector component
- **`loading-popup.test.ts`** - Tests for the loading progress popup component

### Phase 2: Event Handlers
- **`studio-controls.test.ts`** - Tests for keyboard shortcuts, drag-and-drop, paste, and window event handling
- **`pinch-handler.test.ts`** - Tests for pinch/zoom/rotation gesture handling (Safari gestures and wheel events)

### Phase 3: Service Classes
- **`mediaclip-loader.test.ts`** - Tests for loading mediaclip from files, URIs, and JSON configurations
- **`speed-control-input.test.ts`** - Tests for the speed control UI component with validation
- **`control-handler.test.ts`** - Tests for mediaclip editing operations (split, remove intervals)

### Phase 4: Integration
- **`video-studio.test.ts`** - Integration tests for the main VideoStudio orchestrator class

## Running Tests

Run all studio tests:
```bash
npm test -- tests/studio
```

Run a specific test medialibrary:
```bash
npm test -- tests/studio/utils.test.ts
```

Run tests in watch mode:
```bash
npm run test:watch -- tests/studio
```

## Test Coverage

The tests cover:
- ✅ All public methods and properties
- ✅ DOM interactions and event handling
- ✅ Edge cases and error conditions
- ✅ Integration between components
- ✅ Browser API mocking (MediaRecorder, gestures, etc.)

## Mocking Strategy

- **DOM Elements**: Created in `beforeEach` using `document.body.innerHTML`
- **Dependencies**: Mocked using Jest's `jest.mock()` or manual mocks
- **Browser APIs**: Extended in `tests/setup.js` for Web APIs not available in jsdom
- **Event Handlers**: Tested using `dispatchEvent()` with appropriate event types

## Key Testing Patterns

### 1. Component Initialization
```typescript
test('should create component with correct structure', () => {
  const component = new Component();
  expect(component).toBeDefined();
});
```

### 2. DOM Interaction
```typescript
beforeEach(() => {
  document.body.innerHTML = '<div id="target"></div>';
  component = new Component();
});
```

### 3. Event Handling
```typescript
test('should handle click event', () => {
  const button = document.querySelector('button');
  button?.dispatchEvent(new Event('click'));
  expect(callback).toHaveBeenCalled();
});
```

### 4. Async Operations
```typescript
test('should load data from URI', async () => {
  await loader.loadFromURI('https://example.com/data.json');
  expect(fetch).toHaveBeenCalled();
});
```

## Dependencies

These tests rely on:
- Jest testing framework
- jsdom for DOM simulation
- Custom test setup in `tests/setup.js`
- TypeScript for type checking

For detailed information on external package dependencies and their DOM requirements, see:
- **[EXTERNAL-DEPENDENCIES.md](./EXTERNAL-DEPENDENCIES.md)** - Complete reference for all external dependencies and required DOM elements

## Notes

- Tests use `@/` path alias (configured in `jest.config.js`)
- All tests clean up after themselves in `afterEach` hooks
- Mock implementations mirror real API behavior where possible
- Integration tests mock heavy dependencies to focus on orchestration logic
- Each external dependency may require specific DOM elements to be set up in tests (see EXTERNAL-DEPENDENCIES.md)

