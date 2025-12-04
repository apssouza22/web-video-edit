# Test Mocks

This directory contains mock implementations for external dependencies that cannot be loaded in the test environment.

## Overview

The project uses CDN imports for browser-first libraries. These work great in browsers but fail in Node.js/Jest environments. Mocks allow tests to run without these dependencies.

## huggingface-transformers.js

Mock for the HuggingFace Transformers library used in the transcription module.

### Why is this needed?

The `src/transcription/model-factory.ts` medialibrary imports from:
```javascript
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";
```

This CDN URL import works in browsers but fails in Node.js/Jest test environments.

### Solution

1. Created mock: `tests/__mocks__/huggingface-transformers.js`
2. Mapped CDN URLs in `jest.config.js`:
   ```javascript
   '^https://cdn\\.jsdelivr\\.net/npm/@huggingface/transformers$': 
     '<rootDir>/tests/__mocks__/huggingface-transformers.js',
   ```

### Mock Implementation

The mock provides:
- `env` object with `allowLocalModels` property
- `pipeline` function that returns an async function
- Returns mock transcription results for testing

## webm-duration-fix.js

Mock for the webm-duration-fix library used for fixing WebM video blob durations.

### Why is this needed?

The `src/common/utils.ts` medialibrary imports from:
```javascript
import webmDurationFix from 'https://cdn.jsdelivr.net/npm/webm-duration-fix@1.0.4/+esm';
```

This CDN URL import works in browsers but fails in Node.js/Jest test environments.

### Solution

1. Created mock: `tests/__mocks__/webm-duration-fix.js`
2. Mapped CDN URL in `jest.config.js`:
   ```javascript
   '^https://cdn\\.jsdelivr\\.net/npm/webm-duration-fix@1\\.0\\.4/\\+esm$': 
     '<rootDir>/tests/__mocks__/webm-duration-fix.js',
   ```

### Mock Implementation

The mock provides:
- Default export function that takes `(blob, options)` parameters
- Returns the blob unchanged (no actual duration fixing in tests)
- Supports both default export patterns used in the codebase

## Adding New CDN Mocks

If you encounter other CDN import errors in tests:

1. Create a mock medialibrary in `tests/__mocks__/` with appropriate exports
2. Add a `moduleNameMapper` entry in `jest.config.js`
3. Escape special regex characters in the URL (`.`, `@`, `+`, etc.)
4. Document the mock here

Example pattern:
```javascript
// jest.config.js
'^https://cdn\\.jsdelivr\\.net/npm/package-name@version/\\+esm$': 
  '<rootDir>/tests/__mocks__/package-name.js',
```

