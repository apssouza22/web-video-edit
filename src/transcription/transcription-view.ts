import type { TranscriptionService } from './transcription.js';
import type { TranscriptionResult, TranscriptionChunk } from './types.js';

export class TranscriptionView {
  private transcriptionManager: TranscriptionService;
  private transcriptionElement: HTMLElement | null;
  private textChunksContainer: HTMLElement | null;

  /**
   * Constructor for TranscriptionView
   * @param manager - The transcription service instance
   */
  constructor(manager: TranscriptionService) {
    this.transcriptionManager = manager;
    this.transcriptionElement = document.getElementById('transcription');
    this.textChunksContainer = this.transcriptionElement?.querySelector('.text-chunks') || null;
    
    if (!this.transcriptionElement) {
      console.error('Transcription element not found');
      return;
    }
    
    if (!this.textChunksContainer) {
      console.error('Text chunks container not found');
      return;
    }
  }

  /**
   * Updates the transcription view with new transcription data
   * @param transcriptionData - The transcription data with text and chunks
   */
  updateTranscription(transcriptionData: TranscriptionResult): void {
    if (!transcriptionData || !transcriptionData.chunks) {
      console.error('Invalid transcription data provided');
      return;
    }

    this.#clearChunks();

    transcriptionData.chunks.forEach((chunk, index) => {
      this.#addTextChunk(chunk, index);
    });
    this.#showTabContent()
  }

  /**
   * Clears all existing text chunks from the view
   */
  #clearChunks(): void {
    if (this.textChunksContainer) {
      this.textChunksContainer.innerHTML = '';
    }
  }

  /**
   * Escapes HTML characters to prevent XSS attacks
   * @param text - The text to escape
   * @returns The escaped text
   */
  #escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Adds a single text chunk to the view
   * @param chunk - The chunk data with text and timestamp
   * @param index - The index of the chunk
   */
  #addTextChunk(chunk: TranscriptionChunk, index: number): void {
    if (!this.textChunksContainer) return;

    // Escape HTML characters in the text to prevent XSS
    const escapedText = this.#escapeHtml(chunk.text);
    
    // Create the HTML structure as a string
    const chunkHTML = `
      <span class="text-chunk" 
            data-index="${index}" 
            data-start-time="${chunk.timestamp[0]}" 
            data-end-time="${chunk.timestamp[1]}">
        <span class="chunk-text">${escapedText}</span>
        <span class="close" 
              style="font-size: 0.8em; cursor: pointer; margin-left: 5px; opacity: 0.7;">X</span>
      </span>
    `;

    this.textChunksContainer.insertAdjacentHTML('beforeend', chunkHTML);

    const chunkElement = this.textChunksContainer.lastElementChild as HTMLElement;
    const closeSpan = chunkElement?.querySelector('.close') as HTMLElement;

    if (!chunkElement || !closeSpan) {
      console.error('Failed to create chunk element or find close button');
      return;
    }

    closeSpan.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.#removeChunk(chunkElement, index);
    });

    chunkElement.addEventListener('click', () => {
      this.#onChunkClick(chunk, index);
    });
  }

  /**
   * Removes a text chunk from the view
   * @param chunkElement - The chunk element to remove
   * @param index - The index of the chunk
   */
  #removeChunk(chunkElement: HTMLElement, index: number): void {
    if (chunkElement && chunkElement.parentNode) {
      const startTime = parseFloat(chunkElement.getAttribute('data-start-time') || '0');
      const endTime = parseFloat(chunkElement.getAttribute('data-end-time') || '0');
      const removedDuration = endTime - startTime;
      
      console.log(`Removing chunk at index ${index}: start=${startTime}s, end=${endTime}s, duration=${removedDuration}s`);

      this.transcriptionManager.removeInterval(startTime, endTime);
      this.#updateSubsequentTimestamps(startTime, removedDuration);
      
      chunkElement.remove();
    }
  }

  /**
   * Updates timestamps of chunks that come after the removed interval
   * @param removedStartTime - Start time of the removed interval
   * @param removedDuration - Duration of the removed interval
   */
  #updateSubsequentTimestamps(removedStartTime: number, removedDuration: number): void {
    const allChunks = this.#getCurrentChunks();
    let updatedCount = 0;
    
    allChunks.forEach(chunk => {
      const chunkStartTime = parseFloat(chunk.getAttribute('data-start-time') || '0');
      const chunkEndTime = parseFloat(chunk.getAttribute('data-end-time') || '0');
      
      // Update timestamps for chunks that start after the removed interval
      if (chunkStartTime > removedStartTime) {
        const newStartTime = chunkStartTime - removedDuration;
        const newEndTime = chunkEndTime - removedDuration;
        
        chunk.setAttribute('data-start-time', newStartTime.toString());
        chunk.setAttribute('data-end-time', newEndTime.toString());
        updatedCount++;
      }
    });
    
    console.log(`Updated timestamps for ${updatedCount} subsequent chunks`);
  }

  /**
   * Handles chunk click events (can be overridden for seek functionality)
   * @param chunk - The chunk data
   * @param index - The chunk index
   */
  #onChunkClick(chunk: TranscriptionChunk, index: number): void {
    console.log(`Chunk clicked: "${chunk.text}" at time ${chunk.timestamp[0]}s`);
    
    if (chunk.timestamp && chunk.timestamp.length > 0) {
      const seekTime = chunk.timestamp[0];
      this.transcriptionManager.seekToTimestamp(seekTime);
    }
  }

  /**
   * Gets all current text chunks as an array
   * @returns Array of chunk elements
   */
  #getCurrentChunks(): HTMLElement[] {
    if (!this.textChunksContainer) return [];
    return Array.from(this.textChunksContainer.querySelectorAll('.text-chunk')) as HTMLElement[];
  }

  /**
   * Highlights chunks based on current time
   * @param currentTime - The current playback time in seconds
   */
  highlightChunksByTime(currentTime: number): void {
    this.#getCurrentChunks().forEach(chunk => {
      const startTime = parseFloat(chunk.getAttribute('data-start-time') || '0');
      const endTime = parseFloat(chunk.getAttribute('data-end-time') || '0');
      
      if (currentTime >= startTime && currentTime <= endTime) {
        chunk.classList.add('highlighted');
      } else {
        chunk.classList.remove('highlighted');
      }
    });
  }

  showLoading(): void {
    if (this.textChunksContainer) {
      this.textChunksContainer.innerHTML = 'Transcribing... Please wait.';
    }
  }

  #showTabContent(): void {
    const visionTab = document.querySelector('.tab-button[data-tab="transcription"]');
    if (visionTab) {
      (visionTab as HTMLElement).click();
    }
  }
}
