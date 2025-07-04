// Mock layer classes for testing

import { mockFn } from '../utils/mock-fn.js';

export class MockVideoLayer {
  constructor(file, skipLoad = false) {
    this.file = file;
    this.name = file?.name || 'Mock Video Layer';
    this.id = 'mock-video-layer';
    this.start_time = 0;
    this.totalTimeInMilSeconds = 5000;
    this.width = 1920;
    this.height = 1080;
    this.ready = !skipLoad;
    this.color = '#0066cc';
    this.shadow = false;
    this.canvas = {
      width: 1920,
      height: 1080,
      getContext: mockFn(() => ({}))
    };
    this.ctx = {};
    this.framesCollection = {
      frames: []
    };
    this.audioBuffer = null;
    this.loadUpdateListener = mockFn();
  }

  addLoadUpdateListener(callback) {
    this.loadUpdateListener = callback;
  }
}

export class MockAudioLayer {
  constructor(file, skipLoad = false) {
    this.file = file;
    this.name = file?.name || 'Mock Audio Layer';
    this.id = 'mock-audio-layer';
    this.start_time = 0;
    this.totalTimeInMilSeconds = 5000;
    this.width = 1920;
    this.height = 1080;
    this.ready = !skipLoad;
    this.color = '#ff6600';
    this.shadow = false;
    this.canvas = {
      width: 1920,
      height: 1080,
      getContext: mockFn(() => ({}))
    };
    this.ctx = {};
    this.framesCollection = {
      frames: []
    };
    this.audioBuffer = {
      length: 1024,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: mockFn(() => new Float32Array(1024))
    };
    this.playerAudioContext = {};
    this.loadUpdateListener = mockFn();
  }

  addLoadUpdateListener(callback) {
    this.loadUpdateListener = callback;
  }
}

export class MockImageLayer {
  constructor(file) {
    this.file = file;
    this.name = file?.name || 'Mock Image Layer';
    this.id = 'mock-image-layer';
    this.start_time = 0;
    this.totalTimeInMilSeconds = 5000;
    this.width = 1920;
    this.height = 1080;
    this.ready = true;
    this.color = '#00cc66';
    this.shadow = false;
    this.canvas = {
      width: 1920,
      height: 1080,
      getContext: mockFn(() => ({}))
    };
    this.ctx = {};
    this.framesCollection = {
      frames: []
    };
    this.audioBuffer = null;
    this.loadUpdateListener = mockFn();
  }

  addLoadUpdateListener(callback) {
    this.loadUpdateListener = callback;
  }
}

export class MockTextLayer {
  constructor(name = 'Mock Text Layer') {
    this.name = name;
    this.id = 'mock-text-layer';
    this.start_time = 0;
    this.totalTimeInMilSeconds = 5000;
    this.width = 1920;
    this.height = 1080;
    this.ready = true;
    this.color = '#cc00cc';
    this.shadow = false;
    this.canvas = {
      width: 1920,
      height: 1080,
      getContext: mockFn(() => ({}))
    };
    this.ctx = {};
    this.framesCollection = {
      frames: []
    };
    this.audioBuffer = null;
    this.loadUpdateListener = mockFn();
  }

  addLoadUpdateListener(callback) {
    this.loadUpdateListener = callback;
  }
}

// Global layer class mocks
global.VideoLayer = MockVideoLayer;
global.AudioLayer = MockAudioLayer;
global.ImageLayer = MockImageLayer;
global.TextLayer = MockTextLayer;
