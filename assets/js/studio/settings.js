
function updateSettings() {
  let settings = new Settings();
  settings.add('FPS', 'text',
      e => e.value = fps.toFixed(2),
      e => fps = Number.parseInt(e.target.value)
  );
  settings.add('Max RAM (in MB)', 'text',
      e => e.value = (max_size / 1e6).toFixed(2),
      e => max_size = 1e6 * Number.parseInt(e.target.value)
  );
  popup(settings.div);
}


class SettingsPopup {
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
    <a class="apply-button">[APPLY]</a>
    `;

    const fpsInput = this.divBox.querySelector('.fps-input');
    const ramInput = this.divBox.querySelector('.ram-input');
    const applyButton = this.divBox.querySelector('.apply-button');
    applyButton.addEventListener('click', () => {
      console.log(`FPS: ${fps}, Max RAM: ${max_size}`);
    });

    fpsInput.value = fps.toFixed(2);
    ramInput.value = (max_size / 1e6).toFixed(2);

    fpsInput.addEventListener('change', (e) => {
      fps = Number.parseFloat(e.target.value);
    });

    ramInput.addEventListener('change', (e) => {
      max_size = 1e6 * Number.parseFloat(e.target.value);
    });
  }
}

const settingsPopUp = new SettingsPopup();
function updateSettings() {
  settingsPopUp.createUI();
  popup(settingsPopUp.divBox);
}