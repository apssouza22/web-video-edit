
import { fps, max_size, setFps, setMaxSize } from '../constants.js';
import { popup } from './utils.js';

export class SettingsPopup {
  constructor() {
    this.divBox = document.createElement('div');
    this.divBox.classList.toggle('settings');
  }

  createUI() {
    this.divBox.innerHTML = `
    <div class="holder">
      <label>FPS</label>
      <input type="text" class="fps-input" />
      <label>Max RAM (in MB)</label>
      <input type="text" class="ram-input" />
    </div>

    `;

    const fpsInput = this.divBox.querySelector('.fps-input');
    const ramInput = this.divBox.querySelector('.ram-input');

    fpsInput.value = fps.toFixed(2);
    ramInput.value = (max_size / 1e6).toFixed(2);

    fpsInput.addEventListener('change', (e) => {
      setFps(Number.parseFloat(e.target.value));
    });

    ramInput.addEventListener('change', (e) => {
      setMaxSize(1e6 * Number.parseFloat(e.target.value));
    });
  }
}

const settingsPopUp = new SettingsPopup();
export function updateSettings() {
  settingsPopUp.createUI();
  popup(settingsPopUp.divBox);
}