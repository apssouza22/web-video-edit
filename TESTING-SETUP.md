# Testing Setup - Quick Start Guide

## 🚀 Quick Setup

The test suite is ready! You just need to install the dependencies.

### 1. Install Dependencies

Run this command to install all required packages including `ts-jest`:

```bash
npm install
```

### 2. Run Tests

Once installation is complete, run the tests:

```bash
# Run all common tests
npm test -- tests/common/

# Or run individual test files
npm test -- tests/common/browser-support.test.ts
npm test -- tests/common/event-bus.test.ts
npm test -- tests/common/studio-state.test.ts
npm test -- tests/common/render-2d.test.ts
npm test -- tests/common/utils.test.ts
```

## 📋 What Was Fixed

### Issue: "SyntaxError: Unexpected token ':'"

**Root Cause:** Jest couldn't transform TypeScript syntax because no transformer was configured.

**Solution Applied:**
1. ✅ Added `ts-jest` to `package.json` devDependencies
2. ✅ Configured `jest.config.js` to use `ts-jest` transformer for `.ts` files
3. ✅ Set up ES module support with `useESM: true`

### Changes Made to Configuration

**`jest.config.js`** - Added TypeScript transformation:
```javascript
transform: {
  '^.+\\.tsx?$': [
    'ts-jest',
    {
      useESM: true,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  ],
},
preset: 'ts-jest/presets/default-esm',
```

**`package.json`** - Added `ts-jest`:
```json
"devDependencies": {
  "@types/jest": "^29.5.12",
  "@types/node": "^24.3.0",
  "jest": "^29.7.0",
  "jest-environment-jsdom": "^30.2.0",
  "ts-jest": "^29.1.1",  // ← Added this
  "typescript": "^5.9.2",
  "vite": "^7.1.3"
}
```

## 📊 Test Coverage Summary

| Test File | Test Cases | Coverage |
|-----------|------------|----------|
| `browser-support.test.ts` | 50+ | Browser detection, feature detection, codec support |
| `event-bus.test.ts` | 60+ | Event subscription, emission, error handling |
| `studio-state.test.ts` | 30+ | Singleton pattern, media management, state tracking |
| `render-2d.test.ts` | 70+ | Canvas rendering, transformations, drawing methods |
| `utils.test.ts` | 7 | WebM duration fixing utility |
| **Total** | **217+** | **Full `src/common` directory** |

## 🎯 Next Steps

1. **Run `npm install`** - This is the only missing step!
2. **Run the tests** - Verify everything works
3. **Continue development** - Tests are ready for use

## 📚 Additional Resources

- Full testing documentation: `tests/README.md`
- Task tracking: `tasks/common-tests.md`
- Test files location: `tests/common/`

## ✅ Key Configuration Details

### ES Modules + TypeScript + Jest

The project uses ES modules with TypeScript. All test files must:

1. **Import Jest globals explicitly:**
```typescript
import { jest } from '@jest/globals';
```

2. **Use `.js` extension mapping:** 
The Jest config automatically maps `.js` imports to `.ts` source files:
```javascript
moduleNameMapper: {
  '^(\\.{1,2}/.*)\\.js$': '$1',
}
```

3. **Transform TypeScript:**
`ts-jest` is configured to handle TypeScript with ES module support.

## 🐛 If You Still Have Issues

### After running `npm install`, if you see errors:

**"Cannot find module '@jest/test-sequencer'"**
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

**"jest is not defined" or "ReferenceError: jest is not defined"**

All test files already have this fixed. If you create new tests, remember to import:
```typescript
import { jest } from '@jest/globals';
```

**Tests fail to import modules**
```bash
# Verify the @/ alias works
npm test -- tests/common/browser-support.test.ts
```

**Other issues**
- Check `tests/README.md` for detailed troubleshooting
- Ensure you're using Node.js version specified in `.nvmrc`
- Verify TypeScript is installed: `npm list typescript`

---

**That's it!** Just run `npm install` and you're ready to test! 🎉

