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
    this.#clearResult();
    this.displayResult(result);
  }

  #clearResult(): void {
    if (this.#resultContainer) {
      this.#resultContainer.innerHTML = '';
    }
  }

  #escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private displayResult(result: FrameSample): void {
    if (!this.#resultContainer) return;
    const escapedText = this.#escapeHtml(result.text!);
    const resultHTML = `
      <div class="vision-result-item" style="padding: 10px; margin-bottom: 5px;">
        <div class="result-text" style="font-size: 14px; line-height: 1.5;">
          ${escapedText}
        </div>
        ${result.timestamp ? `<div class="result-timestamp" style="font-size: 12px; color: #666; margin-top: 5px;">
          ${new Date(result.timestamp).toLocaleTimeString()}
        </div>` : ''}
      </div>
    `;

    this.#resultContainer.insertAdjacentHTML('beforeend', resultHTML);
  }

  private show(): void {
    const visionTab = document.querySelector('.tab-button[data-tab="vision"]');
    if (visionTab) {
      (visionTab as HTMLElement).click();
    }
  }
}

