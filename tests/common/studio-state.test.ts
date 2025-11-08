import {beforeEach, describe, expect, test} from '@jest/globals';

// Use dynamic imports for ESM
const {StudioState, studioState} = await import('@/common/studio-state');
const {AbstractMedia} = await import('@/media');
const {AudioMedia} = await import("../../src/media/audio");
const {VideoMedia} = await import("../../src/media/video");

// Simple mock media classes for testing
// Note: These won't work with isMediaVideo/isMediaAudio which use instanceof checks
class MockMedia extends AbstractMedia {
  constructor(id: string, name: string, type: 'video' | 'audio' | 'image') {
    super();
    this.id = id;
    this.name = name;
    // For audio media, set audioBuffer to make it identifiable
    if (type === 'audio') {
      this.audioBuffer = {} as AudioBuffer;
    }
  }
}

describe('StudioState', () => {
  let state: StudioState;

  beforeEach(() => {
    state = StudioState.getInstance();
    (state as any).medias = [];
    (state as any).selectedMedia = null;
    (state as any).isPlaying = false;
    (state as any).playingTime = 0;
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = StudioState.getInstance();
      const instance2 = StudioState.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    test('should share state across instances', () => {
      const instance1 = StudioState.getInstance();
      const instance2 = StudioState.getInstance();
      
      const mockMedia = new MockMedia('media-1', 'Test Media', 'video');
      instance1.addMedia(mockMedia);
      
      expect(instance2.getMedias()).toContain(mockMedia);
    });
  });

  describe('Playing State', () => {
    test('should get and set playing state', () => {
      expect(state.getIsPlaying()).toBe(false);
      
      state.setPlaying(true);
      expect(state.getIsPlaying()).toBe(true);
      
      state.setPlaying(false);
      expect(state.getIsPlaying()).toBe(false);
    });

    test('should get and set playing time', () => {
      expect(state.getPlayingTime()).toBe(0);
      
      state.setPlayingTime(100);
      expect(state.getPlayingTime()).toBe(100);
      
      state.setPlayingTime(500.5);
      expect(state.getPlayingTime()).toBe(500.5);
    });
  });

  describe('Media Management', () => {
    test('should add media', () => {
      const media1 = new MockMedia('media-1', 'Video 1', 'video');
      const media2 = new MockMedia('media-2', 'Video 2', 'video');
      
      state.addMedia(media1);
      state.addMedia(media2);
      
      const medias = state.getMedias();
      expect(medias).toHaveLength(2);
      expect(medias).toContain(media1);
      expect(medias).toContain(media2);
    });

    test('should get all medias', () => {
      expect(state.getMedias()).toEqual([]);
      
      const media1 = new MockMedia('media-1', 'Video 1', 'video');
      const media2 = new MockMedia('media-2', 'Audio 1', 'audio');
      
      state.addMedia(media1);
      state.addMedia(media2);
      
      expect(state.getMedias()).toEqual([media1, media2]);
    });

    test('should get media by id', () => {
      const media1 = new MockMedia('media-1', 'Video 1', 'video');
      const media2 = new MockMedia('media-2', 'Audio 1', 'audio');
      
      state.addMedia(media1);
      state.addMedia(media2);
      
      expect(state.getMediaById('media-1')).toBe(media1);
      expect(state.getMediaById('media-2')).toBe(media2);
    });

    test('should return null for non-existent media id', () => {
      const media = new MockMedia('media-1', 'Video 1', 'video');
      state.addMedia(media);
      
      expect(state.getMediaById('non-existent')).toBeNull();
    });

    test('should return null when getting media by id from empty list', () => {
      expect(state.getMediaById('any-id')).toBeNull();
    });
  });

  // Note: Media Filtering tests are skipped because getMediaVideo() and getMediaAudio()
  // use instanceof checks (VideoMedia, AudioMedia) which require actual class instances.
  // Our mock classes extend AbstractMedia but aren't instances of the specific layer types.
  describe('Media Filtering (requires actual VideoMedia/AudioMedia instances)', () => {
    test('should filter video medias', () => {
      const media1 =  new VideoMedia(new File([], 'video-1.mp4'), true);
      const media2 = new MockMedia('media-2', 'Audio 1', 'audio');
      const media3 = new VideoMedia(new File([], 'video-2.mp4'), true);
      state.addMedia(media1);
      state.addMedia(media2);
      state.addMedia(media3);
      expect(state.getMediaVideo()).toEqual([media1, media3]);
    });

    test('should filter audio medias', () => {
      const media1 = new AudioMedia(new File([], 'audio-1.mp3'));
      const media2 = new MockMedia('media-2', 'Video 1', 'video');
      const media3 = new AudioMedia(new File([], 'audio-2.mp3'));

      state.addMedia(media1);
      state.addMedia(media2);
      state.addMedia(media3);
      expect(state.getMediaAudio()).toEqual([media1, media3]);
    });

    test('should return empty array when no video medias exist', () => {
      const media1 = new MockMedia('media-1', 'Media 1', 'audio');
      const media2 = new MockMedia('media-2', 'Media 2', 'image');
      
      state.addMedia(media1);
      state.addMedia(media2);
      
      // Will return empty because our mocks aren't VideoMedia instances
      expect(state.getMediaVideo()).toEqual([]);
    });

    test('should return empty array when no audio medias exist', () => {
      const media1 = new MockMedia('media-1', 'Media 1', 'video');
      const media2 = new MockMedia('media-2', 'Media 2', 'image');
      
      state.addMedia(media1);
      state.addMedia(media2);
      
      // Will return empty because our mocks aren't AudioMedia instances
      expect(state.getMediaAudio()).toEqual([]);
    });
  });

  describe('Selected Media', () => {
    test('should get and set selected media', () => {
      expect(state.getSelectedMedia()).toBeNull();
      
      const media = new MockMedia('media-1', 'Video 1', 'video');
      state.setSelectedMedia(media);
      
      expect(state.getSelectedMedia()).toBe(media);
    });

    test('should update selected media', () => {
      const media1 = new MockMedia('media-1', 'Video 1', 'video');
      const media2 = new MockMedia('media-2', 'Audio 1', 'audio');
      
      state.setSelectedMedia(media1);
      expect(state.getSelectedMedia()).toBe(media1);
      
      state.setSelectedMedia(media2);
      expect(state.getSelectedMedia()).toBe(media2);
    });

    test('should maintain selected media independently of media list', () => {
      const media = new MockMedia('media-1', 'Video 1', 'video');
      state.setSelectedMedia(media);
      
      state.addMedia(new MockMedia('media-2', 'Video 2', 'video'));
      state.addMedia(new MockMedia('media-3', 'Video 3', 'video'));
      
      expect(state.getSelectedMedia()).toBe(media);
    });
  });

  describe('Exported studioState Instance', () => {
    test('should export singleton instance', () => {
      const instance = StudioState.getInstance();
      expect(studioState).toBe(instance);
    });

    test('should be usable directly', () => {
      const media = new MockMedia('test', 'Test Media', 'video');
      studioState.addMedia(media);
      
      expect(studioState.getMedias()).toContain(media);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle multiple operations in sequence', () => {
      const video = new MockMedia('video-1', 'Video 1', 'video');
      const audio = new MockMedia('audio-1', 'Audio 1', 'audio');
      
      state.setPlaying(true);
      state.setPlayingTime(100);
      state.addMedia(video);
      state.addMedia(audio);
      state.setSelectedMedia(video);
      
      expect(state.getIsPlaying()).toBe(true);
      expect(state.getPlayingTime()).toBe(100);
      expect(state.getMedias()).toHaveLength(2);
      expect(state.getSelectedMedia()).toBe(video);
    });

    test('should maintain state across multiple method calls', () => {
      const media1 = new MockMedia('media-1', 'Media 1', 'video');
      const media2 = new MockMedia('media-2', 'Media 2', 'video');
      const media3 = new MockMedia('media-3', 'Media 3', 'video');
      
      state.addMedia(media1);
      expect(state.getMedias()).toHaveLength(1);
      
      state.addMedia(media2);
      expect(state.getMedias()).toHaveLength(2);
      
      state.addMedia(media3);
      expect(state.getMedias()).toHaveLength(3);
      
      expect(state.getMediaById('media-2')).toBe(media2);
    });
  });
});

