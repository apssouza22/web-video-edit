# Testing Setup for video-demux

## Overview

This directory contains the automated test suite for the video-demux project, with comprehensive coverage for the `src/common` directory.

## Test Structure

```
tests/
├── setup.js              # Global test setup and mocks
├── common/               # Tests for src/common
│   ├── browser-support.test.ts
│   ├── event-bus.test.ts
│   ├── render-2d.test.ts
│   ├── studio-state.test.ts
│   └── utils.test.ts
└── README.md            # This file
```

## Running Tests

### Prerequisites

Make sure all dependencies are properly installed, including `ts-jest` which is required to run TypeScript tests.

**First time setup or if you encounter errors:**

```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install
```

The project requires the following packages to run tests:
- `jest` - Test runner
- `jest-environment-jsdom` - Browser-like environment for tests
- `ts-jest` - TypeScript transformer for Jest
- `@types/jest` - TypeScript type definitions for Jest

### Test Commands

```bash
# Run all tests
npm test

# Run tests for a specific directory
npm test -- tests/common/

# Run a specific test file
npm test -- tests/common/browser-support.test.ts
npm test -- tests/common/event-bus.test.ts
npm test -- tests/common/studio-state.test.ts
npm test -- tests/common/render-2d.test.ts
npm test -- tests/common/utils.test.ts

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests in watch mode for specific directory
npm run test:watch -- tests/common/
```

## Test Coverage

The test suite provides comprehensive coverage for:

### browser-support.test.ts
- Browser detection (Chrome, Firefox, Safari, Edge, Unknown)
- Feature detection (getDisplayMedia, MediaRecorder)
- Codec support checking
- Browser-specific warnings and optimizations
- Error conditions

### event-bus.test.ts
- EventBus subscribe, emit, and unsubscribe methods
- Once listeners
- Event handler error handling
- Global instance management (getEventBus, resetEventBus)
- Listener counting and checking
- Clear functionality

### studio-state.test.ts
- Singleton pattern
- Media management (addMedia, getMedias, getMediaById)
- Media filtering (getMediaVideo, getMediaAudio)
- Playback state tracking
- Selected media management

### render-2d.test.ts
- Canvas2DRender instantiation
- Canvas size getters and setters
- Drawing methods (clearRect, drawImage, putImageData, getImageData)
- Text methods (measureText, fillText)
- Transformation methods (save, restore, translate, rotate, scale)
- Style properties (font, fillStyle, shadowColor, etc.)
- Static drawScaled method
- Edge cases and integration tests

### utils.test.ts
- fixWebmDuration function
- Blob handling for various types

## Troubleshooting

### Issue: "SyntaxError: Unexpected token ':'" or TypeScript syntax errors

**Cause:** Jest cannot transform TypeScript files. The `ts-jest` package is missing or not configured.

**Solution:**
```bash
# Reinstall all dependencies (this will install ts-jest)
rm -rf node_modules package-lock.json
npm install
```

Make sure `jest.config.js` has the transform configured (already done):
```javascript
transform: {
  '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
}
```

### Issue: "Cannot find module '@jest/test-sequencer'"

**Solution:**
```bash
# Option 1: Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install

# Option 2: Specifically reinstall Jest and related packages
npm install --save-dev jest jest-environment-jsdom ts-jest @types/jest
```

### Issue: "jest is not defined" or "ReferenceError: jest is not defined"

**Cause:** With ES modules, Jest globals aren't automatically available. You need to explicitly import them.

**Solution:** Add this import at the top of your test file:
```typescript
import { jest } from '@jest/globals';
```

This is required for any test file that uses:
- `jest.fn()` - Mock functions
- `jest.mock()` - Module mocking
- `jest.spyOn()` - Spying on methods
- Other Jest utilities

**Note:** The `tests/setup.js` file doesn't use `jest.fn()` anymore to avoid this issue during setup.

### Issue: Tests fail with import errors

**Solution:**
The project uses ES modules with TypeScript. Make sure:
1. `jest.config.js` has `extensionsToTreatAsEsm: ['.ts']`
2. Tests are run with the command from `package.json`: `node --experimental-vm-modules node_modules/jest/bin/jest.js`

### Issue: Module resolution errors (@/...)

The `@/` alias maps to `src/` directory. This is configured in `jest.config.js`:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

If tests can't resolve `@/` imports, verify this configuration exists in your `jest.config.js`.

## Writing New Tests

### Test File Template

```typescript
import { jest } from '@jest/globals';  // Required for ES modules
import { FunctionToTest } from '@/path/to/module';

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Feature Group', () => {
    test('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = FunctionToTest(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Best Practices

1. **Descriptive test names**: Use "should" statements that describe the expected behavior
2. **Arrange-Act-Assert**: Structure tests clearly
3. **One assertion per test**: Keep tests focused
4. **Mock external dependencies**: Use mocks for external APIs, timers, etc.
5. **Clean up**: Always clean up after tests (reset mocks, timers, etc.)

## Continuous Integration

When setting up CI/CD, ensure:

1. Node.js version matches development (check `.nvmrc`)
2. Dependencies are installed: `npm ci`
3. Tests run in CI mode: `npm test -- --ci --maxWorkers=2`

Example GitHub Actions workflow:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version-file: '.nvmrc'
      - run: npm ci
      - run: npm test -- --ci --maxWorkers=2
```

## Next Steps

- Add tests for other directories (`src/media`, `src/timeline`, etc.)
- Set up continuous integration
- Add pre-commit hooks to run tests
- Consider adding E2E tests with Playwright or Cypress

## Support

For issues or questions about the test suite, refer to:
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- Project documentation in `/tasks/common-tests.md`

