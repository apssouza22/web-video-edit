# AGENTS.md - LLM Agent Guidelines

This file provides comprehensive guidance for LLM agents (like Claude Code, Cursor, GitHub Copilot) when working with this codebase. Following these guidelines ensures consistent, high-quality contributions.

## Quick Start Checklist

Before starting any task:
1. Read this file completely
2. Read README.md for project overview
3. Explore relevant package documentation in `src/[package-name]/`
4. Understand the task requirements completely
5. Create a task plan and get user approval

## Understanding This Codebase

### Project Overview
This is a browser-based video editor that processes videos entirely client-side using modern web technologies (WebAssembly, WebCodecs, WebGPU). The application is built with TypeScript and follows a modular, event-driven architecture.

### Package Organization
The codebase is organized into self-contained packages under `src/`:

- `canvas/` - Canvas rendering and visual effects
- `common/` - Shared utilities, events, and helpers
- `mediaclip/` - Media clip abstractions (audio, video, image, text)
- `medialibrary/` - Media asset management
- `recording/` - Screen and camera recording
- `search/` - Video content search using AI
- `shape/` - Shape and graphics primitives
- `speech/` - Text-to-speech functionality
- `studio/` - Main editor UI and orchestration
- `timeline/` - Timeline management and playback control
- `transcription/` - Audio-to-text transcription
- `video/` - Video encoding/decoding (mux/demux)

### Key Architectural Principles
- **Package Independence**: Each package should be self-contained with minimal coupling
- **Event-Driven Communication**: Packages communicate via events, not direct method calls
- **Browser-First**: No Node.js-specific APIs; everything runs in the browser
- **Class-Based Design**: One class per file, using PascalCase naming
- **Public API Focus**: Only test and document public APIs

### Domain Knowledge: Video Editing Concepts
- **Timeline**: Linear sequence of clips with layers (video, audio, text overlays)
- **Clip**: A segment of media with start/end points and transformations
- **Demux**: Extracting audio/video streams from a container format
- **Mux**: Combining audio/video streams into a container format
- **Codec**: Algorithm for encoding/decoding video (e.g., H.264, VP9)
- **Frame**: Single image in a video sequence
- **Sample Rate**: Audio samples per second (e.g., 44.1kHz, 48kHz)

## Task Execution Plan

### Step 1: Understand the Task
- Read the user's request carefully
- Ask clarifying questions if requirements are ambiguous
- Identify which packages will be affected
- Determine if this is a bug fix, feature addition, refactor, or documentation task

### Step 2: Explore the Codebase
- Use search tools to find relevant files
- Read existing implementations to understand patterns
- Check for similar functionality that can be referenced
- Review tests to understand expected behavior

### Step 3: Create an Execution Plan
**Important**: Always plan the task step by step before writing code. Ask for permission to proceed with the plan.

**Important**: Before proceeding with the plan, create a new file named `tasks/name-of-the-task.md`. Based on the approved plan, list all necessary implementation steps as GitHub-style checkboxes (`- [ ] Step Description`). Use sub-bullets for granular details within each main step.

**CRITICAL**: After you successfully complete each step, you MUST update the `tasks/name-of-the-task.md` file by changing the corresponding checkbox from `- [ ]` to `- [x]`.

Only proceed to the *next* unchecked item after confirming the previous one is checked off in the file. Announce which step you are starting.

### Step 4: Implement with Testing
- Write clean, self-documenting code
- Follow the code style guide (see below)
- Write tests for new functionality
- Run tests to verify behavior
- Update documentation if needed

### Step 5: Verify and Clean Up
- Run `npm run build` to check for TypeScript errors
- Run `npm test` to verify all tests pass
- Remove any debug code or comments
- Ensure no unused imports or variables

## JavaScript and TypeScript Code Style Guide

### Core Principles
1. **One class per file** - Use PascalCase for class names and file names
2. **Self-documenting code** - Avoid comments that describe functionality; write clear, expressive code instead
3. **Private by default** - Use private methods for helpers not intended for external use
4. **No global scope** - Encapsulate all code within classes or modules
5. **Event-driven architecture** - Avoid tight coupling; use events for inter-package communication
6. **Package cohesion** - Keep related functionality together within the same package
7. **YAGNI principle** - Don't add code that isn't needed for the current task

### Specific Rules
- **Language**: TypeScript, browser-first (no Node.js-specific APIs in `src/`)
- **Indentation**: 2 spaces (no tabs)
- **Line width**: ~120 characters maximum
- **File naming**: kebab-case (e.g., `video-export-service.ts`, `audio-clip.ts`)
- **Symbol naming**:
  - `camelCase` for functions and variables (e.g., `processVideo`, `clipDuration`)
  - `PascalCase` for classes (e.g., `VideoExportService`, `AudioClip`)
  - `UPPER_SNAKE_CASE` for constants (e.g., `DEFAULT_FRAME_RATE`, `MAX_VOLUME`)
- **Imports**:
  - Use relative imports within packages
  - Import from package entry points (`index.ts`), not direct files
  - In tests, use `@/` alias which maps to `src/` (configured in Jest)
- **Exports**: Export public APIs through package root `index.ts`
- **Dead code**: Remove unused code immediately; don't leave it commented out

### Code Organization Pattern
```typescript
// video-export-service.ts

import { EventEmitter } from '@/common/event-emitter';
import type { ExportOptions } from './types';

export class VideoExportService {
  private encoder: VideoEncoder | null = null;
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  public async export(options: ExportOptions): Promise<Blob> {
    this.validateOptions(options);
    return this.performExport(options);
  }

  private validateOptions(options: ExportOptions): void {
    // Validation logic
  }

  private async performExport(options: ExportOptions): Promise<Blob> {
    // Implementation
  }
}
```

### DOM Manipulation - Template Literals (Preferred)

When creating HTML elements dynamically, **prefer using template literals** over `document.createElement()`:

**✅ GOOD - Use Template Literals:**
```typescript
private createChunkElement(chunk: TextChunk, index: number, audioId?: string): string {
  const escapedText = this.escapeHtml(chunk.text);

  const chunkHTML = `
    <span class="text-chunk"
          data-index="${index}"
          data-start-time="${chunk.timestamp[0]}"
          data-end-time="${chunk.timestamp[1]}"
          data-audio-id="${audioId || ''}">
      <span class="chunk-text">${escapedText}</span>
      <span class="close"
            style="font-size: 0.8em; cursor: pointer; margin-left: 5px; opacity: 0.7;">X</span>
    </span>
  `;

  return chunkHTML;
}

// Use with innerHTML or insertAdjacentHTML
container.innerHTML = this.createChunkElement(chunk, 0, 'audio-123');
// or
container.insertAdjacentHTML('beforeend', this.createChunkElement(chunk, 0, 'audio-123'));
```

**❌ AVOID - createElement() for complex HTML:**
```typescript
// Don't do this for complex structures
private createChunkElement(chunk: TextChunk, index: number): HTMLElement {
  const span = document.createElement('span');
  span.className = 'text-chunk';
  span.dataset.index = index.toString();
  span.dataset.startTime = chunk.timestamp[0].toString();
  // ... many more lines of DOM manipulation
  const textSpan = document.createElement('span');
  textSpan.className = 'chunk-text';
  textSpan.textContent = chunk.text;
  span.appendChild(textSpan);
  // ... etc
  return span;
}
```

**Why Template Literals?**
- More readable and maintainable
- Closer to actual HTML structure
- Easier to style and modify
- Less verbose than createElement chains
- Better for complex nested structures

**Important Security Note:**
Always escape user-provided content when using template literals to prevent XSS attacks:

```typescript
private escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**When to Use createElement():**
- Single, simple elements (e.g., `document.createElement('div')`)
- When you need the DOM reference immediately
- For programmatic element manipulation

### What to Avoid
- ❌ Global variables or functions outside of classes
- ❌ Direct imports between packages (use events instead)
- ❌ Comments explaining what code does (code should be self-explanatory)
- ❌ Adding "nice to have" features not requested
- ❌ Unused imports, variables, or parameters
- ❌ Mixing concerns across package boundaries
- ❌ Using `createElement()` for complex nested HTML structures (use template literals instead)

## Testing Guidelines

### Framework and Setup
- **Framework**: Jest with `jsdom` environment for browser API simulation
- **Test location**: Place tests under `tests/` directory
  - Mirror the `src/` structure (e.g., `tests/video/mux/` for `src/video/mux/`)
- **File naming**: Use `*.test.js`, `*.test.ts`, `*.spec.js`, or `*.spec.ts`
- **Import alias**: Use `@/` to import from `src/` in tests (e.g., `import { VideoClip } from '@/video/clip'`)

### Testing Principles
1. **Test public APIs only** - Don't test private methods or internal implementation details
2. **Mock external dependencies** - Isolate the unit being tested
3. **One test file per source file** - Keep tests organized and discoverable
4. **Descriptive test names** - Use `describe()` and `it()` to create readable test hierarchies
5. **AAA pattern** - Arrange, Act, Assert structure for clarity

### Test Example
```typescript
// tests/video/mux/video-export-service.test.ts

import {afterEach, beforeEach, describe, expect, jest, test} from '@jest/globals';

// Required to mock the package
const { VideoExportService } await import('@/video/mux/video-export-service');
const { EventEmitter } await import('@/common/event-emitter');


describe('VideoExportService', () => {
  let service: VideoExportService;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    service = new VideoExportService(eventEmitter);
  });

  describe('export', () => {
    it('should export video with valid options', async () => {
      // Arrange
      const options = { codec: 'h264', quality: 'high' };

      // Act
      const result = await service.export(options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
    });

    it('should throw error for invalid codec', async () => {
      // Arrange
      const options = { codec: 'invalid', quality: 'high' };

      // Act & Assert
      await expect(service.export(options)).rejects.toThrow();
    });
  });
});
```

### Running Tests
- **All tests**: `npm test`
- **Watch mode**: `npm run test:watch` (re-runs on file changes)
- **Single test file**: `npm test tests/video/mux/video-export-service.test.ts`
- **With ECMAScript modules**: Tests use `node --experimental-vm-modules` (configured in package.json)

## Common Patterns in This Codebase

### Event-Driven Communication
Packages communicate via events to maintain loose coupling:

```typescript
// Emitting events
this.eventEmitter.emit('video:exported', { filename, size });

// Listening to events
this.eventEmitter.on('timeline:play', (timestamp) => {
  this.updatePlayhead(timestamp);
});
```

### Service Pattern
Most packages expose services as classes with clear responsibilities:

```typescript
export class TimelineService {
  private clips: Clip[] = [];
  private currentTime: number = 0;

  public addClip(clip: Clip): void { /* ... */ }
  public removeClip(id: string): void { /* ... */ }
  public play(): void { /* ... */ }
}
```

### Interface/Type Definitions
Define clear contracts using TypeScript interfaces:

```typescript
// types.ts
export interface IClip {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface ExportOptions {
  codec: 'h264' | 'vp9' | 'av1';
  quality: 'low' | 'medium' | 'high';
  fps: number;
}
```

### Package Entry Points
Each package exports its public API through `index.ts`:

```typescript
// src/video/mux/index.ts
export { VideoExportService } from './video-export-service';
export { CodecSelector } from './codec-selector';
export type { ExportOptions, VideoCodec } from './types';
```

## When to Ask Questions vs. Proceed

### Always Ask When:
- Requirements are ambiguous or unclear
- Multiple valid implementation approaches exist
- The task might affect other parts of the system
- Security or performance implications are unclear
- You need to make architectural decisions
- The user's intent is uncertain

### Proceed Without Asking When:
- The task is clearly defined and straightforward
- You're following established patterns in the codebase
- The change is localized and low-risk
- You're fixing an obvious bug
- The implementation approach is standard

### Example Scenarios

**Scenario 1: Clear Task** ✅ Proceed
> User: "Fix the typo in the error message on line 45 of video-export-service.ts"
- Action: Read the file, fix the typo, done.

**Scenario 2: Ambiguous Task** ❓ Ask Questions
> User: "Add video filters"
- Questions to ask:
  - What types of filters? (brightness, contrast, blur, etc.)
  - Should filters be stackable?
  - Should there be a filter preview?
  - Where in the UI should filters appear?

**Scenario 3: Technical Decision** ❓ Ask or Propose
> User: "Improve video export performance"
- Approach 1: Explore the code, identify bottlenecks, propose specific optimizations
- Approach 2: Ask what specific performance issues they're experiencing

## Commit & Pull Request Guidelines

### Commit Messages
- **Format**: Imperative mood, concise subject (≤ 50 chars)
- **Good examples**:
  - `Add video speed control to timeline`
  - `Fix audio sync issue in export`
  - `Refactor clip management in timeline service`
- **Bad examples**:
  - `Updated stuff` (too vague)
  - `Fixed bug` (what bug?)
  - `WIP` (never commit work in progress)

### Commit Structure
```
Add video speed control to timeline

Implements a speed controller that allows users to adjust
playback speed from 0.25x to 2x. Uses the TimelineService's
existing playback APIs.

Tradeoffs:
- Chose simple multiplier approach over time-stretching
- May need frame interpolation for very slow speeds in future
```

### Pull Requests
- **Title**: Clear, descriptive summary of changes
- **Description**: Include:
  - What changed and why
  - How to test the changes
  - Screenshots/GIFs for UI changes
  - Link to related issues
  - Known limitations or follow-up tasks
- **Scope**: Group related changes together; include tests when modifying logic

## Security & Configuration Tips
- **No large files**: Do not commit large media assets; prefer small samples in `assets/` for demos/tests
- **Browser compatibility**: Check `src/common/browser-support.js` for supported features
- **Experimental APIs**: Gate cutting-edge browser APIs behind feature detection with fallbacks
- **User data**: All processing is client-side; never send user media to servers without explicit consent
- **CORS**: Be aware of CORS restrictions when loading media from external sources

## Troubleshooting Common Issues

### TypeScript Errors After Changes
```bash
npm run build
```
- Check for type mismatches in interfaces
- Ensure all imports are correctly typed
- Verify that new files are included in the TypeScript config

### Tests Failing
```bash
npm test -- --verbose
```
- Check if you're testing private methods (don't)
- Verify mocks are properly configured
- Ensure test environment has required browser APIs mocked

### Event Not Firing
- Verify event name spelling matches exactly
- Check that listener is registered before event is emitted
- Use browser DevTools to log events: `eventEmitter.on('*', console.log)`

### Import Errors in Tests
- Remember to use `@/` alias for `src/` imports in tests
- Check that the file exports what you're trying to import
- Verify package `index.ts` includes the export

### Performance Issues with Video
- Check video dimensions (large videos = slow processing)
- Verify canvas operations are optimized
- Consider using OffscreenCanvas for better performance
- Profile using Chrome DevTools Performance tab

## Working with Video/Media - Best Practices

### Video Processing
1. **Always check codec support** before attempting to decode/encode
2. **Handle errors gracefully** - video operations can fail for many reasons
3. **Use VideoFrame for manipulation** - it's the standard for WebCodecs
4. **Clean up resources** - call `.close()` on VideoFrame, VideoEncoder, VideoDecoder
5. **Be aware of memory** - video processing is memory-intensive; monitor usage

### Canvas Operations
1. **Use appropriate canvas size** - match output resolution to avoid scaling
2. **Clear canvas between frames** when needed
3. **Optimize drawing operations** - batch operations when possible
4. **Use OffscreenCanvas** for background processing

### Audio Processing
1. **Match sample rates** when mixing audio sources
2. **Handle mono/stereo conversions** explicitly
3. **Watch for audio clipping** - normalize volume when needed
4. **Test with different audio codecs** - AAC, Opus, MP3 all behave differently

### Timeline Management
1. **Keep time in seconds** - use consistent units throughout
2. **Handle overlapping clips** - define clear precedence rules
3. **Optimize playback** - preload frames when possible
4. **Sync audio/video carefully** - timing drift is a common issue

## LLM Agent-Specific Tips

### For Effective Code Generation
1. **Read before writing** - Always read existing files before proposing changes
2. **Follow the patterns** - Don't introduce new patterns unless there's a good reason
3. **Keep it simple** - Avoid over-engineering; solve the specific problem
4. **Test as you go** - Write tests alongside implementation
5. **Think about edge cases** - But don't handle cases that can't happen

### For Effective Communication
1. **Be concise** - Users appreciate brief, clear responses
2. **Show your reasoning** - Explain why you chose an approach
3. **Admit uncertainty** - It's better to ask than guess wrong
4. **Provide context** - Reference file paths and line numbers
5. **Offer options** - When multiple approaches exist, present them

### For Maintaining Quality
1. **Run tests before claiming completion** - `npm test`
2. **Build before claiming completion** - `npm run build`
3. **Clean up after yourself** - Remove debug code, unused imports
4. **Update documentation** - If you change public APIs
5. **Follow the checklist** - Use the task tracking file consistently

## Quick Reference

### Essential Commands
```bash
npm install              # Install dependencies
npm start               # Start dev server (http://localhost:8001)
npm run build           # Build for production (outputs to dist/)
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
```

### File Structure Quick Map
```
src/
├── canvas/          # Canvas rendering
├── common/          # Shared utilities, events
├── mediaclip/       # Clip abstractions
├── medialibrary/    # Media management
├── studio/          # Main editor UI
├── timeline/        # Timeline management
├── video/           # Video encode/decode
│   ├── mux/        # Video export/encoding
│   └── demux/      # Video import/decoding
└── [other packages] # Transcription, speech, search, etc.

tests/               # Mirror src/ structure
tasks/               # Task tracking files
```

### Key Files to Know
- `src/main.ts` - Application entry point
- `src/constants.ts` - Global constants
- `src/studio/studio.ts` - Main editor orchestration
- `src/timeline/timeline-service.ts` - Timeline management
- `src/common/event-emitter.ts` - Event system
- `README.md` - Project overview and setup
- `CLAUDE.md` - Additional Claude Code instructions

## Summary

This codebase follows clear principles:
- **Modular**: Self-contained packages with clear boundaries
- **Event-driven**: Loose coupling via events
- **Type-safe**: TypeScript with strict typing
- **Tested**: Jest tests for reliability
- **Browser-first**: No server dependencies

When working on tasks:
1. Understand the requirements
2. Explore the codebase
3. Plan your approach
4. Implement with tests
5. Verify and clean up

Always prioritize code quality, clarity, and maintainability over cleverness. Follow the established patterns, and when in doubt, ask questions.

Happy coding!
