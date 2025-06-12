import {TranscriptionManager} from './transcription.js';

export class TranscriptionView {

  /**
   * Constructor for TranscriptionView
   * @param {TranscriptionManager} manager
   */
  constructor(manager) {
    this.transcriptionManager = manager;
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
   * Escapes HTML characters to prevent XSS attacks
   * @param {string} text - The text to escape
   * @returns {string} The escaped text
   */
  #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Adds a single text chunk to the view
   * @param {Object} chunk - The chunk data with text and timestamp
   * @param {number} index - The index of the chunk
   */
  #addTextChunk(chunk, index) {
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

    // Add the HTML to the container
    this.textChunksContainer.insertAdjacentHTML('beforeend', chunkHTML);

    // Get the newly added chunk element to attach event listeners
    const chunkElement = this.textChunksContainer.lastElementChild;
    const closeSpan = chunkElement.querySelector('.close');

    // Attach event listeners after the HTML is inserted
    closeSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#removeChunk(chunkElement, index);
    });

    chunkElement.addEventListener('click', () => {
      this.#onChunkClick(chunk, index);
    });
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

      this.transcriptionManager.removeInterval(startTime, endTime);
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
    
    if (chunk.timestamp && chunk.timestamp.length > 0) {
      const seekTime = chunk.timestamp[0];
      this.transcriptionManager.seekToTimestamp(seekTime);
    }
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