// Mock for webm-duration-fix CDN import
// This is used in tests to avoid importing from CDN

/**
 * Mock function that simulates fixing WebM duration
 * In tests, it just returns the blob unchanged
 */
const fixWebmDuration = async (blob, options = {}) => {
  // In tests, just return the blob unchanged
  return blob;
};

// Export as default (the module uses default export)
export default fixWebmDuration;

// Also support the .default pattern used in utils.ts
fixWebmDuration.default = fixWebmDuration;

