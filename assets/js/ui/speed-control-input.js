/**
 * Speed Control Input Component
 * Provides UI for controlling layer playback speed with validation and presets
 */
export class SpeedControlInput {
  #container = null;
  #input = null;
  /** @type {StandardLayer} */
  #currentLayer = null;
  #onSpeedChangeCallback = (speed) => {};

  constructor() {
    this.#createComponent();
    this.#setupEventListeners();
  }

  /**
   * Create the speed control component HTML structure
   * @private
   */
  #createComponent() {
    this.#container = document.createElement('div');
    this.#container.className = 'speed-control-container';
    
    this.#container.innerHTML = `
      <div class="speed-control-header">
        <div class="speed-control-input-group">
          <input type="number" 
                 class="speed-control-input" 
                 min="0.1" 
                 max="10" 
                 step="0.1" 
                 value="1.0"
                 placeholder="1.0">
        </div>
      </div>
      <div class="speed-control-presets"></div>
    `;

    this.#input = this.#container.querySelector('.speed-control-input');
  }

  #setupEventListeners() {
    this.#input.addEventListener('input', this.#handleInputChange.bind(this));
    this.#input.addEventListener('blur', this.#handleInputBlur.bind(this));
    this.#input.addEventListener('keydown', this.#handleInputKeydown.bind(this));
  }

  #handleInputChange(event) {
    const value = parseFloat(event.target.value);
    if (this.#isValidSpeed(value)) {
      this.#applySpeed(value);
    }
  }


  #handleInputBlur(event) {
    const value = parseFloat(event.target.value);
    if (!this.#isValidSpeed(value)) {
      const currentSpeed = this.#currentLayer ? this.#currentLayer.getSpeed() : 1.0;
      this.#input.value = currentSpeed.toFixed(2);
      this.#showValidationError('Invalid speed value. Must be between 0.1 and 10.');
    }
  }

  #handleInputKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.#input.blur(); // Trigger validation
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      // Reset to current layer speed
      const currentSpeed = this.#currentLayer ? this.#currentLayer.getSpeed() : 1.0;
      this.#input.value = currentSpeed.toFixed(2);
      this.#input.blur();
    }
  }


  #isValidSpeed(speed) {
    return !isNaN(speed) && speed >= 0.1 && speed <= 10;
  }


  #applySpeed(speed) {
    if (this.#currentLayer && this.#isValidSpeed(speed)) {
      try {
        this.#currentLayer.setSpeed(speed);
        this.#onSpeedChangeCallback(speed);
        this.#clearValidationError();
      } catch (error) {
        console.error('Failed to set speed:', error);
        this.#showValidationError(error.message);
      }
    }
  }

  #showValidationError(message) {
    this.#clearValidationError();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'speed-control-error';
    errorDiv.textContent = message;
    
    this.#container.appendChild(errorDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => this.#clearValidationError(), 3000);
  }


  #clearValidationError() {
    const existingError = this.#container.querySelector('.speed-control-error');
    if (existingError) {
      existingError.remove();
    }
  }

  /**
   * Set the current layer
   * @param {StandardLayer} layer
   */
  setLayer(layer) {
    this.#currentLayer = layer;
    if (layer) {
      const currentSpeed = layer.getSpeed();
      this.setSpeed(currentSpeed, false); // Don't trigger callback
    }
  }

  /**
   * Set speed value
   * @param {number} speed
   * @param {boolean} applyToLayer - Whether to apply to layer (default: true)
   */
  setSpeed(speed, applyToLayer = true) {
    if (this.#isValidSpeed(speed)) {
      this.#input.value = speed.toFixed(2);

      if (applyToLayer) {
        this.#applySpeed(speed);
      }
    }
  }


  /**
   * Set callback for speed changes
   * @param {Function} callback
   */
  onSpeedChange(callback) {
    this.#onSpeedChangeCallback = callback;
  }

  /**
   * Enable or disable the component
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.#input.disabled = !enabled;
    if (enabled) {
      this.#container.classList.remove('disabled');
    } else {
      this.#container.classList.add('disabled');
    }
  }


  /**
   * Mount the component to a parent element
   * @param {HTMLElement} parent
   */
  mount(parent) {
    if (!(parent instanceof HTMLElement)) {
      throw new Error('Parent must be an HTML element');
    }
    parent.appendChild(this.#container);
  }

}
