import {ShapeType} from '@/mediaclip/shape';
import {SHAPE_BUTTONS} from './types';

export type ShapeCreatedCallback = (shapeType: ShapeType) => void;

export class ShapeView {
  #container: HTMLElement;
  #onShapeCreated: ShapeCreatedCallback;

  constructor(containerId: string, onShapeCreated: ShapeCreatedCallback) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.#container = container;
    this.#onShapeCreated = onShapeCreated;
  }

  init(): void {
    this.#render();
  }

  #render(): void {
    this.#container.innerHTML = '';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'tab-section-title';
    titleDiv.textContent = 'Add Shape';
    this.#container.appendChild(titleDiv);
    
    const shapesGrid = document.createElement('div');
    shapesGrid.className = 'shapes-grid';
    
    SHAPE_BUTTONS.forEach(config => {
      const button = this.#createShapeButton(config.type, config.label, config.icon);
      shapesGrid.appendChild(button);
    });
    
    this.#container.appendChild(shapesGrid);
  }

  #createShapeButton(type: ShapeType, label: string, icon: string): HTMLElement {
    const button = document.createElement('button');
    button.className = 'shape-button';
    button.innerHTML = `
      <span class="shape-icon">${icon}</span>
      <span class="shape-label">${label}</span>
    `;
    
    button.addEventListener('click', () => {
      this.#onShapeCreated(type);
    });
    
    return button;
  }
}

