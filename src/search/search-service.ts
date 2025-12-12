import { SearchView } from './search-view.js';
import type { SearchResult, WorkerResponseMessage } from './types.js';
import { getEventBus, SearchCompleteEvent } from '@/common/event-bus';
import { getFileStorage } from '@/medialibrary/file-storage';

export class SearchService {
  #worker: Worker;
  #searchView: SearchView;
  #eventBus = getEventBus();
  #fileStorage = getFileStorage();
  #selectedVideoId: string | null = null;

  constructor() {
    this.#worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    });
    this.#searchView = new SearchView();
    this.#addEventListener();
    this.#setupViewCallbacks();
    this.#loadVideoList();
  }

  #addEventListener(): void {
    this.#worker.addEventListener('message', ((event: MessageEvent<WorkerResponseMessage>) => {
      const message = event.data;
      switch (message.status) {
        case 'progress':
          console.log('Search progress:', message.progress);
          break;

        case 'complete':
          if (message.data && this.#isSearchResult(message.data)) {
            this.#onSearchComplete(message.data);
          }
          break;

        case 'error':
          const errorMessage = message.data && message.data instanceof Error
            ? message.data.message
            : 'Unknown search error occurred';
          console.error('Search error:', errorMessage);
          break;

        default:
          break;
      }
    }).bind(this));
  }

  #setupViewCallbacks(): void {
    this.#searchView.setVideoSelectedCallback((fileId: string) => {
      this.#selectedVideoId = fileId;
    });
    this.#searchView.setSearchCallback(async (query: string) => {
      await this.#searchInSelectedVideo(query);
    });
  }

  async #loadVideoList(): Promise<void> {
    await this.#fileStorage.init();
    const files = await this.#fileStorage.getAllFiles();
    this.#searchView.updateVideoList(files);
  }

  async #searchInSelectedVideo(query: string): Promise<void> {
    if (!this.#selectedVideoId) {
      console.warn('No video selected.');
      return;
    }
    const storedFile = await this.#fileStorage.getFile(this.#selectedVideoId);
    if (!storedFile) {
      console.error('File not found in storage:', this.#selectedVideoId);
      return;
    }
    const buffer = await storedFile.blob.arrayBuffer();
    this.#worker.postMessage(
      { task: 'search', query: query.trim(), videoData: buffer },
      [buffer]
    );
  }

  #isSearchResult(data: unknown): data is SearchResult {
    return (
      typeof data === 'object' &&
      data !== null &&
      'query' in data &&
      'matches' in data
    );
  }

  #onSearchComplete(result: SearchResult): void {
    this.#searchView.updateResults(result);
    this.#eventBus.emit(new SearchCompleteEvent(result));
  }

  async refreshVideoList(): Promise<void> {
    await this.#loadVideoList();
  }
}
