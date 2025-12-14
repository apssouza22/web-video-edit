import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { DemuxWorkerResponse } from '@/video/demux/demux-worker-types';

class MockWorker {
  private listeners: Map<string, Function[]> = new Map();
  postMessageMock = jest.fn();

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

  terminate(): void {}

  simulateMessage(data: DemuxWorkerResponse): void {
    const messageListeners = this.listeners.get('message') || [];
    const event = { data } as MessageEvent;
    messageListeners.forEach(listener => listener(event));
  }
}

const mockClose = jest.fn();
const createMockVideoFrame = (timestamp: number): VideoFrame => ({
  timestamp,
  codedWidth: 1920,
  codedHeight: 1080,
  close: mockClose,
} as unknown as VideoFrame);

const { WorkerVideoStreaming } = await import('@/video/demux/worker-video-streaming');

describe('WorkerVideoStreaming', () => {
  let mockWorker: MockWorker;
  let streaming: InstanceType<typeof WorkerVideoStreaming>;
  const timestamps = [0, 0.033, 0.066, 0.099, 0.132];

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorker = new MockWorker();
    streaming = new WorkerVideoStreaming(mockWorker as unknown as Worker, timestamps);
  });

  afterEach(() => {
    streaming.cleanup();
  });

  describe('getFrameAtIndex', () => {
    test('should return null for invalid index (negative)', async () => {
      const frame = await streaming.getFrameAtIndex(-1);
      expect(frame).toBeNull();
    });

    test('should return null for invalid index (out of bounds)', async () => {
      const frame = await streaming.getFrameAtIndex(100);
      expect(frame).toBeNull();
    });

    test('should request frame from worker', async () => {
      const framePromise = streaming.getFrameAtIndex(2);

      expect(mockWorker.postMessageMock).toHaveBeenCalledWith({
        type: 'get-frame',
        index: 2,
      });

      const mockFrame = createMockVideoFrame(0.066);
      mockWorker.simulateMessage({
        type: 'frame',
        index: 2,
        frame: mockFrame,
      });

      const frame = await framePromise;
      expect(frame).toBe(mockFrame);
    });

    test('should return cached frame on subsequent requests', async () => {
      const framePromise1 = streaming.getFrameAtIndex(1);

      const mockFrame = createMockVideoFrame(0.033);
      mockWorker.simulateMessage({
        type: 'frame',
        index: 1,
        frame: mockFrame,
      });

      await framePromise1;

      mockWorker.postMessageMock.mockClear();

      const frame2 = await streaming.getFrameAtIndex(1);
      expect(frame2).toBe(mockFrame);
      expect(mockWorker.postMessageMock).not.toHaveBeenCalled();
    });

    test('should handle null frame response', async () => {
      const framePromise = streaming.getFrameAtIndex(3);

      mockWorker.simulateMessage({
        type: 'frame',
        index: 3,
        frame: null,
      });

      const frame = await framePromise;
      expect(frame).toBeNull();
    });
  });

  describe('cleanup', () => {
    test('should send cleanup message to worker', () => {
      streaming.cleanup();
      expect(mockWorker.postMessageMock).toHaveBeenCalledWith({ type: 'cleanup' });
    });

    test('should clear pending requests', async () => {
      const framePromise = streaming.getFrameAtIndex(0);

      streaming.cleanup();

      mockWorker.simulateMessage({
        type: 'frame',
        index: 0,
        frame: createMockVideoFrame(0),
      });
    });
  });

  describe('prefetching', () => {
    test('should prefetch next frames after getting a frame', async () => {
      const framePromise = streaming.getFrameAtIndex(0);

      const mockFrame = createMockVideoFrame(0);
      mockWorker.simulateMessage({
        type: 'frame',
        index: 0,
        frame: mockFrame,
      });

      await framePromise;

      await new Promise(resolve => setTimeout(resolve, 50));

      const calls = mockWorker.postMessageMock.mock.calls;
      const prefetchCalls = calls.filter(call => call[0].type === 'get-frame' && call[0].index > 0);
      expect(prefetchCalls.length).toBeGreaterThan(0);
    });
  });
});

