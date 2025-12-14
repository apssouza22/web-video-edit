import { describe, expect, jest, test, beforeEach, afterEach } from '@jest/globals';

// Mock the demuxer classes
jest.unstable_mockModule('@/video/demux/mediabunny-demuxer', () => ({
  MediaBunnyDemuxer: jest.fn().mockImplementation(() => ({
    setOnProgressCallback: jest.fn(),
    setOnCompleteCallback: jest.fn(),
    initialize: jest.fn(),
    cleanup: jest.fn(),
  })),
}));

jest.unstable_mockModule('@/video/demux/mp4boxdemuxer/codec-demuxer', () => ({
  CodecDemuxer: jest.fn().mockImplementation(() => ({
    setOnProgressCallback: jest.fn(),
    setOnCompleteCallback: jest.fn(),
    initialize: jest.fn(),
    cleanup: jest.fn(),
  })),
}));

jest.unstable_mockModule('@/video/demux/htmldemuxer/html-video-demuxer', () => ({
  HTMLVideoDemuxer: jest.fn().mockImplementation(() => ({
    setOnProgressCallback: jest.fn(),
    setOnCompleteCallback: jest.fn(),
    initialize: jest.fn(),
    cleanup: jest.fn(),
  })),
}));

// Import after mocking
const { createDemuxer, VideoDemuxService } = await import('@/video/demux');

describe('createDemuxer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should create and return a VideoDemuxService instance', () => {
    const demuxer = createDemuxer();

    expect(demuxer).toBeInstanceOf(VideoDemuxService);
  });

  test('should return instance with setOnProgressCallback method', () => {
    const demuxer = createDemuxer();

    expect(demuxer.setOnProgressCallback).toBeDefined();
    expect(typeof demuxer.setOnProgressCallback).toBe('function');
  });

  test('should return instance with setOnCompleteCallback method', () => {
    const demuxer = createDemuxer();

    expect(demuxer.setOnCompleteCallback).toBeDefined();
    expect(typeof demuxer.setOnCompleteCallback).toBe('function');
  });

  test('should return instance with initDemux method', () => {
    const demuxer = createDemuxer();

    expect(demuxer.initDemux).toBeDefined();
    expect(typeof demuxer.initDemux).toBe('function');
  });

  test('should return instance with cleanup method', () => {
    const demuxer = createDemuxer();

    expect(demuxer.cleanup).toBeDefined();
    expect(typeof demuxer.cleanup).toBe('function');
  });

  test('should create new instance on each call', () => {
    const demuxer1 = createDemuxer();
    const demuxer2 = createDemuxer();

    expect(demuxer1).not.toBe(demuxer2);
  });

  test('should create multiple independent instances', () => {
    const demuxer1 = createDemuxer();
    const demuxer2 = createDemuxer();
    const demuxer3 = createDemuxer();

    expect(demuxer1).toBeInstanceOf(VideoDemuxService);
    expect(demuxer2).toBeInstanceOf(VideoDemuxService);
    expect(demuxer3).toBeInstanceOf(VideoDemuxService);
    
    expect(demuxer1).not.toBe(demuxer2);
    expect(demuxer2).not.toBe(demuxer3);
    expect(demuxer1).not.toBe(demuxer3);
  });

  test('should create instance with working callback registration', () => {
    const demuxer = createDemuxer();
    const mockCallback = jest.fn();

    expect(() => {
      demuxer.setOnProgressCallback(mockCallback);
      demuxer.setOnCompleteCallback(mockCallback);
    }).not.toThrow();
  });

  test('should create instance that can be cleaned up', () => {
    const demuxer = createDemuxer();

    expect(() => {
      demuxer.cleanup();
    }).not.toThrow();
  });

  test('should handle multiple cleanup calls on created instance', () => {
    const demuxer = createDemuxer();

    expect(() => {
      demuxer.cleanup();
      demuxer.cleanup();
      demuxer.cleanup();
    }).not.toThrow();
  });
});
