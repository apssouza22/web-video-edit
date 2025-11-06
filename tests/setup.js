// Global test setup for Jest
// This file is loaded before each test suite runs

// Mock AudioContext
global.AudioContext = class AudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
  }
  
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  
  createGain() {
    return {
      gain: { value: 1 },
      connect: () => {},
      disconnect: () => {},
    };
  }
  
  resume() {
    return Promise.resolve();
  }
  
  suspend() {
    return Promise.resolve();
  }
};

// Mock OfflineAudioContext
global.OfflineAudioContext = class OfflineAudioContext extends global.AudioContext {
  constructor(numberOfChannels, length, sampleRate) {
    super();
    this.length = length;
    this.numberOfChannels = numberOfChannels;
    this.sampleRate = sampleRate;
  }
};

// Mock MediaRecorder
global.MediaRecorder = class MediaRecorder {
  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  
  start() {
    this.state = 'recording';
  }
  
  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
  
  pause() {
    this.state = 'paused';
  }
  
  resume() {
    this.state = 'recording';
  }
  
  static isTypeSupported() {
    return true;
  }
};

// Mock Worker
global.Worker = class Worker {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.onmessage = null;
    this.onerror = null;
  }
  
  postMessage(data) {}
  
  addEventListener(event, handler) {
    if (event === 'message') {
      this.onmessage = handler;
    } else if (event === 'error') {
      this.onerror = handler;
    }
  }
  
  terminate() {}
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = function(type, options) {
  if (type === '2d') {
    return {
      canvas: this,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      translate: () => {},
      rotate: () => {},
      setTransform: () => {},
      getImageData: (sx, sy, sw, sh) => ({ 
        data: new Uint8ClampedArray(sw * sh * 4),
        width: sw,
        height: sh
      }),
      putImageData: () => {},
      createImageData: (width, height) => ({ 
        data: new Uint8ClampedArray(width * height * 4),
        width: width,
        height: height
      }),
      measureText: () => ({ width: 100 }),
      fillText: () => {},
      strokeText: () => {},
    };
  }
  return null;
};

// Mock HTMLCanvasElement.transferControlToOffscreen
HTMLCanvasElement.prototype.transferControlToOffscreen = function() {
  return this;
};

// Mock HTMLVideoElement properties
Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  get: function() {
    return this._videoWidth || 1920;
  },
  set: function(value) {
    this._videoWidth = value;
  }
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  get: function() {
    return this._videoHeight || 1080;
  },
  set: function(value) {
    this._videoHeight = value;
  }
});

// Mock navigator if it doesn't exist
if (typeof global.navigator === 'undefined') {
  global.navigator = {};
}

Object.defineProperty(global.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (test)',
  writable: true,
  configurable: true
});

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getDisplayMedia: () => Promise.resolve({})
  },
  writable: true,
  configurable: true
});

// Mock crypto.randomUUID
if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}

if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => {
    return 'test-uuid-' + Math.random().toString(36).substring(2, 15);
  };
}

// Mock document.getElementById for background element
const originalGetElementById = document.getElementById.bind(document);
document.getElementById = function(id) {
  if (id === 'background') {
    const bgElement = document.createElement('div');
    bgElement.id = 'background';
    return bgElement;
  }
  return originalGetElementById(id);
};

// Suppress console warnings in tests (optional)
// global.console.warn = () => {};

