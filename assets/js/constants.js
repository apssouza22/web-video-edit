export const dpr = window.devicePixelRatio || 1;
export let fps = 24;
export let max_size = 4000 * 1e6 / 4; // 4GB max

export const AudioContext = window.AudioContext ||
    window.webkitAudioContext ||
    false;

// Functions to update mutable globals
export function setFps(newFps) {
    fps = newFps;
}

export function setMaxSize(newMaxSize) {
    max_size = newMaxSize;
} 