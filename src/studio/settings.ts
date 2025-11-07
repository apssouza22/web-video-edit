import { fps, max_size, setFps, setMaxSize } from '../constants.js';
import { popup } from '../common/utils.ts';

export class SettingsPopup {
  private divBox: HTMLDivElement;

  constructor() {
    this.divBox = document.createElement('div');
    this.divBox.classList.toggle('settings');
  }

  createUI(): void {
    this.divBox.innerHTML = `
    <div class="holder">
      <label>FPS</label>
      <input type="text" class="fps-input" />
      <label>Max RAM (in MB)</label>
      <input type="text" class="ram-input" />
    </div>

    `;

    const fpsInput = this.divBox.querySelector('.fps-input') as HTMLInputElement;
    const ramInput = this.divBox.querySelector('.ram-input') as HTMLInputElement;

    if (fpsInput && ramInput) {
      fpsInput.value = fps.toFixed(2);
      ramInput.value = (max_size / 1e6).toFixed(2);

      fpsInput.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        setFps(Number.parseFloat(target.value));
      });

      ramInput.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        setMaxSize(1e6 * Number.parseFloat(target.value));
      });
    }
  }
}

const settingsPopUp = new SettingsPopup();
export function updateSettings(): void {
  settingsPopUp.createUI();
  popup(settingsPopUp.divBox);
}
