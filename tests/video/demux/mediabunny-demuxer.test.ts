import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { DemuxWorkerResponse } from '@/video/demux/demux-worker-types';

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private listeners: Map<string, Function[]> = new Map();
  postMessageMock = jest.fn();
  terminateMock = jest.fn();

  constructor(url: URL, options?: WorkerOptions) {}

  addEventListener(type: string, listener: Function): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  postMessage(message: any, transfer?: Transferable[]): void {
    this.postMessageMock(message, transfer);
  }

  terminate(): void {
    this.terminateMock();
  }

  simulateMessage(data: DemuxWorkerResponse): void {
    const messageListeners = this.listeners.get('message') || [];
    const event = { data } as MessageEvent;
    messageListeners.forEach(listener => listener(event));
  }

  simulateError(error: Error): void {
    const errorListeners = this.listeners.get('error') || [];
    const event = { message: error.message, error } as ErrorEvent;
    errorListeners.forEach(listener => listener(event));
  }
}

let mockWorkerInstance: MockWorker;

jest.unstable_mockModule('@/common/render-2d', () => ({
  Canvas2DRender: jest.fn(),
}));

jest.unstable_mockModule('@/common/studio-state', () => ({
  StudioState: {
    getInstance: jest.fn(() => ({
      setMinVideoSizes: jest.fn(),
    })),
  },
}));

const originalWorker = global.Worker;
const { MediaBunnyDemuxer } = await import('@/video/demux/mediabunny-demuxer');
const { Canvas2DRender } = await import('@/common/render-2d');
const { WorkerVideoStreaming } = await import('@/video/demux/worker-video-streaming');

describe('MediaBunnyDemuxer', () => {
  let demuxer: MediaBunnyDemuxer;
  let mockRenderer: jest.Mocked<typeof Canvas2DRender>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWorkerInstance = new MockWorker(new URL(''));

    // @ts-ignore
    global.Worker = jest.fn().mockImplementation(() => mockWorkerInstance);

    demuxer = new MediaBunnyDemuxer();

    mockRenderer = {
      context: {
        clearRect: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest.fn().mockReturnValue({
          data: new Uint8ClampedArray(1920 * 1080 * 4),
          width: 1920,
          height: 1080,
        }),
      },
      canvas: {
        width: 1920,
        height: 1080,
      },
    } as any;
  });

  afterEach(() => {
    demuxer.cleanup();
    global.Worker = originalWorker;
    jest.restoreAllMocks();
  });

  describe('callback setters', () => {
    test('should set progress callback', () => {
      const callback = jest.fn();
      demuxer.setOnProgressCallback(callback);
      expect(demuxer['onProgressCallback']).toBe(callback);
    });

    test('should set complete callback', () => {
      const callback = jest.fn();
      demuxer.setOnCompleteCallback(callback);
      expect(demuxer['onCompleteCallback']).toBe(callback);
    });

    test('should set target FPS', () => {
      demuxer.setTargetFps(60);
      expect(demuxer['targetFps']).toBe(60);
    });

    test('should handle multiple callback updates', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      demuxer.setOnProgressCallback(callback1);
      demuxer.setOnProgressCallback(callback2);

      expect(demuxer['onProgressCallback']).toBe(callback2);
    });

    test('should allow setting different target FPS values', () => {
      demuxer.setTargetFps(24);
      expect(demuxer['targetFps']).toBe(24);

      demuxer.setTargetFps(30);
      expect(demuxer['targetFps']).toBe(30);

      demuxer.setTargetFps(60);
      expect(demuxer['targetFps']).toBe(60);
    });
  });

  describe('initialization', () => {
    test('should create worker and send initialize message', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

      const initPromise = demuxer.initialize(mockFile, mockRenderer);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWorkerInstance.postMessageMock).toHaveBeenCalledWith({
        type: 'initialize',
        file: mockFile,
        targetFps: 24,
      });

      mockWorkerInstance.simulateMessage({
        type: 'metadata',
        width: 1920,
        height: 1080,
        totalTimeInMilSeconds: 10000,
      });

      mockWorkerInstance.simulateMessage({
        type: 'progress',
        progress: 50,
      });

      mockWorkerInstance.simulateMessage({
        type: 'complete',
        timestamps: [0, 0.033, 0.066],
      });

      await initPromise;
    });

    test('should throw error when worker sends error message', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

      const initPromise = demuxer.initialize(mockFile, mockRenderer);

      await new Promise(resolve => setTimeout(resolve, 10));

      mockWorkerInstance.simulateMessage({
        type: 'error',
        message: 'No video track found in the file',
      });

      await expect(initPromise).rejects.toThrow('No video track found in the file');
    });

    test('should handle worker errors gracefully', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

      const initPromise = demuxer.initialize(mockFile, mockRenderer);

      await new Promise(resolve => setTimeout(resolve, 10));

      mockWorkerInstance.simulateError(new Error('Worker crashed'));

      await expect(initPromise).rejects.toThrow('Worker crashed');
      expect(demuxer['isProcessing']).toBe(false);
    });
  });

  describe('cleanup', () => {
    test('should cleanup resources and terminate worker', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

      const initPromise = demuxer.initialize(mockFile, mockRenderer);

      await new Promise(resolve => setTimeout(resolve, 10));

      mockWorkerInstance.simulateMessage({
        type: 'metadata',
        width: 1920,
        height: 1080,
        totalTimeInMilSeconds: 10000,
      });

      mockWorkerInstance.simulateMessage({
        type: 'complete',
        timestamps: [0, 0.033, 0.066],
      });

      await initPromise;

      demuxer.cleanup();

      expect(mockWorkerInstance.postMessageMock).toHaveBeenCalledWith({ type: 'cleanup' });
      expect(mockWorkerInstance.terminateMock).toHaveBeenCalled();
      expect(demuxer['isProcessing']).toBe(false);
      expect(demuxer['worker']).toBeNull();
    });
  });

  describe('message handling', () => {
    test('should store metadata when metadata message received', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });

      const initPromise = demuxer.initialize(mockFile, mockRenderer);

      await new Promise(resolve => setTimeout(resolve, 10));

      mockWorkerInstance.simulateMessage({
        type: 'metadata',
        width: 1920,
        height: 1080,
        totalTimeInMilSeconds: 10000,
      });

      expect(demuxer['metadata']).toEqual({
        width: 1920,
        height: 1080,
        totalTimeInMilSeconds: 10000,
      });

      mockWorkerInstance.simulateMessage({
        type: 'complete',
        timestamps: [0],
      });

      await initPromise;
    });

    test('should call progress callback when progress message received', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      const progressCallback = jest.fn();
      demuxer.setOnProgressCallback(progressCallback);

      const initPromise = demuxer.initialize(mockFile, mockRenderer);

      await new Promise(resolve => setTimeout(resolve, 10));

      mockWorkerInstance.simulateMessage({
        type: 'progress',
        progress: 50,
      });

      mockWorkerInstance.simulateMessage({
        type: 'progress',
        progress: 100,
      });

      mockWorkerInstance.simulateMessage({
        type: 'complete',
        timestamps: [0, 0.033],
      });

      await initPromise;

      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    test('should call complete callback with WorkerVideoStreaming and metadata when complete message received', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      const completeCallback = jest.fn();
      demuxer.setOnCompleteCallback(completeCallback);

      const initPromise = demuxer.initialize(mockFile, mockRenderer);

      await new Promise(resolve => setTimeout(resolve, 10));

      mockWorkerInstance.simulateMessage({
        type: 'metadata',
        width: 1920,
        height: 1080,
        totalTimeInMilSeconds: 10000,
      });

      mockWorkerInstance.simulateMessage({
        type: 'complete',
        timestamps: [0, 0.033, 0.066, 0.099, 0.132],
      });

      await initPromise;

      expect(completeCallback).toHaveBeenCalled();
      expect(completeCallback).toHaveBeenCalledWith(
        expect.any(WorkerVideoStreaming),
        { width: 1920, height: 1080, totalTimeInMilSeconds: 10000 }
      );
    });
  });

  describe('target FPS handling', () => {
    test('should pass target FPS to worker', async () => {
      const mockFile = new File(['video data'], 'test.mp4', { type: 'video/mp4' });
      demuxer.setTargetFps(60);

      const initPromise = demuxer.initialize(mockFile, mockRenderer);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWorkerInstance.postMessageMock).toHaveBeenCalledWith({
        type: 'initialize',
        file: mockFile,
        targetFps: 60,
      });

      mockWorkerInstance.simulateMessage({
        type: 'complete',
        timestamps: [],
      });

      await initPromise;
    });
  });
});
