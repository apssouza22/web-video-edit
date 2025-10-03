# Replace MP4Box CDN Links with NPM Dependency

This task involves replacing direct CDN links to mp4box@0.5.2 with proper npm dependency management.

## Implementation Steps

- [x] Add mp4box@0.5.2 to package.json dependencies
- [x] Install the npm package using npm install
- [x] Update mp4box-wrapper.ts to import from npm package instead of local file
- [x] Remove CDN script tag from index.html
- [x] Update demuxer-mp4.js worker to use proper module import instead of importScripts
- [x] Test the changes to ensure MP4Box functionality works correctly
- [x] Update TypeScript configurations if needed for proper type handling
- [x] Verify all mp4box usage points are working correctly

## Files to Modify

- `package.json` - Add mp4box dependency
- `src/common/mp4box-wrapper.ts` - Update import statement
- `index.html` - Remove CDN script tag
- `src/demux/demuxer-mp4.js` - Update worker import
- Potentially update Vite config for worker handling

## Expected Benefits

- Better dependency management and version control
- Offline development capability  
- More predictable builds
- Better integration with bundlers like Vite
- Elimination of external CDN dependencies
