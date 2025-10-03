# Replace MediaBunny URL Import with NPM Dependency

## Task Description
Replace the existing URL import of mediabunny@1.0.2 from CDN with a proper npm dependency in package.json.

## Implementation Steps

- [x] Add mediabunny@1.0.2 to package.json dependencies
- [x] Replace URL import with npm import in src/muxer/web-codec-exporter.ts  
- [ ] Verify that the updated import works correctly

## Details

**Current State:**
- URL import: `from "https://cdn.jsdelivr.net/npm/mediabunny@1.0.2/+esm"`
- Located in: `src/muxer/web-codec-exporter.ts` line 14
- No mediabunny dependency in package.json

**Target State:**
- Add `"mediabunny": "^1.0.2"` to package.json dependencies
- Update import to: `from "mediabunny"`
- Maintain same imported symbols and functionality
