import { SpeedControlInput } from './speed-control-input.js';

/**
 * Manages speed control integration with the video studio
 */
export class SpeedControlManager {
  #studio = null;
  #speedControlInput = null;
  #currentLayer = null;

  constructor(studio) {
    this.#studio = studio;
    this.#speedControlInput = new SpeedControlInput();
    this.#setupEventListeners();
  }

  /**
   * Initialize the speed control manager
   */
  init() {
    this.#mountSpeedControl();
    console.log('Speed control manager initialized');
  }

  #mountSpeedControl() {
    const speedControlContainer = document.getElementById('speed-control-item');
    if (speedControlContainer) {
      this.#speedControlInput.mount(speedControlContainer);
      this.#speedControlInput.setEnabled(false);
    } else {
      console.warn('Speed control container not found in timeline header');
    }
  }


  #setupEventListeners() {
    this.#speedControlInput.onSpeedChange((speed) => {
      this.#handleSpeedChange(speed);
    });
  }

  #handleSpeedChange(speed) {
    if (!this.#currentLayer) return;

    console.log(`Speed changed to ${speed}x for layer: ${this.#currentLayer.name}`);
  }


  setLayer(layer) {
    this.#currentLayer = layer;
    this.#speedControlInput.setLayer(layer);
    this.#speedControlInput.setEnabled(true);
  }
}
