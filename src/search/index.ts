import { SearchService } from './search-service.js';

export { SearchService } from './search-service.js';
export type { SearchResult, SearchMatch } from './types.js';

export function createSearchService(): SearchService {
  return new SearchService();
}

