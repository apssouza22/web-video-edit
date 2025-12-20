import {popup, StudioState, TabController} from '@/common';
import {initStudio} from "@/studio/initilizer.js";
import {createMediaText, createMediaShape, ShapeType} from "@/mediaclip";
import {fps, max_size, setFps, setMaxSize} from './constants.js';
import {SpeechService} from "@/speech";
import {createShapeView, ShapeView} from "@/shape";
import {createSearchService} from "@/search";

const studio = initStudio();
new TabController('leftNav');
const speechService = new SpeechService();
const searchService = createSearchService();
const shapeVidew = createShapeView('shapes', (shapeType: ShapeType) => {
  studio.addLayer(createMediaShape(shapeType));
});


// @ts-ignore
window.studio = studio;
// @ts-ignore
window.studioState = StudioState.getInstance();
// @ts-ignore
window.popup = popup;
// @ts-ignore
window.speechService = speechService;
// @ts-ignore
window.searchService = searchService;

window.addEventListener('load', function () {
  initLeftNavControls();
  initPlayPauseButton();
});

function initLeftNavControls(): void {
  initTextControls();
  initSettingsControls();
  searchService.init();
  shapeVidew.init();
}

function initPlayPauseButton(): void {
  const playPauseButton = document.getElementById('play-pause-button');
  const playIcon = playPauseButton?.querySelector('.play-icon') as SVGElement;
  const pauseIcon = playPauseButton?.querySelector('.pause-icon') as SVGElement;

  if (!playPauseButton || !playIcon || !pauseIcon) return;

  const updateButtonState = () => {
    const isPlaying = StudioState.getInstance().isPlaying();
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  };

  playPauseButton.addEventListener('click', () => {
    const isPlaying = StudioState.getInstance().isPlaying();
    if (isPlaying) {
      studio.pause();
    } else {
      studio.play();
    }
    updateButtonState();
  });

  // Update button state periodically to sync with keyboard shortcuts
  setInterval(updateButtonState, 100);
  updateButtonState();
}

function initTextControls(): void {
  const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
  const addTextBtn = document.getElementById('add-text-btn');
  
  if (!addTextBtn || !textInput) return;

  addTextBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text) {
      studio.addLayer(createMediaText(text));
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

