export class LoadingPopup {
  constructor() {
    this.popup = document.getElementById('loading-popup');
    this.progressFill = document.getElementById('loading-progress-fill');
    this.progressText = document.getElementById('loading-progress-text');
    this.currentFileText = document.getElementById('loading-current-file');
    
    this.activeLoads = new Map(); // Track multiple loading operations
    this.isVisible = false;
  }

  /**
   * Start tracking a loading operation
   * @param {string} layerId - Unique identifier for the layer being loaded
   * @param {string} fileName - Name of the file being loaded
   */
  startLoading(layerId, fileName = 'Unknown file') {
    this.activeLoads.set(layerId, {
      fileName: fileName,
      progress: 0
    });
    
    this.updateDisplay();
    this.show();
  }

  /**
   * Update progress for a specific loading operation
   * @param {string} layerId - Unique identifier for the layer
   * @param {number} progress - Progress percentage (0-100)
   */
  updateProgress(layerId, progress) {
    if (this.activeLoads.has(layerId)) {
      this.activeLoads.get(layerId).progress = progress;
      this.updateDisplay();
      
      // If this operation is complete, remove it
      if (progress >= 100) {
        this.activeLoads.delete(layerId);
        
        // If no more active loads, hide the popup after a brief delay
        if (this.activeLoads.size === 0) {
          setTimeout(() => {
            if (this.activeLoads.size === 0) {
              this.hide();
            }
          }, 500);
        }
      }
    }
  }

  /**
   * Update the popup display based on current loading operations
   */
  updateDisplay() {
    if (this.activeLoads.size === 0) {
      return;
    }

    // Calculate overall progress (average of all active loads)
    let totalProgress = 0;
    let currentFileName = '';
    let activeLoadCount = 0;

    for (const [layerId, loadInfo] of this.activeLoads) {
      totalProgress += loadInfo.progress;
      activeLoadCount++;
      
      // Show the file name of the most recent/current loading operation
      if (loadInfo.progress < 100) {
        currentFileName = loadInfo.fileName;
      }
    }

    const averageProgress = activeLoadCount > 0 ? totalProgress / activeLoadCount : 0;
    
    // Update progress bar
    this.progressFill.style.width = `${averageProgress}%`;
    
    // Update progress text
    this.progressText.textContent = `${Math.round(averageProgress)}%`;
    
    // Update current file text
    if (activeLoadCount > 1) {
      this.currentFileText.textContent = `Loading ${activeLoadCount} files... (${currentFileName})`;
    } else {
      this.currentFileText.textContent = `Loading: ${currentFileName}`;
    }
  }

  /**
   * Show the loading popup
   */
  show() {
    if (!this.isVisible) {
      this.popup.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * Hide the loading popup
   */
  hide() {
    if (this.isVisible) {
      this.popup.style.display = 'none';
      this.isVisible = false;
      this.activeLoads.clear();
    }
  }

  /**
   * Force hide the popup (in case of errors)
   */
  forceHide() {
    this.hide();
  }

  /**
   * Check if any loading operations are active
   * @returns {boolean}
   */
  hasActiveLoads() {
    return this.activeLoads.size > 0;
  }
} 