import type {FrameSample} from './types.js';

export class SampleDisplay {
  #container: HTMLElement | null = null;
  #isVisible: boolean = false;

  displaySamples(samples: FrameSample[], options?: {
    title?: string;
    maxThumbnailWidth?: number;
    maxThumbnailHeight?: number;
  }): void {
    const {
      title = 'Extracted Frame Samples',
      maxThumbnailWidth = 200,
      maxThumbnailHeight = 150
    } = options || {};

    if (this.#container) {
      this.#container.remove();
    }

    this.#container = this.#createContainer(title, samples, maxThumbnailWidth, maxThumbnailHeight);
    document.body.appendChild(this.#container);
    this.#isVisible = true;
  }

  #createContainer(
    title: string,
    samples: FrameSample[],
    maxWidth: number,
    maxHeight: number
  ): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'sample-display-overlay';
    this.#applyOverlayStyles(overlay);

    const modal = document.createElement('div');
    modal.className = 'sample-display-modal';
    this.#applyModalStyles(modal);

    const header = this.#createHeader(title);
    modal.appendChild(header);

    const content = this.#createContent(samples, maxWidth, maxHeight);
    modal.appendChild(content);

    const footer = this.#createFooter(samples.length);
    modal.appendChild(footer);

    overlay.appendChild(modal);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    return overlay;
  }

  #createHeader(title: string): HTMLElement {
    const header = document.createElement('div');
    header.className = 'sample-display-header';
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
    `;

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'sample-display-close';
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 32px;
      cursor: pointer;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s;
      line-height: 1;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    return header;
  }

  #createContent(samples: FrameSample[], maxWidth: number, maxHeight: number): HTMLElement {
    const content = document.createElement('div');
    content.className = 'sample-display-content';
    content.style.cssText = `
      padding: 20px;
      max-height: 70vh;
      overflow-y: auto;
      background: #f8f9fa;
    `;

    if (samples.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = 'No samples to display';
      emptyMessage.style.cssText = `
        text-align: center;
        padding: 40px;
        color: #999;
        font-size: 16px;
      `;
      content.appendChild(emptyMessage);
      return content;
    }

    const grid = document.createElement('div');
    grid.className = 'sample-display-grid';
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(${maxWidth}px, 1fr));
      gap: 20px;
    `;

    samples.forEach((sample, index) => {
      const card = this.#createSampleCard(sample, index, maxWidth, maxHeight);
      grid.appendChild(card);
    });

    content.appendChild(grid);

    return content;
  }

  #createSampleCard(sample: FrameSample, index: number, maxWidth: number, maxHeight: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'sample-card';
    card.style.cssText = `
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    `;
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    });

    const canvas = document.createElement('canvas');
    canvas.width = sample.imageData.width;
    canvas.height = sample.imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(sample.imageData, 0, 0);
    }

    canvas.style.cssText = `
      width: 100%;
      height: ${maxHeight}px;
      object-fit: cover;
      display: block;
    `;

    const info = document.createElement('div');
    info.className = 'sample-info';
    info.style.cssText = `
      padding: 12px;
      background: white;
    `;

    const sampleNumber = document.createElement('div');
    sampleNumber.textContent = `Sample ${index + 1}`;
    sampleNumber.style.cssText = `
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
    `;

    const timeInfo = document.createElement('div');
    const seconds = (sample.timestamp / 1000).toFixed(2);
    timeInfo.textContent = `Time: ${seconds}s`;
    timeInfo.style.cssText = `
      font-size: 13px;
      color: #666;
      margin-bottom: 4px;
    `;

    const frameInfo = document.createElement('div');
    frameInfo.textContent = `Frame: ${sample.frameIndex}`;
    frameInfo.style.cssText = `
      font-size: 13px;
      color: #666;
      margin-bottom: 4px;
    `;

    const dimensionInfo = document.createElement('div');
    dimensionInfo.textContent = `${sample.imageData.width}x${sample.imageData.height}`;
    dimensionInfo.style.cssText = `
      font-size: 12px;
      color: #999;
    `;

    info.appendChild(sampleNumber);
    info.appendChild(timeInfo);
    info.appendChild(frameInfo);
    info.appendChild(dimensionInfo);

    card.appendChild(canvas);
    card.appendChild(info);

    card.addEventListener('click', () => {
      this.#showFullImage(sample, index);
    });

    return card;
  }

  #createFooter(count: number): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'sample-display-footer';
    footer.style.cssText = `
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
      background: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 0 0 12px 12px;
    `;

    const countText = document.createElement('div');
    countText.textContent = `Total Samples: ${count}`;
    countText.style.cssText = `
      font-size: 14px;
      color: #666;
      font-weight: 500;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 8px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: opacity 0.3s;
    `;
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.opacity = '0.9';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.opacity = '1';
    });
    closeButton.addEventListener('click', () => this.hide());

    footer.appendChild(countText);
    footer.appendChild(closeButton);

    return footer;
  }

  #showFullImage(sample: FrameSample, index: number): void {
    const fullImageOverlay = document.createElement('div');
    fullImageOverlay.className = 'full-image-overlay';
    fullImageOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      padding: 20px;
      box-sizing: border-box;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 40px;
      cursor: pointer;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s;
      line-height: 1;
    `;
    closeBtn.addEventListener('click', () => fullImageOverlay.remove());
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    const canvas = document.createElement('canvas');
    canvas.width = sample.imageData.width;
    canvas.height = sample.imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(sample.imageData, 0, 0);
    }
    canvas.style.cssText = `
      max-width: 90%;
      max-height: 80vh;
      object-fit: contain;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    const infoText = document.createElement('div');
    const seconds = (sample.timestamp / 1000).toFixed(2);
    infoText.textContent = `Sample ${index + 1} - Time: ${seconds}s - Frame: ${sample.frameIndex} - ${sample.imageData.width}x${sample.imageData.height}`;
    infoText.style.cssText = `
      color: white;
      margin-top: 20px;
      font-size: 16px;
      text-align: center;
    `;

    fullImageOverlay.appendChild(closeBtn);
    fullImageOverlay.appendChild(canvas);
    fullImageOverlay.appendChild(infoText);

    fullImageOverlay.addEventListener('click', (e) => {
      if (e.target === fullImageOverlay) {
        fullImageOverlay.remove();
      }
    });

    document.body.appendChild(fullImageOverlay);
  }

  #applyOverlayStyles(overlay: HTMLElement): void {
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  #applyModalStyles(modal: HTMLElement): void {
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      max-width: 90vw;
      max-height: 90vh;
      width: 1200px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateY(-50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  hide(): void {
    if (this.#container) {
      this.#container.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        this.#container?.remove();
        this.#container = null;
        this.#isVisible = false;
      }, 300);
    }
  }

  isVisible(): boolean {
    return this.#isVisible;
  }
}

export function displaySamples(samples: FrameSample[], options?: {
  title?: string;
  maxThumbnailWidth?: number;
  maxThumbnailHeight?: number;
}): SampleDisplay {
  const display = new SampleDisplay();
  display.displaySamples(samples, options);
  return display;
}

