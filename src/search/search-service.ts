import {SearchView} from './search-view.js';
import type {SearchResult, WorkerResponseMessage} from './types.js';
import {getEventBus, SearchCompleteEvent} from '@/common/event-bus';
import {getFileStorage} from '@/medialibrary/file-storage';

export class SearchService {
  #worker: Worker;
  #searchView: SearchView;
  #eventBus = getEventBus();
  #fileStorage = getFileStorage();
  #selectedVideoId: string | null = null;
  #modelsLoaded: boolean = false;
  #modelsLoading: boolean = false;

  constructor(searchView: SearchView) {
    this.#worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    });
    this.#searchView = searchView;
  }

  async init(): Promise<void> {
    this.#addEventListener();
    this.#setupViewCallbacks();
    this.#loadVideoList();
    await this.#loadModels();
  }

  #addEventListener(): void {
    this.#worker.addEventListener('message', ((event: MessageEvent<WorkerResponseMessage>) => {
      const message = event.data;
      switch (message.status) {
        case 'progress':
          this.#searchView.updateProgress(
            message.progress ?? 0,
            message.message ?? 'Processing...'
          );
          break;

        case 'ready':
          if (message.task === 'load-model') {
            this.#modelsLoaded = true;
            this.#modelsLoading = false;
            console.log('Search models loaded successfully');
          }
          break;

        case 'complete':
          this.#searchView.hideProgress();
          if (message.data && this.#isSearchResult(message.data)) {
            this.#onSearchComplete(message.data);
          }
          break;

        case 'error':
          this.#searchView.hideProgress();
          const errorMessage = message.message || 
            (
                message.data && message.data instanceof Error ?
                message.data.message :
                'Unknown search error occurred'
            );
          console.error('Search error:', errorMessage);
          this.#modelsLoading = false;
          break;

        default:
          break;
      }
    }).bind(this));
  }

  async #loadModels(): Promise<void> {
    if (this.#modelsLoaded || this.#modelsLoading) {
      return;
    }
    this.#modelsLoading = true;
    this.#worker.postMessage({ task: 'load-model' });
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
      { task: 'search', query: query.trim(), videoId: this.#selectedVideoId, videoData: buffer },
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

}
