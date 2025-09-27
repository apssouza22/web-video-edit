# Frame Folder TypeScript Conversion

## Overview
Convert all JavaScript files in the src/frame folder to TypeScript while maintaining backward compatibility and existing functionality.

## Implementation Steps

### Phase 1: Type Definitions and Interfaces
- [x] Create type definitions for Frame data structures
- [x] Define interfaces for FrameService constructor parameters
- [x] Create types for frame transformation properties (x, y, scale, rotation, anchor)

### Phase 2: Core Frame Class Conversion
- [x] Convert `src/frame/frame.js` to `src/frame/frame.ts`
- [x] Add proper TypeScript types to Frame class properties
- [x] Convert JSDoc comments to TypeScript type annotations
- [x] Maintain backward compatibility with Float32Array methods

### Phase 3: FrameService Class Conversion  
- [x] Convert `src/frame/frames.js` to `src/frame/frames.ts`
- [x] Add proper typing for frames array and class properties
- [x] Type method parameters and return values
- [x] Handle fps import from constants.js

### Phase 4: FrameAdjustHandler Conversion
- [x] Convert `src/frame/frame-adjust.js` to `src/frame/frame-adjust.ts`
- [x] Add proper typing for FrameService dependency
- [x] Type ImageData handling in frame addition logic
- [x] Add proper error handling types

### Phase 5: Index File and Factory Function
- [x] Convert `src/frame/index.js` to `src/frame/index.ts`
- [x] Type the createFrameService factory function
- [x] Update exports to use proper TypeScript syntax

### Phase 6: Testing and Validation
- [x] Verify all TypeScript compilation works
- [x] Check that existing imports still work correctly
- [x] Run any existing tests to ensure functionality is preserved
- [x] Update import statements in dependent files if needed

### Phase 7: Cleanup
- [x] Remove old JavaScript files
- [x] Update any remaining references to .js extensions
- [x] Ensure linting passes
