import {afterEach, beforeEach, describe, expect, jest, test} from '@jest/globals';

// Use dynamic imports for ESM
const {MediaOps} = await import('../../src/studio/media-ops');
const {VideoMedia} = await import("../../src/media/video");

describe('ControlsHandler', () => {
  let mockStudio: any;
  let mockMediaService: any;
  let mockStudioState: any;
  // @ts-ignore
  let controlsHandler: MediaOps;

  beforeEach(() => {
    mockStudioState = {
      getSelectedMedia: jest.fn(),
      getPlayingTime: jest.fn(() => 5000),
      getMediaAudio: jest.fn(() => []),
      getMediaVideo: jest.fn(() => [])
    };

    mockMediaService = {
      removeAudioInterval: jest.fn(),
      removeVideoInterval: jest.fn(),
      splitMedia: jest.fn()
    };

    mockStudio = {
      addLayer: jest.fn(),
      mediaService: mockMediaService
    };

    controlsHandler = new MediaOps(mockStudio, mockMediaService, mockStudioState);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should create instance with dependencies', () => {
      expect(controlsHandler).toBeDefined();
    });
  });

  describe('removeInterval', () => {
    test('should remove audio and video intervals', () => {
      const startTime = 1000;
      const endTime = 3000;
      const audioLayers = [{id: '1', type: 'audio'}];
      const videoLayers = [{id: '2', type: 'video'}];

      mockStudioState.getMediaAudio.mockReturnValue(audioLayers);
      mockStudioState.getMediaVideo.mockReturnValue(videoLayers);

      controlsHandler.removeInterval(startTime, endTime);

      expect(mockMediaService.removeAudioInterval).toHaveBeenCalledWith(
          startTime,
          endTime,
          audioLayers
      );
      expect(mockMediaService.removeVideoInterval).toHaveBeenCalledWith(
          startTime,
          endTime,
          videoLayers
      );
    });

    test('should reject negative start time', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      controlsHandler.removeInterval(-100, 3000);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Invalid time interval provided:',
          -100,
          3000
      );
      expect(mockMediaService.removeAudioInterval).not.toHaveBeenCalled();
      expect(mockMediaService.removeVideoInterval).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('should reject end time less than or equal to start time', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      controlsHandler.removeInterval(3000, 3000);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockMediaService.removeAudioInterval).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('should reject end time less than start time', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      controlsHandler.removeInterval(5000, 3000);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockMediaService.removeAudioInterval).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('should handle zero start time', () => {
      controlsHandler.removeInterval(0, 1000);

      expect(mockMediaService.removeAudioInterval).toHaveBeenCalledWith(
          0,
          1000,
          expect.any(Array)
      );
    });

    test('should log removal message', () => {
      // @ts-ignore
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      controlsHandler.removeInterval(1000, 3000);

      expect(consoleLogSpy).toHaveBeenCalledWith(
          'Removing interval from 1000 to 3000 seconds'
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('split', () => {
    let mockVideoLayer: any;

    beforeEach(() => {
      mockVideoLayer = new VideoMedia(new File([], 'video.mp4'), true);
    });

    test('should not split when no layer is selected', () => {
      mockStudioState.getSelectedMedia.mockReturnValue(null);

      controlsHandler.split();

      expect(mockMediaService.splitMedia).not.toHaveBeenCalled();
    });

    test('should not split non-video/audio layers', () => {
      const textLayer = {
        id: 'text-1',
        type: 'TextMedia',
        ready: true,
        start_time: 0,
        totalTimeInMilSeconds: 5000
      };
      mockStudioState.getSelectedMedia.mockReturnValue(textLayer);

      controlsHandler.split();

      expect(mockMediaService.splitMedia).not.toHaveBeenCalled();
    });

    test('should not split layer that is not ready', () => {
      mockVideoLayer.ready = false;
      mockStudioState.getSelectedMedia.mockReturnValue(mockVideoLayer);

      controlsHandler.split();

      expect(mockMediaService.splitMedia).not.toHaveBeenCalled();
    });

    test('should not split when current time is before layer start', () => {
      mockVideoLayer.start_time = 6000;
      mockStudioState.getPlayingTime.mockReturnValue(5000);
      mockStudioState.getSelectedMedia.mockReturnValue(mockVideoLayer);

      controlsHandler.split();

      expect(mockMediaService.splitMedia).not.toHaveBeenCalled();
    });

    test('should not split when current time is after layer end', () => {
      mockVideoLayer.start_time = 0;
      mockVideoLayer.totalTimeInMilSeconds = 5000;
      mockStudioState.getPlayingTime.mockReturnValue(6000);
      mockStudioState.getSelectedMedia.mockReturnValue(mockVideoLayer);

      controlsHandler.split();

      expect(mockMediaService.splitMedia).not.toHaveBeenCalled();
    });


  });

  describe('edge cases', () => {
    test('should handle undefined selected media gracefully', () => {
      mockStudioState.getSelectedMedia.mockReturnValue(undefined);

      expect(() => {
        controlsHandler.split();
      }).not.toThrow();
    });

    test('should handle missing totalTimeInMilSeconds', () => {
      const incompleteLayer = {
        id: 'video-1',
        type: 'VideoLayer',
        ready: true,
        start_time: 0
      };
      mockStudioState.getSelectedMedia.mockReturnValue(incompleteLayer);

      expect(() => {
        controlsHandler.split();
      }).not.toThrow();
    });

    test('should handle zero duration layer', () => {
      const zeroLayer = {
        id: 'video-1',
        type: 'VideoLayer',
        ready: true,
        start_time: 5000,
        totalTimeInMilSeconds: 0
      };
      mockStudioState.getSelectedMedia.mockReturnValue(zeroLayer);
      mockStudioState.getPlayingTime.mockReturnValue(5000);

      controlsHandler.split();

      expect(mockMediaService.splitMedia).not.toHaveBeenCalled();
    });

    test('should handle empty audio and video arrays', () => {
      mockStudioState.getMediaAudio.mockReturnValue([]);
      mockStudioState.getMediaVideo.mockReturnValue([]);

      controlsHandler.removeInterval(1000, 3000);

      expect(mockMediaService.removeAudioInterval).toHaveBeenCalledWith(1000, 3000, []);
      expect(mockMediaService.removeVideoInterval).toHaveBeenCalledWith(1000, 3000, []);
    });

    test('should handle very large time values', () => {
      const largeTime = Number.MAX_SAFE_INTEGER - 1000;

      controlsHandler.removeInterval(0, largeTime);

      expect(mockMediaService.removeAudioInterval).toHaveBeenCalledWith(
          0,
          largeTime,
          expect.any(Array)
      );
    });

    test('should handle floating point time values', () => {
      controlsHandler.removeInterval(1.5, 3.7);

      expect(mockMediaService.removeAudioInterval).toHaveBeenCalledWith(
          1.5,
          3.7,
          expect.any(Array)
      );
    });
  });

  describe('integration', () => {

    test('should handle complete remove interval workflow', () => {
      const audioLayers = [{id: 'audio-1'}, {id: 'audio-2'}];
      const videoLayers = [{id: 'video-1'}];

      mockStudioState.getMediaAudio.mockReturnValue(audioLayers);
      mockStudioState.getMediaVideo.mockReturnValue(videoLayers);

      controlsHandler.removeInterval(2000, 4000);

      expect(mockMediaService.removeAudioInterval).toHaveBeenCalledWith(
          2000,
          4000,
          audioLayers
      );
      expect(mockMediaService.removeVideoInterval).toHaveBeenCalledWith(
          2000,
          4000,
          videoLayers
      );
    });
  });
});

