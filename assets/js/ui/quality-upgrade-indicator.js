/**
 * Quality upgrade progress indicator
 * Shows background loading progress to users
 */
export class QualityUpgradeIndicator {
  constructor() {
    this.indicator = null;
    this.progressBar = null;
    this.progressText = null;
    this.isVisible = false;
    this.#createIndicator();
  }

  /**
   * Create the progress indicator UI
   */
  #createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.className = 'quality-upgrade-indicator';
    this.indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      min-width: 200px;
      display: none;
      backdrop-filter: blur(10px);
    `;

    // Progress text
    this.progressText = document.createElement('div');
    this.progressText.style.cssText = `
      margin-bottom: 8px;
      font-weight: 500;
    `;
    this.progressText.textContent = 'Optimizing video quality...';

    // Progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
    `;

    // Progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #45a049);
      border-radius: 2px;
      width: 0%;
      transition: width 0.3s ease;
    `;

    progressContainer.appendChild(this.progressBar);
    this.indicator.appendChild(this.progressText);
    this.indicator.appendChild(progressContainer);
    
    document.body.appendChild(this.indicator);
  }

  /**
   * Show the progress indicator
   */
  show() {
    if (!this.isVisible) {
      this.indicator.style.display = 'block';
      this.isVisible = true;
      this.#updateProgress(0);
    }
  }

  /**
   * Hide the progress indicator
   */
  hide() {
    if (this.isVisible) {
      this.indicator.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Update progress percentage
   * @param {number} progress - Progress percentage (0-100)
   */
  updateProgress(progress) {
    if (this.isVisible) {
      this.#updateProgress(progress);
    }
  }

  /**
   * Internal method to update progress display
   */
  #updateProgress(progress) {
    const clampedProgress = Math.max(0, Math.min(100, progress));
    this.progressBar.style.width = `${clampedProgress}%`;
    
    if (clampedProgress < 100) {
      this.progressText.textContent = `Optimizing video quality... ${clampedProgress.toFixed(0)}%`;
    } else {
      this.progressText.textContent = 'Quality optimization complete!';
      // Auto-hide after completion
      setTimeout(() => this.hide(), 2000);
    }
  }

  /**
   * Clean up the indicator
   */
  destroy() {
    if (this.indicator && this.indicator.parentNode) {
      this.indicator.parentNode.removeChild(this.indicator);
    }
    this.indicator = null;
    this.progressBar = null;
    this.progressText = null;
    this.isVisible = false;
  }
}
