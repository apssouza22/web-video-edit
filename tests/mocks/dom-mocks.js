// DOM element mocks for testing
import { mockFn } from '../utils/mock-fn.js';

export const createMockElement = (tagName = 'div', attributes = {}) => {
  const element = {
    tagName: tagName.toUpperCase(),
    id: attributes.id || '',
    className: attributes.className || '',
    innerHTML: '',
    textContent: '',
    style: {},
    children: [],
    parentNode: null,
    
    addEventListener: mockFn(),
    removeEventListener: mockFn(),
    appendChild: mockFn(),
    removeChild: mockFn(),
    querySelector: mockFn(),
    querySelectorAll: mockFn(() => []),
    getAttribute: mockFn(attr => attributes[attr]),
    setAttribute: mockFn(),
    removeAttribute: mockFn(),
    click: mockFn(),
    focus: mockFn(),
    blur: mockFn(),
    
    // Canvas specific methods
    getContext: mockFn(() => ({
      fillRect: mockFn(),
      clearRect: mockFn(),
      drawImage: mockFn(),
      getImageData: mockFn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: mockFn(),
      save: mockFn(),
      restore: mockFn(),
      canvas: { width: 800, height: 600 }
    })),
    
    // Video specific properties
    currentTime: 0,
    duration: 0,
    paused: true,
    play: mockFn(() => Promise.resolve()),
    pause: mockFn(),
    load: mockFn(),
    
    // Input specific properties
    value: '',
    checked: false,
    disabled: false
  };
  
  // Add specific properties based on tag name
  if (tagName.toLowerCase() === 'canvas') {
    element.width = 800;
    element.height = 600;
  }
  
  return element;
};

export const mockDocument = {
  createElement: mockFn(tagName => createMockElement(tagName)),
  getElementById: mockFn(),
  querySelector: mockFn(),
  querySelectorAll: mockFn(() => []),
  addEventListener: mockFn(),
  removeEventListener: mockFn(),
  body: createMockElement('body'),
  head: createMockElement('head'),
  hidden: false,
  visibilityState: 'visible',
  documentElement: createMockElement('html')
};

export const mockWindow = {
  addEventListener: mockFn(),
  removeEventListener: mockFn(),
  requestAnimationFrame: mockFn(cb => setTimeout(cb, 16)),
  cancelAnimationFrame: mockFn(id => clearTimeout(id)),
  performance: {
    now: mockFn(() => Date.now())
  },
  URL: {
    createObjectURL: mockFn(() => 'mock-url'),
    revokeObjectURL: mockFn()
  },
  location: {
    href: 'http://localhost:8080',
    origin: 'http://localhost:8080'
  }
};

// Setup global mocks
global.document = mockDocument;
global.window = mockWindow;
