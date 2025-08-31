/**
 * AspectRatioSelector - UI component for selecting canvas aspect ratios
 * Provides dropdown interface for choosing between different aspect ratios
 */
export class AspectRatioSelector {
  #dropdown = null;
  #toggle = null;
  #menu = null;
  #currentRatio = '16:9';
  #onRatioChangeCallback = (ratio, oldRatio) => { };

  // Available aspect ratios with display names and CSS values
  #aspectRatios = {
    '16:9': {display: '16:9 Landscape', cssValue: '16/9'},
    '9:16': {display: '9:16 Portrait', cssValue: '9/16'},
    '1:1': {display: '1:1 Square', cssValue: '1/1'},
    '3:4': {display: '3:4 Portrait', cssValue: '3/4'}
  };

  constructor() {
    this.#createDropdown();
    this.#setupEventListeners();
  }

  /**
   * Create the dropdown HTML structure
   */
  #createDropdown() {
    // Create main dropdown container
    this.#dropdown = document.createElement('div');
    this.#dropdown.id = 'aspect-ratio-dropdown';
    this.#dropdown.className = 'dropdown';

    // Create toggle button
    this.#toggle = document.createElement('div');
    this.#toggle.id = 'aspect-ratio-toggle';
    this.#toggle.className = 'dropdown-toggle';
    this.#toggle.textContent = this.#aspectRatios[this.#currentRatio].display;

    // Create dropdown menu
    this.#menu = document.createElement('div');
    this.#menu.id = 'aspect-ratio-menu';
    this.#menu.className = 'dropdown-menu';

    // Create menu items for each aspect ratio
    Object.entries(this.#aspectRatios).forEach(([ratio, config]) => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = config.display;
      item.dataset.ratio = ratio;

      if (ratio === this.#currentRatio) {
        item.classList.add('active');
      }

      this.#menu.appendChild(item);
    });

    // Assemble dropdown
    this.#dropdown.appendChild(this.#toggle);
    this.#dropdown.appendChild(this.#menu);
  }

  #setupEventListeners() {
    this.#toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#toggleDropdown();
    });

    this.#menu.addEventListener('click', (e) => {
      if (e.target.classList.contains('dropdown-item')) {
        const selectedRatio = e.target.dataset.ratio;
        this.#selectRatio(selectedRatio);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.#closeDropdown();
    });
  }

  #toggleDropdown() {
    this.#menu.classList.toggle('show');
  }

  #closeDropdown() {
    this.#menu.classList.remove('show');
  }

  #selectRatio(ratio) {
    if (ratio === this.#currentRatio) {
      return;
    }
    const oldRatio = this.#currentRatio;
    this.#currentRatio = ratio;

    this.#toggle.textContent = this.#aspectRatios[ratio].display;

    this.#menu.querySelectorAll('.dropdown-item').forEach(item => {
      item.classList.toggle('active', item.dataset.ratio === ratio);
    });
    this.#closeDropdown();
    this.#onRatioChangeCallback(ratio, oldRatio);
  }

  /**
   * Set callback for aspect ratio changes
   * @param {Function} callback - Function to call when ratio changes
   */
  onRatioChange(callback) {
    this.#onRatioChangeCallback = callback;
  }

  /**
   * Mount the dropdown to a parent element
   * @param {HTMLElement} parent - Parent element to append dropdown to
   */
  mount(parent) {
    if (!(parent instanceof HTMLElement)) {
      throw new Error('Parent must be an HTML element');
    }
    parent.appendChild(this.#dropdown);
  }
}
