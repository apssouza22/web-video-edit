import type {FrameSample} from './types.js';

export class VisionView {
  #visionElement: HTMLElement | null = null;
  #resultContainer: HTMLElement | null = null;

  constructor() {
    this.#visionElement = document.getElementById('vision');
    if (this.#visionElement) {
      this.#resultContainer = this.#createDefaultContainer();
    }
  }

  #createDefaultContainer(): HTMLDivElement {
    const resultContainer = document.createElement('div');
    resultContainer.className = 'vision-results';
    this.#visionElement?.appendChild(resultContainer);
    return resultContainer;
  }

  updateResult(result: FrameSample): void {
    if (!result || !result.text) {
      console.error('Invalid vision result provided');
      return;
    }
    this.show()
    this.displayResult(result);
  }

  private displayResult(result: FrameSample): void {
    if (!this.#resultContainer) return;
    
    const itemContainer = document.createElement('div');
    itemContainer.className = 'vision-result-item';
    itemContainer.style.cssText = 'padding: 10px; margin-bottom: 15px; border-bottom: 1px solid #eee;';
    
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = result.imageData.width;
    imageCanvas.height = result.imageData.height;
    imageCanvas.style.cssText = 'max-width: 50%; height: auto; display: block; margin-bottom: 10px; border-radius: 4px;';
    
    const ctx = imageCanvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(result.imageData, 0, 0);
    }
    
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'result-timestamp';
    timestampDiv.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 5px;';
    timestampDiv.textContent = `Timestamp: ${result.timestamp.toFixed(2)}s`;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'result-text';
    textDiv.style.cssText = 'font-size: 14px; line-height: 1.5; color: #fff;';
    textDiv.textContent = result.text || '';
    
    itemContainer.appendChild(imageCanvas);
    itemContainer.appendChild(timestampDiv);
    itemContainer.appendChild(textDiv);
    
    this.#resultContainer.appendChild(itemContainer);
  }

  private show(): void {
    const visionTab = document.querySelector('.tab-button[data-tab="vision"]');
    if (visionTab) {
      (visionTab as HTMLElement).click();
    }
  }
}

