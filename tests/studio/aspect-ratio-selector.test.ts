import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

// Use dynamic imports for ESM
const { AspectRatioSelector } = await import('@/studio/aspect-ratio-selector');

describe('AspectRatioSelector', () => {
  // @ts-ignore
  let selector: AspectRatioSelector;

  beforeEach(() => {
    document.body.innerHTML = '';
    selector = new AspectRatioSelector();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('should create dropdown element', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const dropdown = parent.querySelector('#aspect-ratio-dropdown');
      expect(dropdown).not.toBeNull();
      expect(dropdown?.classList.contains('dropdown')).toBe(true);
    });

    test('should create toggle button', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const toggle = parent.querySelector('#aspect-ratio-toggle');
      expect(toggle).not.toBeNull();
      expect(toggle?.classList.contains('dropdown-toggle')).toBe(true);
    });

    test('should create menu with dropdown items', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const menu = parent.querySelector('#aspect-ratio-menu');
      expect(menu).not.toBeNull();
      expect(menu?.classList.contains('dropdown-menu')).toBe(true);

      const items = menu?.querySelectorAll('.dropdown-item');
      expect(items?.length).toBe(4); // 16:9, 9:16, 1:1, 3:4
    });

    test('should display default ratio (16:9) as selected', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const toggle = parent.querySelector('#aspect-ratio-toggle');
      expect(toggle?.textContent).toBe('16:9 Landscape');

      const activeItem = parent.querySelector('.dropdown-item.active');
      expect(activeItem?.getAttribute('data-ratio')).toBe('16:9');
    });

    test('should create menu items with correct labels', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const items = parent.querySelectorAll('.dropdown-item');
      const texts = Array.from(items).map(item => item.textContent);

      expect(texts).toContain('16:9 Landscape');
      expect(texts).toContain('9:16 Portrait');
      expect(texts).toContain('1:1 Square');
      expect(texts).toContain('3:4 Portrait');
    });
  });

  describe('mount', () => {
    test('should append dropdown to parent element', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      expect(parent.children.length).toBe(1);
      expect(parent.children[0].id).toBe('aspect-ratio-dropdown');
    });

    test('should throw error when parent is not an HTML element', () => {
      expect(() => {
        selector.mount(null as any);
      }).toThrow('Parent must be an HTML element');
    });
  });

  describe('dropdown toggle', () => {
    test('should show menu when toggle is clicked', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const toggle = parent.querySelector('#aspect-ratio-toggle') as HTMLElement;
      const menu = parent.querySelector('#aspect-ratio-menu') as HTMLElement;

      expect(menu.classList.contains('show')).toBe(false);

      toggle.click();

      expect(menu.classList.contains('show')).toBe(true);
    });

    test('should hide menu when toggle is clicked again', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const toggle = parent.querySelector('#aspect-ratio-toggle') as HTMLElement;
      const menu = parent.querySelector('#aspect-ratio-menu') as HTMLElement;

      toggle.click();
      expect(menu.classList.contains('show')).toBe(true);

      toggle.click();
      expect(menu.classList.contains('show')).toBe(false);
    });

    test('should stop event propagation when toggle is clicked', () => {
      const parent = document.createElement('div');
      document.body.appendChild(parent);
      selector.mount(parent);

      const toggle = parent.querySelector('#aspect-ratio-toggle') as HTMLElement;
      const event = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      toggle.dispatchEvent(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('aspect ratio selection', () => {
    test('should change ratio when menu item is clicked', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const toggle = parent.querySelector('#aspect-ratio-toggle') as HTMLElement;
      const items = parent.querySelectorAll('.dropdown-item');
      const portraitItem = Array.from(items).find(
        item => (item as HTMLElement).dataset.ratio === '9:16'
      ) as HTMLElement;

      portraitItem.click();

      expect(toggle.textContent).toBe('9:16 Portrait');
    });

    test('should update active state when ratio changes', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const items = parent.querySelectorAll('.dropdown-item');
      const squareItem = Array.from(items).find(
        item => (item as HTMLElement).dataset.ratio === '1:1'
      ) as HTMLElement;

      squareItem.click();

      const activeItem = parent.querySelector('.dropdown-item.active');
      expect((activeItem as HTMLElement)?.dataset.ratio).toBe('1:1');
    });

    test('should close menu after selection', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const toggle = parent.querySelector('#aspect-ratio-toggle') as HTMLElement;
      const menu = parent.querySelector('#aspect-ratio-menu') as HTMLElement;
      const items = parent.querySelectorAll('.dropdown-item');

      toggle.click();
      expect(menu.classList.contains('show')).toBe(true);

      (items[1] as HTMLElement).click();
      expect(menu.classList.contains('show')).toBe(false);
    });

    test('should not trigger callback when selecting same ratio', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const callback = jest.fn();
      selector.onRatioChange(callback);

      const items = parent.querySelectorAll('.dropdown-item');
      const defaultItem = Array.from(items).find(
        item => (item as HTMLElement).dataset.ratio === '16:9'
      ) as HTMLElement;

      defaultItem.click();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onRatioChange callback', () => {
    test('should invoke callback when ratio changes', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const callback = jest.fn();
      selector.onRatioChange(callback);

      const items = parent.querySelectorAll('.dropdown-item');
      const portraitItem = Array.from(items).find(
        item => (item as HTMLElement).dataset.ratio === '9:16'
      ) as HTMLElement;

      portraitItem.click();

      expect(callback).toHaveBeenCalledWith('9:16', '16:9');
    });

    test('should pass new and old ratio to callback', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const callback = jest.fn();
      selector.onRatioChange(callback);

      const items = parent.querySelectorAll('.dropdown-item');
      
      // First change: 16:9 -> 1:1
      const squareItem = Array.from(items).find(
        item => (item as HTMLElement).dataset.ratio === '1:1'
      ) as HTMLElement;
      squareItem.click();

      expect(callback).toHaveBeenCalledWith('1:1', '16:9');

      // Second change: 1:1 -> 3:4
      const threeByFourItem = Array.from(items).find(
        item => (item as HTMLElement).dataset.ratio === '3:4'
      ) as HTMLElement;
      threeByFourItem.click();

      expect(callback).toHaveBeenCalledWith('3:4', '1:1');
    });

    test('should support multiple ratio changes', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const callback = jest.fn();
      selector.onRatioChange(callback);

      const items = parent.querySelectorAll('.dropdown-item');

      (items[1] as HTMLElement).click();
      (items[2] as HTMLElement).click();
      (items[3] as HTMLElement).click();

      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('click outside to close', () => {
    test('should close menu when clicking outside', () => {
      const parent = document.createElement('div');
      document.body.appendChild(parent);
      selector.mount(parent);

      const toggle = parent.querySelector('#aspect-ratio-toggle') as HTMLElement;
      const menu = parent.querySelector('#aspect-ratio-menu') as HTMLElement;

      toggle.click();
      expect(menu.classList.contains('show')).toBe(true);

      document.dispatchEvent(new Event('click'));

      expect(menu.classList.contains('show')).toBe(false);
    });
  });

  describe('aspect ratio configurations', () => {
    test('should have correct display names for all ratios', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const items = parent.querySelectorAll('.dropdown-item');
      
      expect(items.length).toBe(4);
      expect(Array.from(items).some(item => item.textContent === '16:9 Landscape')).toBe(true);
      expect(Array.from(items).some(item => item.textContent === '9:16 Portrait')).toBe(true);
      expect(Array.from(items).some(item => item.textContent === '1:1 Square')).toBe(true);
      expect(Array.from(items).some(item => item.textContent === '3:4 Portrait')).toBe(true);
    });

    test('should have data-ratio attribute for all items', () => {
      const parent = document.createElement('div');
      selector.mount(parent);

      const items = parent.querySelectorAll('.dropdown-item');
      
      items.forEach(item => {
        const ratio = (item as HTMLElement).dataset.ratio;
        expect(ratio).toBeDefined();
        expect(['16:9', '9:16', '1:1', '3:4']).toContain(ratio);
      });
    });
  });
});

