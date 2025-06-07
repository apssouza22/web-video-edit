export class TranscriptionView {
  constructor() {
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

    // Clear existing chunks
    this.clearChunks();

    // Add new chunks
    transcriptionData.chunks.forEach((chunk, index) => {
      this.addTextChunk(chunk, index);
    });
  }

  /**
   * Clears all existing text chunks from the view
   */
  clearChunks() {
    if (this.textChunksContainer) {
      this.textChunksContainer.innerHTML = '';
    }
  }

  /**
   * Adds a single text chunk to the view
   * @param {Object} chunk - The chunk data with text and timestamp
   * @param {number} index - The index of the chunk
   */
  addTextChunk(chunk, index) {
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

    // Add click handler for the close button
    closeSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeChunk(chunkElement, index);
    });

    // Add click handler for the chunk (for potential seek functionality)
    chunkElement.addEventListener('click', () => {
      this.onChunkClick(chunk, index);
    });

    // Add hover effects
    chunkElement.addEventListener('mouseenter', () => {
      closeSpan.style.opacity = '1';
    });

    chunkElement.addEventListener('mouseleave', () => {
      closeSpan.style.opacity = '0.7';
    });

    // Append text and close button to chunk
    chunkElement.appendChild(textSpan);
    chunkElement.appendChild(closeSpan);

    // Append chunk to container
    this.textChunksContainer.appendChild(chunkElement);
  }

  /**
   * Removes a text chunk from the view
   * @param {HTMLElement} chunkElement - The chunk element to remove
   * @param {number} index - The index of the chunk
   */
  removeChunk(chunkElement, index) {
    if (chunkElement && chunkElement.parentNode) {
      const startTime = chunkElement.getAttribute('data-start-time');
      const endTime = chunkElement.getAttribute('data-end-time');
      console.log(`Removing chunk at index ${index}: start=${startTime}s, end=${endTime}s`);
      
      chunkElement.remove();
      this.onChunkRemove(index);
    }
  }

  /**
   * Handles chunk click events (can be overridden for seek functionality)
   * @param {Object} chunk - The chunk data
   * @param {number} index - The chunk index
   */
  onChunkClick(chunk, index) {
    console.log(`Chunk clicked: "${chunk.text}" at time ${chunk.timestamp[0]}s`);
    // This can be extended to seek to the timestamp in a video player
  }

  /**
   * Handles chunk removal events (can be overridden for data management)
   * @param {number} index - The index of the removed chunk
   */
  onChunkRemove(index) {
    console.log(`Chunk removed at index: ${index}`);
    // This can be extended to update the underlying data
  }

  /**
   * Gets all current text chunks as an array
   * @returns {Array} Array of chunk elements
   */
  getCurrentChunks() {
    return Array.from(this.textChunksContainer.querySelectorAll('.text-chunk'));
  }

  /**
   * Highlights a specific chunk (useful for current playback position)
   * @param {number} index - The index of the chunk to highlight
   */
  highlightChunk(index) {
    // Remove previous highlights
    this.getCurrentChunks().forEach(chunk => {
      chunk.classList.remove('highlighted');
    });

    // Add highlight to specified chunk
    const chunkToHighlight = this.textChunksContainer.querySelector(`[data-index="${index}"]`);
    if (chunkToHighlight) {
      chunkToHighlight.classList.add('highlighted');
    }
  }

  /**
   * Highlights chunks based on current time
   * @param {number} currentTime - The current playback time in seconds
   */
  highlightChunksByTime(currentTime) {
    this.getCurrentChunks().forEach(chunk => {
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