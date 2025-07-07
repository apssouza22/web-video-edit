// MP4Box ES Module Wrapper
// This wrapper works in both browser main thread and worker contexts

// First, load the UMD library
import './mp4box.all.min.js';

// Get the global scope (window in main thread, self in workers)
const globalScope = typeof window !== 'undefined' ? window : 
                   typeof self !== 'undefined' ? self : 
                   typeof globalThis !== 'undefined' ? globalThis : {};

// Export the MP4Box object from the appropriate global scope
const MP4Box = globalScope.MP4Box;

if (!MP4Box) {
  throw new Error('MP4Box failed to load. Make sure mp4box.js is loaded properly.');
}

export { MP4Box };