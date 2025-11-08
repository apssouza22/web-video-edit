// Global test setup for Jest
// This file is loaded before each test suite runs

// Mock AudioBuffer
class MockAudioBuffer {
  constructor(options) {
    this.numberOfChannels = options.numberOfChannels || 2;
    this.length = options.length > 0 ? options.length : 44100;
    this.sampleRate = options.sampleRate || 44100;
    this.duration = this.length / this.sampleRate;
    
    this._channelData = [];
    for (let i = 0; i < this.numberOfChannels; i++) {
      this._channelData[i] = new Float32Array(this.length);
      for (let j = 0; j < this.length; j++) {
        this._channelData[i][j] = Math.random() * 2 - 1;
      }
    }
  }
  
  getChannelData(channel) {
    if (channel >= this.numberOfChannels) {
      throw new Error(`Channel ${channel} out of range`);
    }
    return this._channelData[channel];
  }
  
  copyToChannel(source, channelNumber, startInChannel = 0) {
    const channelData = this.getChannelData(channelNumber);
    for (let i = 0; i < source.length && startInChannel + i < channelData.length; i++) {
      channelData[startInChannel + i] = source[i];
    }
  }
  
  copyFromChannel(destination, channelNumber, startInChannel = 0) {
    const channelData = this.getChannelData(channelNumber);
    for (let i = 0; i < destination.length && startInChannel + i < channelData.length; i++) {
      destination[i] = channelData[startInChannel + i];
    }
  }
}

// Mock AudioContext
global.AudioContext = class AudioContext {
  constructor(options = {}) {
    this.currentTime = 0;
    this.sampleRate = options.sampleRate || 44100;
    this.state = 'running';
    this.destination = {
      connect: () => {},
      disconnect: () => {},
    };
  }
  
  createBuffer(numberOfChannels, length, sampleRate) {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }
  
  createBufferSource() {
    return {
      buffer: null,
      playbackRate: { value: 1.0 },
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
  
  decodeAudioData(arrayBuffer, successCallback, errorCallback) {
    try {
      // if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      //   const error = new Error('Invalid audio data');
      //   if (errorCallback) {
      //     errorCallback(error);
      //   }
      //   return Promise.reject(error);
      // }
      
      const audioBuffer = new MockAudioBuffer({
        numberOfChannels: 2,
        length: 44100,
        sampleRate: this.sampleRate
      });
      
      if (successCallback) {
        successCallback(audioBuffer);
      }
      return Promise.resolve(audioBuffer);
    } catch (error) {
      if (errorCallback) {
        errorCallback(error);
      }
      return Promise.reject(error);
    }
  }
  
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
  
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
};

global.MockAudioBuffer = MockAudioBuffer;

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

// Mock TextEncoder and TextDecoder (browser APIs not in jsdom)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      const buf = Buffer.from(str, 'utf-8');
      return new Uint8Array(buf);
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    constructor(encoding = 'utf-8') {
      this.encoding = encoding;
    }
    decode(buffer) {
      return Buffer.from(buffer).toString(this.encoding);
    }
  };
}

// Mock PointerEvent
global.PointerEvent = class PointerEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.pointerId = options.pointerId || 1;
    this.width = options.width || 1;
    this.height = options.height || 1;
    this.pressure = options.pressure || 0;
    this.tangentialPressure = options.tangentialPressure || 0;
    this.tiltX = options.tiltX || 0;
    this.tiltY = options.tiltY || 0;
    this.twist = options.twist || 0;
    this.pointerType = options.pointerType || 'mouse';
    this.isPrimary = options.isPrimary !== undefined ? options.isPrimary : true;
    this.clientX = options.clientX || 0;
    this.clientY = options.clientY || 0;
    this.screenX = options.screenX || 0;
    this.screenY = options.screenY || 0;
    this.offsetX = options.offsetX || 0;
    this.offsetY = options.offsetY || 0;
    this.pageX = options.pageX || 0;
    this.pageY = options.pageY || 0;
    this.button = options.button !== undefined ? options.button : 0;
    this.buttons = options.buttons !== undefined ? options.buttons : 0;
    this.ctrlKey = options.ctrlKey || false;
    this.shiftKey = options.shiftKey || false;
    this.altKey = options.altKey || false;
    this.metaKey = options.metaKey || false;
  }
};

// Mock DragEvent
global.DragEvent = class DragEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.dataTransfer = options.dataTransfer || {
      items: [],
      files: [],
      types: [],
      getData: () => '',
      setData: () => {},
      clearData: () => {},
      setDragImage: () => {},
      effectAllowed: 'all',
      dropEffect: 'none'
    };
    this.clientX = options.clientX || 0;
    this.clientY = options.clientY || 0;
    this.screenX = options.screenX || 0;
    this.screenY = options.screenY || 0;
    this.pageX = options.pageX || 0;
    this.pageY = options.pageY || 0;
    this.ctrlKey = options.ctrlKey || false;
    this.shiftKey = options.shiftKey || false;
    this.altKey = options.altKey || false;
    this.metaKey = options.metaKey || false;
  }
};

// Mock ClipboardEvent
global.ClipboardEvent = class ClipboardEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.clipboardData = options.clipboardData || {
      items: [],
      files: [],
      types: [],
      getData: (format) => '',
      setData: (format, data) => {},
      clearData: (format) => {}
    };
  }
};

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

