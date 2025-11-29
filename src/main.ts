import {popup, StudioState, TabController} from '@/common';
import {initStudio} from "@/studio/initilizer.js";
import {createMediaText} from "@/media";
import {fps, max_size, setFps, setMaxSize} from './constants.js';

const studio = initStudio();
const tabController = new TabController('leftNav');

// @ts-ignore
window.studio = studio;
// @ts-ignore
window.studioState = StudioState.getInstance();
// @ts-ignore
window.popup = popup;

window.addEventListener('load', function () {
  initLeftNavControls();
  onLoadHandler();
});

function initLeftNavControls(): void {
  initTextControls();
  initSettingsControls();
}

function initTextControls(): void {
  const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
  const addTextBtn = document.getElementById('add-text-btn');
  
  if (!addTextBtn || !textInput) return;

  addTextBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text) {
      studio.addLayer(createMediaText(text, () => {}));
      textInput.value = '';
    }
  });
}

function initSettingsControls(): void {
  const fpsInput = document.getElementById('fps-input') as HTMLInputElement;
  const ramInput = document.getElementById('ram-input') as HTMLInputElement;

  if (fpsInput) {
    fpsInput.value = fps.toFixed(0);
    fpsInput.addEventListener('change', () => {
      setFps(Number.parseFloat(fpsInput.value));
    });
  }

  if (ramInput) {
    ramInput.value = (max_size / 1e6).toFixed(0);
    ramInput.addEventListener('change', () => {
      setMaxSize(1e6 * Number.parseFloat(ramInput.value));
    });
  }
}

function onLoadHandler(): void {
  let file = decodeURIComponent(location.hash.substring(1));
  if (file) {
    console.log("Loading example", file);
    for (let uri of file.split(',')) {
      studio.loadLayersFromJson(uri);
    }
    location.hash = "";
    return;
  }
  const localStorage = window.localStorage;
  let seen = localStorage.getItem('_seen');
  if (!seen || false) {
    const text = document.createElement('div');
    text.innerHTML = `Welcome!
      <br>
      <br>
      To start, use the Media tab to add images or videos, or drag files onto the upload area.
      `;
    popup(text);
    localStorage.setItem('_seen', 'true');
  }
}


