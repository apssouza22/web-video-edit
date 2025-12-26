import type {ModelOption, SpeechConfig, SpeechProgressEvent, VoiceOption} from './types.js';
import {DEFAULT_MODELS, DEFAULT_SPEED, DEFAULT_VOICES, MAX_SPEED, MIN_SPEED,} from './types.js';

type EventListeners = {
  downloadAudio: (filename?: string) => void;
  generateSpeech: (text: string, config: SpeechConfig) => void
}

export class SpeechView {
  #container: HTMLElement | null = null;
  #textArea: HTMLTextAreaElement | null = null;
  #modelSelect: HTMLSelectElement | null = null;
  #voiceSelect: HTMLSelectElement | null = null;
  #speedSlider: HTMLInputElement | null = null;
  #speedInput: HTMLInputElement | null = null;
  #submitButton: HTMLButtonElement | null = null;
  #downloadButton: HTMLButtonElement | null = null;
  #statusMessage: HTMLElement | null = null;
  #resetButton: HTMLButtonElement | null = null;
  #eventListeners: EventListeners;

  constructor(eventListeners: EventListeners) {
    this.#eventListeners = eventListeners;
    this.#container = document.getElementById('speech');

    if (!this.#container) {
      console.error('Speech container element not found');
      return;
    }
  }

  initialize(): void {
    this.#buildUI();
    this.#bindEvents();
  }

  #buildUI(): void {
    if (!this.#container) return;

    this.#container.innerHTML = `
      <div class="speech-input-section">
        <textarea 
          class="speech-textarea" 
          placeholder="Start typing here..."
          rows="4"
        ></textarea>
        <button class="speech-submit-btn" title="Generate speech">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <div class="speech-model-section">
        <select class="speech-model-select">
          ${this.#renderModelOptions()}
        </select>
      </div>

      <div class="speech-settings-section">
        <div class="speech-settings-header">
          <span class="speech-settings-title">Settings</span>
          <button class="speech-reset-btn" title="Reset to defaults">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>

        <div class="speech-setting-row">
          <label class="speech-setting-label">Voice</label>
          <select class="speech-voice-select">
            ${this.#renderVoiceOptions()}
          </select>
        </div>

        <div class="speech-setting-row">
          <label class="speech-setting-label">Speed</label>
          <div class="speech-speed-control">
            <input 
              type="range" 
              class="speech-speed-slider" 
              min="${MIN_SPEED}" 
              max="${MAX_SPEED}" 
              value="${DEFAULT_SPEED}"
            >
            <div class="speech-speed-input-group">
              <input 
                type="number" 
                class="speech-speed-input" 
                min="${MIN_SPEED}" 
                max="${MAX_SPEED}" 
                value="${DEFAULT_SPEED}"
              >
              <span class="speech-speed-unit">%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="speech-status-section">
        <span class="speech-status-message"></span>
      </div>

      <div class="speech-actions-section">
        <button class="speech-download-btn" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Audio
        </button>
      </div>
    `;

    this.#cacheElements();
  }

  #renderModelOptions(): string {
    return DEFAULT_MODELS.map(
        (model: ModelOption) =>
            `<option value="${model.id}">${model.name}</option>`
    ).join('');
  }

  #renderVoiceOptions(): string {
    return DEFAULT_VOICES.map(
        (voice: VoiceOption) =>
            `<option value="${voice.id}">${voice.name}</option>`
    ).join('');
  }

  #cacheElements(): void {
    if (!this.#container) return;

    this.#textArea = this.#container.querySelector('.speech-textarea');
    this.#modelSelect = this.#container.querySelector('.speech-model-select');
    this.#voiceSelect = this.#container.querySelector('.speech-voice-select');
    this.#speedSlider = this.#container.querySelector('.speech-speed-slider');
    this.#speedInput = this.#container.querySelector('.speech-speed-input');
    this.#submitButton = this.#container.querySelector('.speech-submit-btn');
    this.#downloadButton = this.#container.querySelector('.speech-download-btn');
    this.#statusMessage = this.#container.querySelector('.speech-status-message');
    this.#resetButton = this.#container.querySelector('.speech-reset-btn');
  }

  #bindEvents(): void {
    this.#submitButton?.addEventListener('click', () => this.#handleSubmit());

    this.#speedSlider?.addEventListener('input', () => {
      if (this.#speedSlider && this.#speedInput) {
        this.#speedInput.value = this.#speedSlider.value;
      }
    });

    this.#speedInput?.addEventListener('change', () => {
      if (this.#speedSlider && this.#speedInput) {
        const value = Math.max(MIN_SPEED, Math.min(MAX_SPEED, Number(this.#speedInput.value)));
        this.#speedInput.value = String(value);
        this.#speedSlider.value = String(value);
      }
    });

    this.#resetButton?.addEventListener('click', () => this.#handleReset());

    this.#downloadButton?.addEventListener('click', () => {
      this.#eventListeners.downloadAudio();
    });

    this.#textArea?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.#handleSubmit();
      }
    });
  }

  #handleSubmit(): void {
    const text = this.#textArea?.value.trim();
    if (!text) {
      this.#showStatus('Please enter some text', 'error');
      return;
    }

    const config = {
      voice: this.#voiceSelect!.value,
      speed: Number(this.#speedInput!.value),
    };

    this.#setLoading(true);
    this.#eventListeners.generateSpeech(text, config);
  }

  #handleReset(): void {
    if (this.#voiceSelect) {
      this.#voiceSelect.value = DEFAULT_VOICES[0].id;
    }
    if (this.#speedSlider) {
      this.#speedSlider.value = String(DEFAULT_SPEED);
    }
    if (this.#speedInput) {
      this.#speedInput.value = String(DEFAULT_SPEED);
    }
  }

  #setLoading(loading: boolean): void {
    if (this.#submitButton) {
      this.#submitButton.disabled = loading;
    }
    if (this.#textArea) {
      this.#textArea.disabled = loading;
    }
  }

  #showStatus(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    if (!this.#statusMessage) return;

    this.#statusMessage.textContent = message;
    this.#statusMessage.className = `speech-status-message speech-status-${type}`;
  }

  updateProgress(event: SpeechProgressEvent): void {
    switch (event.status) {
      case 'loading':
        this.#showStatus(event.message || 'Loading model...', 'info');
        break;
      case 'generating':
        this.#showStatus(event.message || 'Generating speech...', 'info');
        break;
      case 'complete':
        this.#showStatus(event.message || 'Complete!', 'success');
        this.#setLoading(false);
        break;
      case 'error':
        this.#showStatus(event.message || 'An error occurred', 'error');
        this.#setLoading(false);
        break;
    }
  }

  enableDownload(): void {
    if (this.#downloadButton) {
      this.#downloadButton.disabled = false;
    }
  }

  showTabContent(): void {
    const speechTab = document.querySelector('.tab-button[data-tab="speech"]');
    if (speechTab) {
      (speechTab as HTMLElement).click();
    }
  }
}

