import {AbstractClip} from '@/mediaclip';
import {TRANSFORM_PROPERTIES, TIMING_PROPERTIES, VOLUME_PROPERTY, ClipPropertyDescriptor} from './types';

export type PropertyChangeCallback = (property: string, value: any) => void;

export class ClipSettingsView {
  #container: HTMLElement | null = null;
  #clipSettingsSection: HTMLElement | null = null;
  #currentClip: AbstractClip | null = null;
  #onPropertyChange: PropertyChangeCallback;

  constructor(onPropertyChange: PropertyChangeCallback) {
    this.#onPropertyChange = onPropertyChange;
  }

  init(): void {
    this.#container = document.getElementById('settings');
    if (!this.#container) {
      console.error('Settings container not found');
      return;
    }
    this.#addClipSettingsSection();
  }

  #addClipSettingsSection(): void {
    if (!this.#container) return;

    // Create the clip settings section
    this.#clipSettingsSection = document.createElement('div');
    this.#clipSettingsSection.className = 'clip-settings-section';

    // Add section title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'tab-section-title';
    titleDiv.textContent = 'Selected Clip Properties';
    this.#clipSettingsSection.appendChild(titleDiv);

    // Add container for clip settings
    const containerDiv = document.createElement('div');
    containerDiv.className = 'clip-settings-container';
    containerDiv.id = 'clip-settings-container';
    this.#clipSettingsSection.appendChild(containerDiv);

    this.#showNoSelection();
    this.#container.appendChild(this.#clipSettingsSection);
  }

  #showNoSelection(): void {
    const container = document.getElementById('clip-settings-container');
    if (!container) return;

    container.innerHTML = `
      <div class="no-selection-message">
        Select a clip to edit properties
      </div>
    `;
  }

  updateClip(clip: AbstractClip | null): void {
    this.#currentClip = clip;

    if (!clip) {
      this.#showNoSelection();
      return;
    }

    this.#buildPropertyInputs(clip);
  }

  #buildPropertyInputs(clip: AbstractClip): void {
    const container = document.getElementById('clip-settings-container');
    if (!container) return;
    const form = document.createElement('div');
    form.className = 'clip-properties-form settings-form';
    this.#addSection(form, 'Transform', TRANSFORM_PROPERTIES, clip);
    this.#addSection(form, 'Timing', TIMING_PROPERTIES, clip);

    if (clip.isAudio()) {
      form.classList.add('has-audio');
      this.#addSection(form, 'Audio', [VOLUME_PROPERTY], clip, true);
    }
    container.innerHTML = '';
    container.appendChild(form);
  }

  #addSection(
    form: HTMLElement,
    title: string,
    properties: ClipPropertyDescriptor[],
    clip: AbstractClip,
    audioOnly: boolean = false
  ): void {
    const titleDiv = document.createElement('div');
    titleDiv.className = 'subsection-title';
    if (audioOnly) {
      titleDiv.classList.add('audio-only');
    }
    titleDiv.textContent = title;
    form.appendChild(titleDiv);

    properties.forEach(descriptor => {
      const row = this.#createPropertyInput(descriptor, clip, audioOnly);
      form.appendChild(row);
    });
  }

  #createPropertyInput(
    descriptor: ClipPropertyDescriptor,
    clip: AbstractClip,
    audioOnly: boolean = false
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings-row';
    if (audioOnly) {
      row.classList.add('audio-only');
    }

    const label = document.createElement('label');
    label.htmlFor = `clip-${descriptor.property}`;
    label.textContent = `${descriptor.label}${descriptor.unit ? ` (${descriptor.unit})` : ''}`;
    row.appendChild(label);

    const currentValue = this.#getClipProperty(clip, descriptor.property);

    if (descriptor.type === 'range') {
      // Range input with value display
      const inputContainer = document.createElement('div');
      inputContainer.style.display = 'flex';
      inputContainer.style.alignItems = 'center';
      inputContainer.style.gap = '8px';

      const input = document.createElement('input');
      input.type = 'range';
      input.id = `clip-${descriptor.property}`;
      input.min = String(descriptor.min ?? 0);
      input.max = String(descriptor.max ?? 100);
      input.step = String(descriptor.step ?? 1);
      input.value = String(currentValue);
      input.style.flex = '1';

      const valueSpan = document.createElement('span');
      valueSpan.className = 'volume-value';
      valueSpan.textContent = `${currentValue}${descriptor.unit || ''}`;

      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = parseFloat(target.value);
        valueSpan.textContent = `${value}${descriptor.unit || ''}`;
        this.#onPropertyChange(descriptor.property, value);
      });

      inputContainer.appendChild(input);
      inputContainer.appendChild(valueSpan);
      row.appendChild(inputContainer);
    } else {
      // Number input
      const input = document.createElement('input');
      input.type = 'number';
      input.id = `clip-${descriptor.property}`;
      input.className = 'settings-input';
      input.value = String(currentValue);

      if (descriptor.min !== undefined) input.min = String(descriptor.min);
      if (descriptor.max !== undefined) input.max = String(descriptor.max);
      if (descriptor.step !== undefined) input.step = String(descriptor.step);

      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = parseFloat(target.value);
        if (!isNaN(value)) {
          this.#onPropertyChange(descriptor.property, value);
        }
      });

      row.appendChild(input);
    }

    return row;
  }

  #getClipProperty(clip: AbstractClip, property: string): number {
    switch (property) {
      case 'x':
      case 'y':
      case 'scale':
      case 'rotation':
        // Get from first frame transform
        const frame = clip.frameService.frames[0];
        return frame ? frame[property as keyof typeof frame] as number : 0;

      case 'startTime':
        return clip.startTime;

      case 'duration':
        return clip.totalTimeInMilSeconds;

      case 'speed':
        // Get speed from speed controller if available
        return 1.0; // Default to 1.0, will be overridden by service if available

      case 'volume':
        // For audio clips, volume will be available after we add it
        return 100; // Default to 100%

      default:
        return 0;
    }
  }

  refreshProperty(property: string, value: number): void {
    const input = document.getElementById(`clip-${property}`) as HTMLInputElement;
    if (input) {
      input.value = String(value);

      // Update volume display if it's a range input
      if (property === 'volume') {
        const valueSpan = input.parentElement?.querySelector('.volume-value');
        if (valueSpan) {
          valueSpan.textContent = `${value}%`;
        }
      }
    }
  }
}
