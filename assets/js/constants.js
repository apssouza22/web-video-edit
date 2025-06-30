export const dpr = window.devicePixelRatio || 1;

// Read FPS from localStorage, default to 24 if not found
const storedFps = localStorage.getItem('video-editor-fps');
export let fps = storedFps ? parseFloat(storedFps) : 24;

export let max_size = 4000 * 1e6 / 4; // 4GB max

export const AudioContext = window.AudioContext ||
    window.webkitAudioContext ||
    false;

// Functions to update mutable globals
export function setFps(newFps) {
    fps = newFps;
    localStorage.setItem('video-editor-fps', newFps.toString());
}

export function setMaxSize(newMaxSize) {
    max_size = newMaxSize;
}