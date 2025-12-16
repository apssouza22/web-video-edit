interface LoadInfo {
  fileName: string;
  progress: number;
}

export class LoadingPopup {
  private popup: HTMLElement | null;
  private backdrop: HTMLElement | null;
  private progressFill: HTMLElement | null;
  private progressText: HTMLElement | null;
  private currentFileText: HTMLElement | null;
  private title: HTMLElement | null;
  private activeLoads: Map<string, LoadInfo>; // Track multiple loading operations
  private isVisible: boolean;

  constructor() {
    this.popup = document.getElementById('loading-popup');
    this.backdrop = document.getElementById('loading-backdrop');
    this.progressFill = document.getElementById('loading-progress-fill');
    this.progressText = document.getElementById('loading-progress-text');
    this.currentFileText = document.getElementById('loading-current-file');
    this.title = document.getElementById('loading-title');

    this.activeLoads = new Map<string, LoadInfo>();
    this.isVisible = false;
  }

  /**
   * Start tracking a loading operation
   */
  startLoading(layerId: string, fileName: string = 'Unknown file', title: string = 'Loading Media...'): void {
    if (this.title) {
      this.title.textContent = title;
    }
    this.activeLoads.set(layerId, {
      fileName: fileName,
      progress: 0
    });
    
    this.#updateDisplay();
    this.#show();
  }

  /**
   * Update progress for a specific loading operation
   */
  updateProgress(layerId: string, progress: number): void {
    if (this.activeLoads.has(layerId)) {
      const loadInfo = this.activeLoads.get(layerId);
      if (loadInfo) {
        loadInfo.progress = progress;
      }
      this.#updateDisplay();
      
      // If this operation is complete, remove it
      if (progress >= 100) {
        this.activeLoads.delete(layerId);
        
        // If no more active loads, hide the popup after a brief delay
        if (this.activeLoads.size === 0) {
          setTimeout(() => {
            if (this.activeLoads.size === 0) {
              this.#hide();
            }
          }, 500);
        }
      }
    }
  }

  /**
   * Update the popup display based on current loading operations
   */
  #updateDisplay(): void {
    if (this.activeLoads.size === 0) {
      return;
    }

    // Calculate overall progress (average of all active loads)
    let totalProgress: number = 0;
    let currentFileName: string = '';
    let activeLoadCount: number = 0;

    for (const [layerId, loadInfo] of this.activeLoads) {
      totalProgress += loadInfo.progress;
      activeLoadCount++;
      
      // Show the file name of the most recent/current loading operation
      if (loadInfo.progress < 100) {
        currentFileName = loadInfo.fileName;
      }
    }

    const averageProgress = activeLoadCount > 0 ? totalProgress / activeLoadCount : 0;
    
    if (this.progressFill) {
      (this.progressFill as HTMLElement).style.width = `${averageProgress}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = `${Math.round(averageProgress)}%`;
    }

    if (this.currentFileText) {
      if (activeLoadCount > 1) {
        this.currentFileText.textContent = `Loading ${activeLoadCount} files... (${currentFileName})`;
      } else {
        this.currentFileText.textContent = `Loading: ${currentFileName}`;
      }
    }
  }

  /**
   * Show the loading popup
   */
  #show(): void {
    if (!this.isVisible && this.popup) {
      if (this.backdrop) {
        (this.backdrop as HTMLElement).style.display = 'block';
      }
      (this.popup as HTMLElement).style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * Hide the loading popup
   */
  #hide(): void {
    if (this.isVisible && this.popup) {
      (this.popup as HTMLElement).style.display = 'none';
      if (this.backdrop) {
        (this.backdrop as HTMLElement).style.display = 'none';
      }
      this.isVisible = false;
      this.activeLoads.clear();
    }
  }

} 
