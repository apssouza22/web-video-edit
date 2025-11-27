# ESM Mocking in MediaBunnyDemuxer Tests

## Overview

This test medialibrary properly implements ESM (ECMAScript Modules) mocking following Jest best practices for ES modules.

## Why ESM Mocking is Different

In ESM:
- Static `import` statements are evaluated **before** any code runs
- Traditional `jest.mock()` hoisting doesn't work the same way as in CommonJS
- You must use `jest.unstable_mockModule()` for module mocking
- Imports must be done **after** mock setup using **dynamic imports** (`await import()`)

## Implementation Structure

### 1. Create Mock Functions First

```typescript
const mockComputeDuration = jest.fn();
const mockGetPrimaryVideoTrack = jest.fn();
const mockCanDecode = jest.fn();
const mockSamples = jest.fn();
```

These are created at the top level so they can be:
- Accessed in mock factories
- Modified in individual tests
- Reset in `beforeEach`

### 2. Use `jest.unstable_mockModule()`

```typescript
jest.unstable_mockModule('mediabunny', () => ({
  Input: mockInput,
  BlobSource: mockBlobSource,
  ALL_FORMATS: [],
  VideoSampleSink: mockVideoSampleSink,
}));
```

**Important:** Use `jest.unstable_mockModule()` instead of `jest.mock()` for ESM.

### 3. Import Modules After Mocking

```typescript
// Dynamic imports AFTER mocking
const { MediaBunnyDemuxer } = await import('@/video/demux/mediabunny-demuxer');
const { Canvas2DRender } = await import('@/common/render-2d');
```

**Critical:** Must use `await import()` and place these **after** all `jest.unstable_mockModule()` calls.

### 4. Reset Mocks in `beforeEach`

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset to default implementations
  mockComputeDuration.mockResolvedValue(10);
  mockGetPrimaryVideoTrack.mockResolvedValue(createMockVideoTrack());
  mockCanDecode.mockResolvedValue(true);
  // ...
});
```

## Test Pattern for Overriding Mocks

When you need to test error conditions or specific scenarios:

```typescript
test('should throw error when no video track is found', async () => {
  const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

  // Override for this specific test
  mockGetPrimaryVideoTrack.mockResolvedValueOnce(null);

  await expect(demuxer.initialize(mockFile, mockRenderer)).rejects.toThrow('No video track found');
});
```

Use `mockResolvedValueOnce` or `mockRejectedValueOnce` to override for a single test.

## Common Pitfalls to Avoid

### ❌ Don't: Use static imports before mocking

```typescript
import { MediaBunnyDemuxer } from '@/video/demux/mediabunny-demuxer'; // BAD!
jest.unstable_mockModule('mediabunny', ...);
```

### ✅ Do: Use dynamic imports after mocking

```typescript
jest.unstable_mockModule('mediabunny', ...);
const { MediaBunnyDemuxer } = await import('@/video/demux/mediabunny-demuxer'); // GOOD!
```

### ❌ Don't: Use `jest.mock()` in ESM projects

```typescript
jest.mock('mediabunny', ...); // BAD - doesn't work reliably with ESM
```

### ✅ Do: Use `jest.unstable_mockModule()` in ESM projects

```typescript
jest.unstable_mockModule('mediabunny', ...); // GOOD!
```

### ❌ Don't: Try to dynamically import and override in tests

```typescript
test('should fail', async () => {
  const { Input } = await import('mediabunny'); // BAD - bypasses mock
  (Input as jest.Mock).mockImplementationOnce(...);
});
```

### ✅ Do: Use the mock functions directly

```typescript
test('should work', async () => {
  mockGetPrimaryVideoTrack.mockResolvedValueOnce(null); // GOOD!
});
```

## Benefits of This Approach

1. **Works with ESM:** Follows Jest's ESM mocking guidelines
2. **Flexible:** Mock functions can be overridden per test
3. **Maintainable:** Clear separation between mock setup and tests
4. **Reliable:** No race conditions from import timing
5. **Type-safe:** TypeScript can still infer types correctly

## References

- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
- [Jest unstable_mockModule API](https://jestjs.io/docs/jest-object#jestunstable_mockmodu lemodulename-factory-options)
- [ESM vs CommonJS Mocking Differences](https://jestjs.io/docs/ecmascript-modules#differences-between-esm-and-commonjs)

## Troubleshooting

### Error: "Input has an unsupported or unrecognizable format"

This means the actual `mediabunny` library is being called instead of the mock. Check:
1. Are you using `jest.unstable_mockModule()`?
2. Are imports done with `await import()` **after** mocking?
3. Are mock functions returning proper resolved values?

### Error: "Cannot find module"

Make sure:
1. Module paths in `jest.unstable_mockModule()` match exactly
2. The `@/` alias is configured in `jest.config.js` (moduleNameMapper)
3. All mocked modules are imported **after** mocking

### Tests are flaky or inconsistent

Check:
1. `jest.clearAllMocks()` is called in `beforeEach`
2. Mock functions are reset to default implementations in `beforeEach`
3. Using `mockResolvedValueOnce` instead of `mockResolvedValue` for test-specific overrides

