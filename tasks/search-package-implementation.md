# Search Package Implementation

Implement a new `search` package that receives text and searches in a given video, running in a Web Worker.

## Implementation Steps

- [x] Create `src/search/types.ts` - Define types for worker messages, search results, and responses
- [x] Create `src/search/worker.ts` - Web Worker that receives video blob and mocks search functionality
- [x] Create `src/search/search-service.ts` - Main thread service to manage worker and provide search API
- [x] Create `src/search/search-view.ts` - UI component for displaying search results
- [x] Create `src/search/index.ts` - Package exports with factory function
- [x] Add `SearchCompleteEvent` to the event-bus

