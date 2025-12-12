import type { SearchResult, SearchMatch } from './types.js';
import type { StoredFileMetadata } from '@/medialibrary/file-storage';

export type VideoSelectedCallback = (fileId: string) => void;
export type SearchQueryCallback = (query: string) => void;

export class SearchView {
  #searchElement: HTMLElement | null = null;
  #resultContainer: HTMLElement | null = null;
  #videoSelector: HTMLSelectElement | null = null;
  #searchInput: HTMLInputElement | null = null;
  #searchButton: HTMLButtonElement | null = null;
  #onVideoSelected: VideoSelectedCallback | null = null;
  #onSearch: SearchQueryCallback | null = null;

  constructor() {
    this.#searchElement = document.getElementById('search');
    if (this.#searchElement) {
      this.#buildUI();
    }
  }

  #buildUI(): void {
    if (!this.#searchElement) return;
    this.#searchElement.innerHTML = '';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'tab-section-title';
    titleDiv.textContent = 'Search in Video';
    this.#searchElement.appendChild(titleDiv);
    const controlsContainer = this.#createControlsContainer();
    this.#searchElement.appendChild(controlsContainer);
    const resultsTitleDiv = document.createElement('div');
    resultsTitleDiv.className = 'tab-section-title';
    resultsTitleDiv.textContent = 'Results';
    resultsTitleDiv.style.marginTop = '20px';
    this.#searchElement.appendChild(resultsTitleDiv);
    this.#resultContainer = document.createElement('div');
    this.#resultContainer.className = 'search-results';
    this.#searchElement.appendChild(this.#resultContainer);
  }

  #createControlsContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'search-controls';
    container.style.cssText = 'padding: 10px; display: flex; flex-direction: column; gap: 12px;';
    const selectorLabel = document.createElement('label');
    selectorLabel.textContent = 'Select Video';
    selectorLabel.style.cssText = 'font-size: 12px; color: #888; margin-bottom: 4px;';
    this.#videoSelector = document.createElement('select');
    this.#videoSelector.className = 'search-video-selector';
    this.#videoSelector.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s;
    `;
    this.#videoSelector.innerHTML = '<option value="">-- Select a video --</option>';
    this.#videoSelector.addEventListener('change', () => {
      const selectedId = this.#videoSelector?.value;
      if (selectedId && this.#onVideoSelected) {
        this.#onVideoSelected(selectedId);
      }
    });
    const selectorGroup = document.createElement('div');
    selectorGroup.appendChild(selectorLabel);
    selectorGroup.appendChild(this.#videoSelector);
    container.appendChild(selectorGroup);
    const inputLabel = document.createElement('label');
    inputLabel.textContent = 'Search Query';
    inputLabel.style.cssText = 'font-size: 12px; color: #888; margin-bottom: 4px;';
    this.#searchInput = document.createElement('input');
    this.#searchInput.type = 'text';
    this.#searchInput.placeholder = 'Enter text to search...';
    this.#searchInput.className = 'search-input';
    this.#searchInput.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    `;
    this.#searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.#handleSearch();
      }
    });
    const inputGroup = document.createElement('div');
    inputGroup.appendChild(inputLabel);
    inputGroup.appendChild(this.#searchInput);
    container.appendChild(inputGroup);
    this.#searchButton = document.createElement('button');
    this.#searchButton.textContent = 'Search';
    this.#searchButton.className = 'action-button primary';
    this.#searchButton.style.cssText = `
      padding: 12px 20px;
      background: linear-gradient(135deg, #4a9eff, #2d7dd2);
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    `;
    this.#searchButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      Search
    `;
    this.#searchButton.addEventListener('click', () => this.#handleSearch());
    container.appendChild(this.#searchButton);
    return container;
  }

  #handleSearch(): void {
    const query = this.#searchInput?.value.trim();
    if (!query) {
      this.#showMessage('Please enter a search query');
      return;
    }
    if (!this.#videoSelector?.value) {
      this.#showMessage('Please select a video first');
      return;
    }
    if (this.#onSearch) {
      this.#onSearch(query);
    }
  }

  #showMessage(message: string): void {
    if (!this.#resultContainer) return;
    this.#resultContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #888;">
        ${message}
      </div>
    `;
  }

  setVideoSelectedCallback(callback: VideoSelectedCallback): void {
    this.#onVideoSelected = callback;
  }

  setSearchCallback(callback: SearchQueryCallback): void {
    this.#onSearch = callback;
  }

  updateVideoList(videos: StoredFileMetadata[]): void {
    if (!this.#videoSelector) return;
    const currentValue = this.#videoSelector.value;
    this.#videoSelector.innerHTML = '<option value="">-- Select a video --</option>';
    const videoFiles = videos.filter(v => v.type.startsWith('video/'));
    for (const video of videoFiles) {
      const option = document.createElement('option');
      option.value = video.id;
      option.textContent = video.name;
      this.#videoSelector.appendChild(option);
    }
    if (currentValue && videoFiles.some(v => v.id === currentValue)) {
      this.#videoSelector.value = currentValue;
    }
  }

  updateResults(result: SearchResult): void {
    if (!result) {
      console.error('Invalid search result provided');
      return;
    }
    this.#showTabContent();
    this.#displayResults(result);
  }

  #displayResults(result: SearchResult): void {
    if (!this.#resultContainer) return;
    this.#resultContainer.innerHTML = '';
    const headerDiv = this.#createHeader(result);
    this.#resultContainer.appendChild(headerDiv);
    if (result.matches.length === 0) {
      const noResultsDiv = this.#createNoResultsMessage(result.query);
      this.#resultContainer.appendChild(noResultsDiv);
      return;
    }
    result.matches.forEach((match, index) => {
      const matchElement = this.#createMatchElement(match, index);
      this.#resultContainer?.appendChild(matchElement);
    });
  }

  #createHeader(result: SearchResult): HTMLDivElement {
    const headerDiv = document.createElement('div');
    headerDiv.className = 'search-header';
    headerDiv.style.cssText = 'padding: 10px; margin-bottom: 15px; border-bottom: 2px solid #444;';
    headerDiv.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; color: #fff; margin-bottom: 5px;">
        Search: "${result.query}"
      </div>
      <div style="font-size: 12px; color: #888;">
        Found ${result.totalMatches} match${result.totalMatches !== 1 ? 'es' : ''} 
        in ${result.searchDurationMs.toFixed(0)}ms
      </div>
    `;
    return headerDiv;
  }

  #createNoResultsMessage(query: string): HTMLDivElement {
    const noResultsDiv = document.createElement('div');
    noResultsDiv.className = 'search-no-results';
    noResultsDiv.style.cssText = 'padding: 20px; text-align: center; color: #888;';
    noResultsDiv.textContent = `No matches found for "${query}"`;
    return noResultsDiv;
  }

  #createMatchElement(match: SearchMatch, index: number): HTMLDivElement {
    const matchDiv = document.createElement('div');
    matchDiv.className = 'search-match-item';
    matchDiv.style.cssText = `
      padding: 12px;
      margin-bottom: 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    matchDiv.dataset.timestamp = String(match.timestamp);
    const timestampFormatted = this.#formatTimestamp(match.timestamp);
    const confidencePercent = Math.round(match.confidence * 100);
    matchDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 14px; font-weight: 600; color: #4a9eff;">
          #${index + 1} at ${timestampFormatted}
        </span>
        <span style="font-size: 11px; padding: 2px 8px; background: ${this.#getConfidenceColor(match.confidence)}; border-radius: 10px; color: #fff;">
          ${confidencePercent}% confidence
        </span>
      </div>
      <div style="font-size: 13px; color: #ccc; line-height: 1.4;">
        ${match.context}
      </div>
    `;
    matchDiv.addEventListener('mouseenter', () => {
      matchDiv.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    matchDiv.addEventListener('mouseleave', () => {
      matchDiv.style.background = 'rgba(255, 255, 255, 0.05)';
    });
    return matchDiv;
  }

  #formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  #getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return '#22c55e';
    if (confidence >= 0.7) return '#eab308';
    return '#ef4444';
  }

  #showTabContent(): void {
    const searchTab = document.querySelector('.tab-button[data-tab="search"]');
    if (searchTab) {
      (searchTab as HTMLElement).click();
    }
  }
}
