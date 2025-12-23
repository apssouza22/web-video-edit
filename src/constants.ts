export const dpr = window.devicePixelRatio || 1;

// Read FPS from localStorage, default to 24 if not found
const storedFps = localStorage.getItem('video-editor-fps');
export let fps = storedFps ? parseFloat(storedFps) : 30;

export let max_size = 4000 * 1e6 / 4; // 4GB max

export const AudioContext = window.AudioContext ||
// @ts-ignore
    window.webkitAudioContext ||
    false;

// Functions to update mutable globals
export function setFps(newFps: number) {
  fps = newFps;
  localStorage.setItem('video-editor-fps', newFps.toString());
}

export function setMaxSize(newMaxSize: number) {
  max_size = newMaxSize;
}