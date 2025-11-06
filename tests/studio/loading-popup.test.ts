import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { LoadingPopup } from '@/studio/loading-popup';

describe('LoadingPopup', () => {
  let loadingPopup: LoadingPopup;
  let mockPopup: HTMLElement;
  let mockProgressFill: HTMLElement;
  let mockProgressText: HTMLElement;
  let mockCurrentFileText: HTMLElement;
  let mockTitle: HTMLElement;

  beforeEach(() => {
    // Setup DOM elements
    document.body.innerHTML = `
      <div id="loading-popup" style="display: none;">
        <div id="loading-title">Loading Media...</div>
        <div id="loading-current-file"></div>
        <div id="loading-progress-fill" style="width: 0%;"></div>
        <div id="loading-progress-text">0%</div>
      </div>
    `;

    mockPopup = document.getElementById('loading-popup') as HTMLElement;
    mockProgressFill = document.getElementById('loading-progress-fill') as HTMLElement;
    mockProgressText = document.getElementById('loading-progress-text') as HTMLElement;
    mockCurrentFileText = document.getElementById('loading-current-file') as HTMLElement;
    mockTitle = document.getElementById('loading-title') as HTMLElement;

    loadingPopup = new LoadingPopup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('should retrieve DOM elements', () => {
      expect(mockPopup).not.toBeNull();
      expect(mockProgressFill).not.toBeNull();
      expect(mockProgressText).not.toBeNull();
      expect(mockCurrentFileText).not.toBeNull();
      expect(mockTitle).not.toBeNull();
    });

    test('should initialize with no active loads', () => {
      // The popup should not be visible initially
      expect(mockPopup.style.display).toBe('none');
    });
  });

  describe('startLoading', () => {
    test('should show popup when loading starts', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');

      expect(mockPopup.style.display).toBe('block');
    });

    test('should set default title', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');

      expect(mockTitle.textContent).toBe('Loading Media...');
    });

    test('should set custom title when provided', () => {
      loadingPopup.startLoading('layer1', 'test.mp4', 'Exporting Video...');

      expect(mockTitle.textContent).toBe('Exporting Video...');
    });

    test('should display filename', () => {
      loadingPopup.startLoading('layer1', 'video.mp4');

      expect(mockCurrentFileText.textContent).toContain('video.mp4');
    });

    test('should handle multiple concurrent loads', () => {
      loadingPopup.startLoading('layer1', 'video1.mp4');
      loadingPopup.startLoading('layer2', 'video2.mp4');

      expect(mockCurrentFileText.textContent).toContain('Loading 2 files');
    });

    test('should initialize progress at 0%', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');

      expect(mockProgressFill.style.width).toBe('0%');
      expect(mockProgressText.textContent).toBe('0%');
    });
  });

  describe('updateProgress', () => {
    test('should update progress bar width', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');
      loadingPopup.updateProgress('layer1', 50);

      expect(mockProgressFill.style.width).toBe('50%');
    });

    test('should update progress text', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');
      loadingPopup.updateProgress('layer1', 75);

      expect(mockProgressText.textContent).toBe('75%');
    });

    test('should round progress to nearest integer', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');
      loadingPopup.updateProgress('layer1', 33.7);

      expect(mockProgressText.textContent).toBe('34%');
    });

    test('should handle progress of 100%', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');
      loadingPopup.updateProgress('layer1', 100);

      expect(mockProgressFill.style.width).toBe('100%');
      expect(mockProgressText.textContent).toBe('100%');
    });

    test('should ignore updates for non-existent layer IDs', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');
      
      const initialWidth = mockProgressFill.style.width;
      loadingPopup.updateProgress('nonexistent', 50);

      expect(mockProgressFill.style.width).toBe(initialWidth);
    });
  });

  describe('multiple concurrent loads', () => {
    test('should calculate average progress for multiple loads', () => {
      loadingPopup.startLoading('layer1', 'video1.mp4');
      loadingPopup.startLoading('layer2', 'video2.mp4');

      loadingPopup.updateProgress('layer1', 60);
      loadingPopup.updateProgress('layer2', 40);

      // Average: (60 + 40) / 2 = 50
      expect(mockProgressFill.style.width).toBe('50%');
      expect(mockProgressText.textContent).toBe('50%');
    });

    test('should show count of active files', () => {
      loadingPopup.startLoading('layer1', 'video1.mp4');
      loadingPopup.startLoading('layer2', 'video2.mp4');
      loadingPopup.startLoading('layer3', 'video3.mp4');

      expect(mockCurrentFileText.textContent).toContain('Loading 3 files');
    });

    test('should display filename of incomplete file', () => {
      loadingPopup.startLoading('layer1', 'video1.mp4');
      loadingPopup.startLoading('layer2', 'video2.mp4');

      loadingPopup.updateProgress('layer1', 100);
      
      expect(mockCurrentFileText.textContent).toContain('video2.mp4');
    });

    test('should remove completed loads from tracking', (done) => {
      loadingPopup.startLoading('layer1', 'video1.mp4');
      loadingPopup.startLoading('layer2', 'video2.mp4');

      loadingPopup.updateProgress('layer1', 100);

      // After completion, should only track layer2
      setTimeout(() => {
        loadingPopup.updateProgress('layer2', 50);
        expect(mockProgressFill.style.width).toBe('50%');
        done();
      }, 100);
    });
  });

  describe('auto-hide behavior', () => {
    test('should hide popup after all loads complete', (done) => {
      loadingPopup.startLoading('layer1', 'test.mp4');
      loadingPopup.updateProgress('layer1', 100);

      setTimeout(() => {
        expect(mockPopup.style.display).toBe('none');
        done();
      }, 600);
    });

    test('should not hide if new load starts before timeout', (done) => {
      loadingPopup.startLoading('layer1', 'test1.mp4');
      loadingPopup.updateProgress('layer1', 100);

      setTimeout(() => {
        loadingPopup.startLoading('layer2', 'test2.mp4');
      }, 200);

      setTimeout(() => {
        expect(mockPopup.style.display).toBe('block');
        done();
      }, 600);
    });

    test('should hide after all concurrent loads complete', (done) => {
      loadingPopup.startLoading('layer1', 'video1.mp4');
      loadingPopup.startLoading('layer2', 'video2.mp4');

      loadingPopup.updateProgress('layer1', 100);
      loadingPopup.updateProgress('layer2', 100);

      setTimeout(() => {
        expect(mockPopup.style.display).toBe('none');
        done();
      }, 600);
    });

    test('should not hide if one load is still incomplete', (done) => {
      loadingPopup.startLoading('layer1', 'video1.mp4');
      loadingPopup.startLoading('layer2', 'video2.mp4');

      loadingPopup.updateProgress('layer1', 100);
      loadingPopup.updateProgress('layer2', 50);

      setTimeout(() => {
        expect(mockPopup.style.display).toBe('block');
        done();
      }, 600);
    });
  });

  describe('edge cases', () => {
    test('should handle progress updates before starting', () => {
      expect(() => {
        loadingPopup.updateProgress('layer1', 50);
      }).not.toThrow();
    });

    test('should handle empty filename', () => {
      loadingPopup.startLoading('layer1', '');

      expect(mockCurrentFileText.textContent).toBeTruthy();
    });

    test('should handle progress greater than 100', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');
      loadingPopup.updateProgress('layer1', 150);

      expect(mockProgressFill.style.width).toBe('150%');
    });

    test('should handle negative progress', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');
      loadingPopup.updateProgress('layer1', -10);

      expect(mockProgressFill.style.width).toBe('0%');
    });

    test('should handle zero progress', () => {
      loadingPopup.startLoading('layer1', 'test.mp4');
      loadingPopup.updateProgress('layer1', 0);

      expect(mockProgressFill.style.width).toBe('0%');
      expect(mockProgressText.textContent).toBe('0%');
    });

    test('should handle same layer ID started multiple times', () => {
      loadingPopup.startLoading('layer1', 'video1.mp4');
      loadingPopup.startLoading('layer1', 'video2.mp4');

      // Should only have one active load
      expect(mockCurrentFileText.textContent).not.toContain('Loading 2 files');
    });
  });

  describe('display formatting', () => {
    test('should show single file format for one load', () => {
      loadingPopup.startLoading('layer1', 'video.mp4');

      expect(mockCurrentFileText.textContent).toBe('Loading: video.mp4');
    });

    test('should show multiple files format for many loads', () => {
      loadingPopup.startLoading('layer1', 'video1.mp4');
      loadingPopup.startLoading('layer2', 'video2.mp4');

      expect(mockCurrentFileText.textContent).toMatch(/Loading \d+ files\.\.\./);
    });

    test('should handle long filenames', () => {
      const longName = 'very-long-filename-that-might-overflow-the-ui-element.mp4';
      loadingPopup.startLoading('layer1', longName);

      expect(mockCurrentFileText.textContent).toContain(longName);
    });
  });
});

