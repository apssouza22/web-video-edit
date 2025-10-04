# Audio Folder TypeScript Conversion Task

## Overview
Convert all JavaScript files in the `src/audio/` folder to TypeScript with proper type annotations and maintain existing functionality.

## Implementation Steps

- [x] Analyze dependencies and types from constants.js and layer modules
- [x] Convert audio-cutter.js to audio-cutter.ts with proper types
- [x] Convert audio-loader.js to audio-loader.ts with Promise types
- [x] Convert pitch-preservation-processor.js to pitch-preservation-processor.ts
- [x] Convert audio-source.js to audio-source.ts with Web Audio API types
- [x] Convert layer-audio.js to audio.ts extending typed StandardLayer
- [x] Update all import statements to use .ts extensions
- [x] Verify TypeScript compilation and fix any type errors

## Files to Convert
1. `src/audio/audio-cutter.js` → `src/audio/audio-cutter.ts`
2. `src/audio/audio-loader.js` → `src/audio/audio-loader.ts`
3. `src/audio/pitch-preservation-processor.js` → `src/audio/pitch-preservation-processor.ts`
4. `src/audio/audio-source.js` → `src/audio/audio-source.ts`
5. `src/audio/layer-audio.js` → `src/audio/audio.ts`

## Type Considerations
- Web Audio API types (AudioBuffer, AudioContext, AudioBufferSourceNode)
- StandardLayer inheritance and interface compliance
- Promise types for async operations
- Map and cache typing for processed buffers
- File and FileReader types
