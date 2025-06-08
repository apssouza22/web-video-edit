import {TranscriptionManager} from './transcription.js';

export class TranscriptionView {

  /**
   * Constructor for TranscriptionView
   * @param {TranscriptionManager} manager
   */
  constructor(manager) {
    this.transctriptionManager = manager;
    this.transcriptionElement = document.getElementById('transcription');
    this.textChunksContainer = this.transcriptionElement.querySelector('.text-chunks');
    
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
   * @param {Object} transcriptionData - The transcription data with text and chunks
   */
  updateTranscription(transcriptionData) {
    if (!transcriptionData || !transcriptionData.chunks) {
      console.error('Invalid transcription data provided');
      return;
    }

    this.#clearChunks();

    transcriptionData.chunks.forEach((chunk, index) => {
      this.#addTextChunk(chunk, index);
    });
  }

  /**
   * Clears all existing text chunks from the view
   */
  #clearChunks() {
    if (this.textChunksContainer) {
      this.textChunksContainer.innerHTML = '';
    }
  }

  /**
   * Adds a single text chunk to the view
   * @param {Object} chunk - The chunk data with text and timestamp
   * @param {number} index - The index of the chunk
   */
  #addTextChunk(chunk, index) {
    // Create the main chunk span
    const chunkElement = document.createElement('span');
    chunkElement.className = 'text-chunk';
    chunkElement.setAttribute('data-index', index);
    chunkElement.setAttribute('data-start-time', chunk.timestamp[0]);
    chunkElement.setAttribute('data-end-time', chunk.timestamp[1]);

    // Create the text span
    const textSpan = document.createElement('span');
    textSpan.textContent = chunk.text;
    textSpan.className = 'chunk-text';

    // Create the close button
    const closeSpan = document.createElement('span');
    closeSpan.className = 'close';
    closeSpan.textContent = 'X';
    closeSpan.style.fontSize = '0.8em';
    closeSpan.style.cursor = 'pointer';
    closeSpan.style.marginLeft = '5px';
    closeSpan.style.opacity = '0.7';

    closeSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#removeChunk(chunkElement, index);
    });

    chunkElement.addEventListener('click', () => {
      this.#onChunkClick(chunk, index);
    });

    chunkElement.appendChild(textSpan);
    chunkElement.appendChild(closeSpan);

    this.textChunksContainer.appendChild(chunkElement);
  }

  /**
   * Removes a text chunk from the view
   * @param {HTMLElement} chunkElement - The chunk element to remove
   * @param {number} index - The index of the chunk
   */
  #removeChunk(chunkElement, index) {
    if (chunkElement && chunkElement.parentNode) {
      const startTime = parseFloat(chunkElement.getAttribute('data-start-time'));
      const endTime = parseFloat(chunkElement.getAttribute('data-end-time'));
      const removedDuration = endTime - startTime;
      
      console.log(`Removing chunk at index ${index}: start=${startTime}s, end=${endTime}s, duration=${removedDuration}s`);

      this.transctriptionManager.removeInterval(startTime, endTime);
      this.#updateSubsequentTimestamps(startTime, removedDuration);
      
      chunkElement.remove();
    }
  }


  /**
   * Updates timestamps of chunks that come after the removed interval
   * @param {number} removedStartTime - Start time of the removed interval
   * @param {number} removedDuration - Duration of the removed interval
   */
  #updateSubsequentTimestamps(removedStartTime, removedDuration) {
    const allChunks = this.#getCurrentChunks();
    let updatedCount = 0;
    
    allChunks.forEach(chunk => {
      const chunkStartTime = parseFloat(chunk.getAttribute('data-start-time'));
      const chunkEndTime = parseFloat(chunk.getAttribute('data-end-time'));
      
      // Update timestamps for chunks that start after the removed interval
      if (chunkStartTime > removedStartTime) {
        const newStartTime = chunkStartTime - removedDuration;
        const newEndTime = chunkEndTime - removedDuration;
        
        chunk.setAttribute('data-start-time', newStartTime);
        chunk.setAttribute('data-end-time', newEndTime);
        updatedCount++;
      }
    });
    
    console.log(`Updated timestamps for ${updatedCount} subsequent chunks`);
  }

  /**
   * Handles chunk click events (can be overridden for seek functionality)
   * @param {Object} chunk - The chunk data
   * @param {number} index - The chunk index
   */
  #onChunkClick(chunk, index) {
    console.log(`Chunk clicked: "${chunk.text}" at time ${chunk.timestamp[0]}s`);
    // This can be extended to seek to the timestamp in a video player
  }

  /**
   * Gets all current text chunks as an array
   * @returns {Array} Array of chunk elements
   */
  #getCurrentChunks() {
    return Array.from(this.textChunksContainer.querySelectorAll('.text-chunk'));
  }

  /**
   * Highlights chunks based on current time
   * @param {number} currentTime - The current playback time in seconds
   */
  highlightChunksByTime(currentTime) {
    this.#getCurrentChunks().forEach(chunk => {
      const startTime = parseFloat(chunk.getAttribute('data-start-time'));
      const endTime = parseFloat(chunk.getAttribute('data-end-time'));
      
      if (currentTime >= startTime && currentTime <= endTime) {
        chunk.classList.add('highlighted');
      } else {
        chunk.classList.remove('highlighted');
      }
    });
  }
} 