import type { VisionService } from './vision-service.js';
import type { VisionResult } from './types.js';

export class VisionView {
  #visionElement: HTMLElement | null = null;
  #resultContainer: HTMLElement | null;

  constructor() {
    this.#resultContainer = this.#createDefaultContainer();
  }

  #createDefaultContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'vision-result';
    container.style.padding = '10px';
    container.style.border = '1px solid #ccc';
    container.style.marginTop = '10px';
    container.style.borderRadius = '4px';

    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';

    container.appendChild(resultContainer);
    document.body.appendChild(container);
    this.#visionElement = container;
    return resultContainer;
  }

  updateResult(result: VisionResult): void {
    if (!result || !result.text) {
      console.error('Invalid vision result provided');
      return;
    }
    this.show()
    this.#clearResult();
    this.#displayResult(result);
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

  #displayResult(result: VisionResult): void {
    if (!this.#resultContainer) return;
    console.log('Displaying vision result:', result);
    const escapedText = this.#escapeHtml(result.text);

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

  showLoading(): void {
    if (this.#resultContainer) {
      this.#resultContainer.innerHTML = '<div style="padding: 10px;">Analyzing image... Please wait.</div>';
    }
  }

  hide(): void {
    if (this.#visionElement) {
      this.#visionElement.style.display = 'none';
    }
  }

  private show(): void {
    if (this.#visionElement) {
      this.#visionElement.style.display = 'block';
    }
  }
}

