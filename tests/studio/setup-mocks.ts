/**
 * Centralized mocks for Studio package tests
 * 
 * ⚠️ IMPORTANT: Jest's module mocking system requires jest.mock() calls to be in the
 * same file as the tests for proper hoisting. This file serves as a REFERENCE for
 * mock implementations.
 * 
 * For tests that import VideoStudio or other components that have heavy dependencies,
 * you MUST copy the relevant jest.mock() calls directly into your test file BEFORE
 * any imports of the code under test.
 * 
 * Example:
 * ```typescript
 * // At the top of your test file:
 * import { jest } from '@jest/globals';
 * 
 * jest.mock('@/timeline', () => ({ ... }));  // Copy from here
 * jest.mock('@/canvas', () => ({ ... }));    // Copy from here
 * 
 * import { VideoStudio } from '@/studio/studio';  // Now import
 * ```
 * 
 * For simpler components that don't have many dependencies, you can still import
 * this file, but be aware the mocks may not work as expected.
 */

import { jest } from '@jest/globals';

// Mock @/canvas package
jest.mock('@/canvas', () => ({
  createVideoCanvas: jest.fn(() => ({
    mount: jest.fn(),
    width: 1920,
    height: 1080,
    time: 0,
    total_time: 0,
    playing: false,
    audioContext: {
      createBufferSource: jest.fn(),
      createGain: jest.fn(),
      destination: {}
    },
    layers: [],
    addMedias: jest.fn(),
    setSelectedLayer: jest.fn(),
    render: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    resize: jest.fn()
  })),
  VideoCanvas: jest.fn()
}));

// Mock @/timeline package
jest.mock('@/timeline', () => ({
  createTimeline: jest.fn(() => ({
    selectedLayer: null,
    addLayers: jest.fn(),
    render: jest.fn(),
    resize: jest.fn(),
    setSelectedLayer: jest.fn()
  })),
  Timeline: jest.fn()
}));

// Mock @/media package
jest.mock('@/media', () => ({
  createMediaService: jest.fn((callback) => ({
    clone: jest.fn((layer) => ({ ...layer, id: layer.id + '-clone' })),
    splitMedia: jest.fn(),
    removeAudioInterval: jest.fn(),
    removeVideoInterval: jest.fn()
  })),
  createMediaFromFile: jest.fn((file, callback) => {
    const mockLayer = {
      id: Math.random().toString(36),
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 
            file.type.startsWith('audio/') ? 'audio' : 
            file.type.startsWith('image/') ? 'image' : 'unknown',
      start_time: 0,
      totalTimeInMilSeconds: 5000,
      init: jest.fn(),
      addLoadUpdateListener: jest.fn(),
      dump: jest.fn(() => ({ id: mockLayer.id }))
    };
    // Simulate async loading
    setTimeout(() => callback?.(mockLayer, 100, null, null), 0);
    return [mockLayer];
  }),
  createMediaText: jest.fn((text, callback) => ({
    id: Math.random().toString(36),
    name: text,
    type: 'text',
    start_time: 0,
    totalTimeInMilSeconds: 3000,
    init: jest.fn(),
    addLoadUpdateListener: jest.fn(),
    dump: jest.fn(() => ({ type: 'TextLayer', name: text }))
  })),
  MediaService: jest.fn(),
  AbstractMedia: jest.fn(),
  isMediaVideo: jest.fn((layer) => layer?.type === 'VideoLayer' || layer?.constructor?.name === 'VideoLayer'),
  isMediaAudio: jest.fn((layer) => layer?.type === 'AudioLayer' || layer?.constructor?.name === 'AudioLayer')
}));

// Mock @/video/muxer package
jest.mock('@/video/muxer', () => ({
  createVideoMuxer: jest.fn(() => ({
    export: jest.fn((progressCallback, completionCallback) => {
      // Simulate export progress
      progressCallback?.(50);
      setTimeout(() => {
        progressCallback?.(100);
        completionCallback?.();
      }, 100);
    })
  })),
  VideoExportService: jest.fn()
}));

// Mock @/transcription package
jest.mock('@/transcription', () => ({
  createTranscriptionService: jest.fn(() => ({
    loadModel: jest.fn(() => Promise.resolve()),
    startTranscription: jest.fn((audioBuffer) => Promise.resolve({
      text: 'Mock transcription',
      chunks: []
    }))
  })),
  TranscriptionService: jest.fn()
}));

// Mock @/frame package
jest.mock('@/frame', () => ({
  Frame: class Frame {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.scale = 1;
      this.rotation = 0;
    }
    static fromArray(arr: Float32Array) {
      const frame = new Frame();
      frame.x = arr[6] || 0;
      frame.y = arr[7] || 0;
      return frame;
    }
  },
  Frames: jest.fn()
}));

// Mock @/common/render-2d
jest.mock('@/common/render-2d', () => ({
  ESRenderingContext2D: jest.fn(),
  createRenderingContext: jest.fn(() => ({
    canvas: document.createElement('canvas'),
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn()
  }))
}));


export {};

