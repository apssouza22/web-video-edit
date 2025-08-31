import { FrameService } from '../../src/frame/frames.js';
import { Frame } from '../../src/frame/frame.js';
import { mockFn } from '../utils/mock-fn.js';

// Mock FrameAdjustHandler
class MockFrameAdjustHandler {
  constructor(frameService) {
    this.frameService = frameService;
  }

  adjust(diff) {
    // Mock implementation - simulate frame adjustment
    if (this.frameService && this.frameService.frames) {
      // Simple mock: just return the diff
      return diff;
    }
    return 0;
  }

  removeInterval(startTime, endTime) {
    // Mock implementation - simulate interval removal
    const duration = endTime - startTime;
    return duration;
  }
}

// Mock fps constant
global.fps = 30;

describe('FrameService', () => {
  let frameService;
  const testDuration = 3000; // 3 seconds
  const testStartTime = 1000; // 1 second

  beforeEach(() => {
    frameService = new FrameService(testDuration, testStartTime, true);
    // Replace the real FrameAdjustHandler with our mock
    frameService.frameAdjustHandler = new MockFrameAdjustHandler(frameService);
  });

  afterEach(() => {
    // Mock functions reset individually
  });

  describe('constructor', () => {
    test('should create instance with correct properties', () => {
      expect(frameService).toBeInstanceOf(FrameService);
      expect(frameService.totalTimeInMilSeconds).toBe(testDuration);
      expect(frameService.totalTimeInSeconds).toBe(testDuration / 1000);
      expect(frameService.start_time).toBe(testStartTime);
      expect(frameService.frames).toBeInstanceOf(Array);
      expect(frameService.timeAdjustHandler).toBeInstanceOf(MockFrameAdjustHandler);
    });

    test('should initialize frames when flexibleLayer is true', () => {
      const expectedFrameCount = (testDuration / 1000) * fps;
      expect(frameService.frames).toHaveLength(expectedFrameCount);
      expect(frameService.frames[0].anchor).toBe(true); // First frame should be anchor
    });

    test('should not initialize frames when flexibleLayer is false', () => {
      const nonFlexibleFrameService = new FrameService(testDuration, testStartTime, false);
      expect(nonFlexibleFrameService.frames).toHaveLength(0);
    });
  });

  describe('adjustTotalTime', () => {
    test('should adjust total time using timeAdjustHandler', () => {
      const diff = 1000; // 1 second
      const originalTime = frameService.totalTimeInMilSeconds;

      frameService.adjustTotalTime(diff);

      expect(frameService.totalTimeInMilSeconds).toBe(originalTime + diff);
      expect(frameService.totalTimeInSeconds).toBe((originalTime + diff) / 1000);
    });

    test('should handle negative adjustment', () => {
      const diff = -500; // -0.5 seconds
      const originalTime = frameService.totalTimeInMilSeconds;

      frameService.adjustTotalTime(diff);

      expect(frameService.totalTimeInMilSeconds).toBe(originalTime + diff);
    });
  });

  describe('getTotalTimeInMilSec', () => {
    test('should return total time in milliseconds', () => {
      expect(frameService.getTotalTimeInMilSec()).toBe(testDuration);
    });
  });

  describe('calculateTotalTimeInMilSec', () => {
    test('should calculate total time based on frames length', () => {
      const expectedTime = frameService.frames.length / fps * 1000;
      expect(frameService.calculateTotalTimeInMilSec()).toBe(expectedTime);
    });
  });

  describe('initializeFrames', () => {
    test('should create correct number of frames', () => {
      frameService.frames = []; // Reset frames
      frameService.initializeFrames();

      const expectedFrameCount = frameService.totalTimeInSeconds * fps;
      expect(frameService.frames).toHaveLength(expectedFrameCount);
    });

    test('should initialize frames with correct default values', () => {
      frameService.frames = []; // Reset frames
      frameService.initializeFrames();

      const firstFrame = frameService.frames[0];
      expect(firstFrame).toBeInstanceOf(Frame);
      expect(firstFrame.x).toBe(0);
      expect(firstFrame.y).toBe(0);
      expect(firstFrame.scale).toBe(1); // scale should be 1
      expect(firstFrame.rotation).toBe(0);
      expect(firstFrame.anchor).toBe(true); // first frame should be anchor
    });
  });

  describe('getLength', () => {
    test('should return frames array length', () => {
      expect(frameService.getLength()).toBe(frameService.frames.length);
    });
  });

  describe('push', () => {
    test('should add frame to frames array', () => {
      const newFrame = new Frame(null, 10, 20, 1.5, 0.5, false);
      const originalLength = frameService.frames.length;

      frameService.push(newFrame);

      expect(frameService.frames).toHaveLength(originalLength + 1);
      expect(frameService.frames[frameService.frames.length - 1]).toBe(newFrame);
    });
  });

  describe('slice', () => {
    test('should remove frames from array', () => {
      const originalLength = frameService.frames.length;
      const start = 5;
      const deleteCount = 3;

      frameService.slice(start, deleteCount);

      expect(frameService.frames).toHaveLength(originalLength - deleteCount);
    });
  });

  describe('setAnchor and isAnchor', () => {
    test('should set and check anchor frames', () => {
      const index = 10;

      frameService.setAnchor(index);
      expect(frameService.isAnchor(index)).toBe(true);
    });

    test('should return falsy for non-anchor frames', () => {
      const index = 10;
      frameService.frames[index].anchor = false;

      expect(frameService.isAnchor(index)).toBe(false);
    });
  });

  describe('getIndex', () => {
    test('should calculate correct frame index', () => {
      const currentTime = testStartTime + 1500; // 1.5 seconds after start
      const expectedIndex = Math.floor(1.5 * fps);

      const index = frameService.getIndex(currentTime, testStartTime);

      expect(index).toBe(expectedIndex);
    });

    test('should handle time before start', () => {
      const currentTime = testStartTime - 500;
      const index = frameService.getIndex(currentTime, testStartTime);

      expect(index).toBeLessThan(0);
    });
  });

  describe('getTime', () => {
    test('should calculate correct time for frame index', () => {
      const index = 30; // 1 second at 30fps
      const expectedTime = (index / fps * 1000) + testStartTime;

      const time = frameService.getTime(index, testStartTime);

      expect(time).toBe(expectedTime);
    });
  });

  describe('lerp', () => {
    test('should perform linear interpolation', () => {
      expect(frameService.lerp(0, 10, 0.5)).toBe(5);
      expect(frameService.lerp(10, 20, 0.25)).toBe(12.5);
      expect(frameService.lerp(5, 15, 0)).toBe(5);
      expect(frameService.lerp(5, 15, 1)).toBe(15);
    });
  });

  describe('interpolateFrame', () => {
    test('should interpolate between two frames', () => {
      const frame1 = new Frame(null, 0, 0, 1, 0, false);
      const frame2 = new Frame(null, 10, 10, 2, 1, false);
      const weight = 0.5;

      const result = frameService.interpolateFrame(frame1, frame2, weight);

      expect(result.x).toBe(5); // x position
      expect(result.y).toBe(5); // y position
      expect(result.scale).toBe(1.5); // scale
      expect(result.rotation).toBe(0.5); // rotation
    });

    test('should clamp weight to valid range', () => {
      const frame1 = new Frame(null, 0, 0, 1, 0, false);
      const frame2 = new Frame(null, 10, 10, 2, 1, false);

      // Test weight > 1
      const result1 = frameService.interpolateFrame(frame1, frame2, 1.5);
      expect(result1.x).toBe(10); // Should use frame2 values

      // Test weight < 0
      const result2 = frameService.interpolateFrame(frame1, frame2, -0.5);
      expect(result2.x).toBe(0); // Should use frame1 values
    });
  });

  describe('getFrame', () => {
    test('should return null for invalid index', () => {
      const invalidTime = testStartTime - 1000;
      const result = frameService.getFrame(invalidTime, testStartTime);

      expect(result).toBeNull();
    });

    test('should return frame for valid time', () => {
      const validTime = testStartTime + 1000; // 1 second after start
      const result = frameService.getFrame(validTime, testStartTime);

      expect(result).toBeInstanceOf(Frame);
    });

    test('should interpolate between frames when needed', () => {
      // Set up specific frames for interpolation test
      const index = 30;
      frameService.frames[index] = new Frame(null, 0, 0, 1, 0, false);
      frameService.frames[index + 1] = new Frame(null, 10, 10, 2, 1, false);

      const time = frameService.getTime(index, testStartTime) + 500; // Halfway between frames
      const result = frameService.getFrame(time, testStartTime);

      // Should be interpolated values
      expect(result.x).toBeGreaterThan(0);
      expect(result.x).toBeLessThan(10);
    });
  });

  describe('removeInterval', () => {
    test('should delegate to timeAdjustHandler', () => {
      const startTime = 1000;
      const endTime = 2000;

      const result = frameService.removeInterval(startTime, endTime);

      expect(result).toBe(endTime - startTime);
    });
  });

  describe('copy', () => {
    test('should return copy of frames array', () => {
      const copy = frameService.copy();

      expect(copy).toEqual(frameService.frames);
      expect(copy).not.toBe(frameService.frames); // Should be different reference
    });
  });

  describe('update', () => {
    test('should update frame at specific index', () => {
      const index = 5;
      const newFrame = new Frame(null, 100, 200, 3, 1.5, true);

      frameService.update(index, newFrame);

      expect(frameService.frames[index]).toBe(newFrame);
    });
  });

  describe('integration tests', () => {
    test('should handle complete frame manipulation workflow', () => {
      // Create a new frame service
      const workflowFrameService = new FrameService(2000, 0, true);

      // Add some frames
      const customFrame = new Frame(null, 50, 50, 2, 0.5, false);
      workflowFrameService.push(customFrame);

      // Set an anchor
      workflowFrameService.setAnchor(10);

      // Get a frame at specific time
      const frame = workflowFrameService.getFrame(500, 0);

      // Verify the workflow
      expect(workflowFrameService.getLength()).toBeGreaterThan(60); // 2 seconds at 30fps + 1 custom
      expect(workflowFrameService.isAnchor(10)).toBe(true);
      expect(frame).toBeInstanceOf(Frame);
    });
  });
});
