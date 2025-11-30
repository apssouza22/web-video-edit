import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

// Use dynamic imports for ESM
const {
  ext_map,
  popup,
  exportToJson,
  uploadSupportedType,
  getSupportedMimeTypes
} = await import('../../src/common/utils');

describe('Studio Utils', () => {
  describe('ext_map', () => {
    test('should have correct video extensions', () => {
      expect(ext_map['mp4']).toBe('video/mp4');
      expect(ext_map['mpeg4']).toBe('video/mp4');
    });

    test('should have correct image extensions', () => {
      expect(ext_map['gif']).toBe('image/gif');
      expect(ext_map['jpg']).toBe('image/jpeg');
      expect(ext_map['jpeg']).toBe('image/jpeg');
      expect(ext_map['png']).toBe('image/png');
      expect(ext_map['apng']).toBe('image/apng');
      expect(ext_map['avif']).toBe('image/avif');
      expect(ext_map['webp']).toBe('image/webp');
    });

    test('should have correct audio extensions', () => {
      expect(ext_map['aac']).toBe('audio/aac');
      expect(ext_map['mp3']).toBe('audio/mpeg');
      expect(ext_map['oga']).toBe('audio/ogg');
      expect(ext_map['wav']).toBe('audio/wav');
      expect(ext_map['weba']).toBe('audio/webm');
    });
  });

  describe('popup', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('should create popup with provided content', () => {
      const content = document.createElement('p');
      content.textContent = 'Test content';

      popup(content);

      const popupElement = document.querySelector('.popup');
      expect(popupElement).not.toBeNull();
      expect(popupElement?.textContent).toContain('Test content');
    });

    test('should add close button to popup', () => {
      const content = document.createElement('p');
      content.textContent = 'Test';

      popup(content);

      const closeButton = document.querySelector('.close');
      expect(closeButton).not.toBeNull();
      expect(closeButton?.textContent).toBe('[x]');
    });

    test('should remove popup when close button is clicked', () => {
      const content = document.createElement('p');
      content.textContent = 'Test';

      popup(content);

      const closeButton = document.querySelector('.close') as HTMLElement;
      closeButton?.click();

      const popupElement = document.querySelector('.popup');
      expect(popupElement).toBeNull();
    });

    test('should stop propagation of keydown events', () => {
      const content = document.createElement('p');
      content.textContent = 'Test';

      popup(content);

      const popupElement = document.querySelector('.popup') as HTMLElement;
      const event = new KeyboardEvent('keydown', { bubbles: true });
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');
      
      popupElement?.dispatchEvent(event);
      
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('uploadSupportedType', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('should return true for supported file types', () => {
      const file1 = new File([''], 'test.mp4', { type: 'video/mp4' });
      const file2 = new File([''], 'image.jpg', { type: 'image/jpeg' });
      const file3 = new File([''], 'audio.mp3', { type: 'audio/mpeg' });
      
      const files = [{
        name: 'test.mp4',
        length: 3,
        item: (index: number) => [file1, file2, file3][index],
        0: file1,
        1: file2,
        2: file3
      }];

      // @ts-ignore
      const result = uploadSupportedType(files);
      expect(result).toBe(true);
    });

    test('should return false and show popup for unsupported file types', () => {
      const file = new File([''], 'test.avi', { type: 'video/avi' });
      
      const files: FileList[] = [{
        name: 'test.avi',
        length: 1,
        item: (index: number) => file,
        0: file
      }];

      const result = uploadSupportedType(files);
      
      expect(result).toBe(false);
      const popupElement = document.querySelector('.popup');
      expect(popupElement).not.toBeNull();
      expect(popupElement?.textContent).toContain('not supported');
    });

    test('should list all unsupported files in popup', () => {
      const file1 = new File([''], 'test.avi', { type: 'video/avi' });
      const file2 = new File([''], 'test.mkv', { type: 'video/mkv' });
      
      const files: [FileList] = [{
        name: 'test.avi',
        length: 2,
        item: (index: number) => [file1, file2][index],
        0: file1,
        1: file2
      }];

      uploadSupportedType(files);
      
      const popupElement = document.querySelector('.popup');
      expect(popupElement?.innerHTML).toContain('test.avi');
    });

    test('should allow mixed supported and unsupported files', () => {
      const file1 = new File([''], 'test.mp4', { type: 'video/mp4' });
      const file2 = new File([''], 'test.avi', { type: 'video/avi' });
      
      const files: FileList[] = [{
        name: 'fileList',
        length: 2,
        item: (index: number) => [file1, file2][index],
        0: file1,
        1: file2
      }];

      const result = uploadSupportedType(files);
      expect(result).toBe(false);
    });
  });

  describe('getSupportedMimeTypes', () => {
    test('should return array of supported mime types', () => {
      const types = getSupportedMimeTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    test('should return video mime types', () => {
      const types = getSupportedMimeTypes();
      const hasVideoType = types.some(type => type.startsWith('video/'));
      expect(hasVideoType).toBe(true);
    });

    test('should only include supported types', () => {
      const types = getSupportedMimeTypes();
      // All returned types should be supported by MediaRecorder
      types.forEach(type => {
        expect(MediaRecorder.isTypeSupported(type)).toBe(true);
      });
    });
  });

  describe('exportToJson', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      // Mock window.studio
      (window as any).studio = {
        dumpToJson: jest.fn(() => JSON.stringify({ test: 'data' }))
      };

      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      document.body.innerHTML = '';
      delete (window as any).studio;
    });

    test('should create popup with download link', () => {
      exportToJson();

      const popupElement = document.querySelector('.popup');
      expect(popupElement).not.toBeNull();

      const downloadLink = popupElement?.querySelector('.download-link');
      expect(downloadLink).not.toBeNull();
      expect(downloadLink?.textContent).toContain('Download JSON');
    });

    test('should call studio.dumpToJson', () => {
      exportToJson();

      expect((window as any).studio.dumpToJson).toHaveBeenCalled();
    });

    test('should create blob URL', () => {
      exportToJson();

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    test('should set download attribute with timestamp and random number', () => {
      exportToJson();

      const downloadLink = document.querySelector('.popup .download-link') as HTMLAnchorElement;
      expect(downloadLink).not.toBeNull()
      expect(downloadLink.download).toMatch(/^\d+_\d+\.json$/);
    });

  });

});

