type AspectRatio = '16:9' | '9:16' | '1:1' | '3:4';

interface AspectRatioConfig {
  display: string;
  cssValue: string;
}

type RatioChangeCallback = (ratio: AspectRatio, oldRatio: AspectRatio) => void;

/**
 * AspectRatioSelector - UI component for selecting canvas aspect ratios
 * Provides dropdown interface for choosing between different aspect ratios
 */
export class AspectRatioSelector {
  #dropdown: HTMLDivElement | null = null;
  #toggle: HTMLDivElement | null = null;
  #menu: HTMLDivElement | null = null;
  #currentRatio: AspectRatio = '16:9';
  #onRatioChangeCallback: RatioChangeCallback = (ratio, oldRatio) => { };

  // Available aspect ratios with display names and CSS values
  #aspectRatios: Record<AspectRatio, AspectRatioConfig> = {
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
  #createDropdown(): void {
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
    Object.entries(this.#aspectRatios).forEach(([ratio, config]: [string, AspectRatioConfig]) => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = config.display;
      item.dataset.ratio = ratio;

      if (ratio === this.#currentRatio) {
        item.classList.add('active');
      }

      this.#menu!.appendChild(item);
    });

    // Assemble dropdown
    this.#dropdown.appendChild(this.#toggle);
    this.#dropdown.appendChild(this.#menu);
  }

  #setupEventListeners(): void {
    this.#toggle!.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.#toggleDropdown();
    });

    this.#menu!.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('dropdown-item')) {
        const selectedRatio = target.dataset.ratio as AspectRatio;
        this.#selectRatio(selectedRatio);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.#closeDropdown();
    });
  }

  #toggleDropdown(): void {
    this.#menu!.classList.toggle('show');
  }

  #closeDropdown(): void {
    this.#menu!.classList.remove('show');
  }

  #selectRatio(ratio: AspectRatio): void {
    if (ratio === this.#currentRatio) {
      return;
    }
    const oldRatio = this.#currentRatio;
    this.#currentRatio = ratio;

    this.#toggle!.textContent = this.#aspectRatios[ratio].display;

    this.#menu!.querySelectorAll('.dropdown-item').forEach((item: Element) => {
      const htmlItem = item as HTMLElement;
      htmlItem.classList.toggle('active', htmlItem.dataset.ratio === ratio);
    });
    this.#closeDropdown();
    this.#onRatioChangeCallback(ratio, oldRatio);
  }

  /**
   * Set callback for aspect ratio changes
   */
  onRatioChange(callback: RatioChangeCallback): void {
    this.#onRatioChangeCallback = callback;
  }

  /**
   * Mount the dropdown to a parent element
   */
  mount(parent: HTMLElement): void {
    if (!(parent instanceof HTMLElement)) {
      throw new Error('Parent must be an HTML element');
    }
    parent.appendChild(this.#dropdown!);
  }
}
