// Jest setup file for global test configuration
import { mockFn } from './utils/mock-fn.js';

// Mock Web APIs that are not available in jsdom
global.MediaRecorder = class MockMediaRecorder {
  constructor() {
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
  }
  
  start() {
    this.state = 'recording';
  }
  
  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
  
  addEventListener(event, handler) {
    this[`on${event}`] = handler;
  }
};

global.VideoDecoder = class MockVideoDecoder {};
global.VideoFrame = class MockVideoFrame {};
global.EncodedVideoChunk = class MockEncodedVideoChunk {};

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getDisplayMedia: mockFn().mockResolvedValue({
      getVideoTracks: () => [{ addEventListener: mockFn() }],
      getAudioTracks: () => [{ addEventListener: mockFn() }]
    }),
    getUserMedia: mockFn().mockResolvedValue({
      getVideoTracks: () => [{ addEventListener: mockFn() }],
      getAudioTracks: () => [{ addEventListener: mockFn() }]
    })
  },
  writable: true
});

// Mock Worker
global.Worker = class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
  }
  
  postMessage(data) {
    // Mock implementation
  }
  
  addEventListener(event, handler) {
    this[`on${event}`] = handler;
  }
  
  terminate() {
    // Mock implementation
  }
};

// Mock Canvas and 2D Context
global.HTMLCanvasElement.prototype.getContext = mockFn(() => ({
  fillRect: mockFn(),
  clearRect: mockFn(),
  getImageData: mockFn(() => ({ 
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  })),
  putImageData: mockFn(),
  createImageData: mockFn(() => ({ 
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  })),
  drawImage: mockFn(),
  save: mockFn(),
  restore: mockFn(),
  beginPath: mockFn(),
  moveTo: mockFn(),
  lineTo: mockFn(),
  closePath: mockFn(),
  stroke: mockFn(),
  fill: mockFn(),
  measureText: mockFn(() => ({ width: 0 })),
  setTransform: mockFn(),
  canvas: {
    width: 800,
    height: 600
  }
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = mockFn(() => 'mock-url');
global.URL.revokeObjectURL = mockFn();

// Mock Blob
global.Blob = class MockBlob {
  constructor(parts, options) {
    this.parts = parts || [];
    this.type = options?.type || '';
    this.size = this.parts.reduce((size, part) => size + (part.length || 0), 0);
  }
};

// Mock File
global.File = class MockFile extends global.Blob {
  constructor(parts, name, options) {
    super(parts, options);
    this.name = name;
    this.lastModified = Date.now();
  }
};

// Mock AudioContext
global.AudioContext = class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.sampleRate = 44100;
  }
  
  createBuffer() {
    return {
      getChannelData: mockFn(() => new Float32Array(1024))
    };
  }
  
  decodeAudioData() {
    return Promise.resolve({
      length: 1024,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: mockFn(() => new Float32Array(1024))
    });
  }
};

// Mock performance.now
global.performance = {
  now: mockFn(() => Date.now())
};

// Mock requestAnimationFrame
global.requestAnimationFrame = mockFn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = mockFn(id => clearTimeout(id));
