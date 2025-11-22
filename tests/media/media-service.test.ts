import { MediaService } from '@/media/media-service';
import { TextMedia } from '@/media/text';
import { ImageMedia } from '@/media/image';
import { AudioService } from '@/audio';

describe('MediaService', () => {
  let mediaService: MediaService;
  let mockAudioService: AudioService;

  beforeEach(() => {
    mockAudioService = {} as AudioService;
    mediaService = new MediaService(mockAudioService);
  });

  describe('splitMedia', () => {
    describe('TextMedia', () => {
      it('should split text media at specified time', () => {
        // Create a text media with 2000ms duration
        const textMedia = new TextMedia('Test Text');
        textMedia.ready = true;
        textMedia.startTime = 0;
        textMedia.totalTimeInMilSeconds = 2000;

        // Mock frame service with 10 frames
        textMedia.frameService.frames = Array(10).fill(null).map(() => ({
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          anchor: { x: 0, y: 0 }
        }));

        // Split at 1000ms (50% of duration)
        const splitTime = 1000;
        const clonedMedia = mediaService.splitMedia(textMedia, splitTime);

        // Verify the split was successful
        expect(clonedMedia).not.toBeNull();
        expect(clonedMedia?.name).toBe('Test Text [Clone] [Split]');

        // Clone should have frames from 0 to split point (5 frames)
        expect(clonedMedia?.frameService.frames.length).toBe(5);
        expect(clonedMedia?.totalTimeInMilSeconds).toBe(1000);
        expect(clonedMedia?.startTime).toBe(100); // Original startTime + 100ms offset from clone

        // Original should have remaining frames (5 frames)
        expect(textMedia.frameService.frames.length).toBe(5);
        expect(textMedia.totalTimeInMilSeconds).toBe(1000);
        expect(textMedia.startTime).toBe(1000); // Updated to start after clone
      });

      it('should handle split at different percentages', () => {
        const textMedia = new TextMedia('Test Text');
        textMedia.ready = true;
        textMedia.startTime = 1000;
        textMedia.totalTimeInMilSeconds = 4000;

        // Mock frame service with 20 frames
        textMedia.frameService.frames = Array(20).fill(null).map(() => ({
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          anchor: { x: 0, y: 0 }
        }));

        // Split at 3000ms (50% of duration, starting from startTime of 1000ms)
        const splitTime = 3000;
        const clonedMedia = mediaService.splitMedia(textMedia, splitTime);

        expect(clonedMedia).not.toBeNull();

        // Clone should have 10 frames (50% of 20)
        expect(clonedMedia?.frameService.frames.length).toBe(10);
        expect(clonedMedia?.totalTimeInMilSeconds).toBe(2000); // 50% of 4000ms

        // Original should have 10 frames (remaining 50%)
        expect(textMedia.frameService.frames.length).toBe(10);
        expect(textMedia.totalTimeInMilSeconds).toBe(2000);
        expect(textMedia.startTime).toBe(3000); // 1000 + 2000
      });
    });

    describe('ImageMedia', () => {
      it('should split image media at specified time', () => {
        // Create a mock file for image media
        const mockFile = new File([''], 'test.png', { type: 'image/png' });
        const imageMedia = new ImageMedia(mockFile);

        // Manually set up the image media (since we can't load actual images in tests)
        imageMedia.ready = true;
        imageMedia.startTime = 0;
        imageMedia.totalTimeInMilSeconds = 3000;

        // Mock frame service with 15 frames
        imageMedia.frameService.frames = Array(15).fill(null).map(() => ({
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          anchor: { x: 0, y: 0 }
        }));

        // Split at 1500ms (50% of duration)
        const splitTime = 1500;
        const clonedMedia = mediaService.splitMedia(imageMedia, splitTime);

        // Verify the split was successful
        expect(clonedMedia).not.toBeNull();
        expect(clonedMedia?.name).toContain('[Clone]');
        expect(clonedMedia?.name).toContain('[Split]');

        // Clone should have frames from 0 to split point (~7-8 frames)
        expect(clonedMedia?.frameService.frames.length).toBeCloseTo(7.5, 0);
        expect(clonedMedia?.totalTimeInMilSeconds).toBe(1500);

        // Original should have remaining frames (~7-8 frames)
        expect(imageMedia.frameService.frames.length).toBeCloseTo(7.5, 0);
        expect(imageMedia.totalTimeInMilSeconds).toBe(1500);
        expect(imageMedia.startTime).toBe(1500);
      });

      it('should return null if media is not ready', () => {
        const mockFile = new File([''], 'test.png', { type: 'image/png' });
        const imageMedia = new ImageMedia(mockFile);

        // Don't set ready to true
        imageMedia.ready = false;

        const splitTime = 1000;
        const clonedMedia = mediaService.splitMedia(imageMedia, splitTime);

        // Should return null because media is not ready
        expect(clonedMedia).toBeNull();
      });
    });

    describe('Edge Cases', () => {
      it('should handle split at the beginning of media', () => {
        const textMedia = new TextMedia('Test Text');
        textMedia.ready = true;
        textMedia.startTime = 1000;
        textMedia.totalTimeInMilSeconds = 2000;

        textMedia.frameService.frames = Array(10).fill(null).map(() => ({
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          anchor: { x: 0, y: 0 }
        }));

        // Split at the very start (1000ms = startTime)
        const splitTime = 1000;
        const clonedMedia = mediaService.splitMedia(textMedia, splitTime);

        expect(clonedMedia).not.toBeNull();

        // Clone should have 0 frames
        expect(clonedMedia?.frameService.frames.length).toBe(0);
        expect(clonedMedia?.totalTimeInMilSeconds).toBe(0);

        // Original should have all frames
        expect(textMedia.frameService.frames.length).toBe(10);
      });

      it('should handle split at the end of media', () => {
        const textMedia = new TextMedia('Test Text');
        textMedia.ready = true;
        textMedia.startTime = 1000;
        textMedia.totalTimeInMilSeconds = 2000;

        textMedia.frameService.frames = Array(10).fill(null).map(() => ({
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          anchor: { x: 0, y: 0 }
        }));

        // Split at the very end (3000ms = startTime + totalTime)
        const splitTime = 3000;
        const clonedMedia = mediaService.splitMedia(textMedia, splitTime);

        expect(clonedMedia).not.toBeNull();

        // Clone should have all frames
        expect(clonedMedia?.frameService.frames.length).toBe(10);
        expect(clonedMedia?.totalTimeInMilSeconds).toBe(2000);

        // Original should have 0 frames remaining
        expect(textMedia.frameService.frames.length).toBe(0);
        expect(textMedia.totalTimeInMilSeconds).toBe(0);
      });
    });
  });
});
