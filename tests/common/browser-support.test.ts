import {afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

// Use dynamic imports for ESM
const { checkBrowserSupport } = await import('@/common/browser-support');

describe('checkBrowserSupport', () => {
  let originalNavigator: Navigator;
  let originalMediaRecorder: typeof MediaRecorder;

  beforeEach(() => {
    originalNavigator = global.navigator;
    originalMediaRecorder = global.MediaRecorder;
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
    global.MediaRecorder = originalMediaRecorder;
  });

  describe('Browser Detection', () => {
    test('should detect Chrome browser', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      const support = checkBrowserSupport();
      expect(support.browserInfo.name).toBe('Chrome');
      expect(support.optimizations).toContain('Chrome provides optimal screen recording performance');
    });

    test('should detect Firefox browser', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      const support = checkBrowserSupport();
      expect(support.browserInfo.name).toBe('Firefox');
      expect(support.warnings).toContain('Firefox may require manual codec selection');
    });

    test('should detect Safari browser', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      const support = checkBrowserSupport();
      expect(support.browserInfo.name).toBe('Safari');
      expect(support.isSupported).toBe(false);
      expect(support.errors).toContain('Safari has limited screen recording support');
    });



    test('should return Unknown for unrecognized browsers', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'SomeUnknownBrowser/1.0',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      const support = checkBrowserSupport();
      expect(support.browserInfo.name).toBe('Unknown');
    });
  });

  describe('Feature Detection', () => {
    test('should detect getDisplayMedia support', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Chrome',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      const support = checkBrowserSupport();
      expect(support.features.getDisplayMedia).toBe(true);
    });

    test('should detect missing getDisplayMedia', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Chrome',
          mediaDevices: {}
        },
        writable: true,
        configurable: true
      });

      const support = checkBrowserSupport();
      expect(support.features.getDisplayMedia).toBe(false);
      expect(support.isSupported).toBe(false);
      expect(support.errors).toContain('getDisplayMedia is not supported');
    });

    test('should detect missing mediaDevices', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Chrome'
        },
        writable: true,
        configurable: true
      });

      const support = checkBrowserSupport();
      expect(support.features.getDisplayMedia).toBe(false);
      expect(support.isSupported).toBe(false);
    });

    test('should detect MediaRecorder support', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Chrome',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      global.MediaRecorder = class MediaRecorder {
        static isTypeSupported(type: string) {
          return true;
        }
      } as any;

      const support = checkBrowserSupport();
      expect(support.features.mediaRecorder).toBe(true);
    });

    test('should detect missing MediaRecorder', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Chrome',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      (global as any).MediaRecorder = undefined;

      const support = checkBrowserSupport();
      expect(support.features.mediaRecorder).toBe(false);
      expect(support.isSupported).toBe(false);
      expect(support.errors).toContain('MediaRecorder is not supported');
    });
  });

  describe('Codec Support', () => {
    test('should detect supported codecs', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Chrome',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      global.MediaRecorder = class MediaRecorder {
        static isTypeSupported(type: string) {
          return type.includes('vp9') || type.includes('vp8');
        }
      } as any;

      const support = checkBrowserSupport();
      expect(support.features.supportedCodecs.length).toBeGreaterThan(0);
      expect(support.features.supportedCodecs).toContain('video/webm;codecs=vp9,opus');
      expect(support.features.supportedCodecs).toContain('video/webm;codecs=vp8,opus');
    });

    test('should fail when no codecs are supported', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Chrome',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      global.MediaRecorder = class MediaRecorder {
        static isTypeSupported(type: string) {
          return false;
        }
      } as any;

      const support = checkBrowserSupport();
      expect(support.features.supportedCodecs.length).toBe(0);
      expect(support.isSupported).toBe(false);
      expect(support.errors).toContain('No supported video codecs found');
    });

    test('should test all codec types', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Chrome',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      const supportedTypes: string[] = [];
      global.MediaRecorder = class MediaRecorder {
        static isTypeSupported(type: string) {
          supportedTypes.push(type);
          return true;
        }
      } as any;

      checkBrowserSupport();
      
      expect(supportedTypes).toContain('video/webm;codecs=vp9,opus');
      expect(supportedTypes).toContain('video/webm;codecs=vp8,opus');
      expect(supportedTypes).toContain('video/webm;codecs=h264,opus');
      expect(supportedTypes).toContain('video/webm');
      expect(supportedTypes).toContain('video/mp4;codecs=h264,aac');
      expect(supportedTypes).toContain('video/mp4');
    });
  });

  describe('Browser Support Object Structure', () => {
    test('should return correct structure', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Chrome',
          mediaDevices: {
            getDisplayMedia: jest.fn()
          }
        },
        writable: true,
        configurable: true
      });

      const support = checkBrowserSupport();
      
      expect(support).toHaveProperty('isSupported');
      expect(support).toHaveProperty('features');
      expect(support).toHaveProperty('browserInfo');
      expect(support).toHaveProperty('errors');
      expect(support.features).toHaveProperty('getDisplayMedia');
      expect(support.features).toHaveProperty('mediaRecorder');
      expect(support.features).toHaveProperty('supportedCodecs');
      expect(support.browserInfo).toHaveProperty('name');
      expect(support.browserInfo).toHaveProperty('version');
      expect(Array.isArray(support.errors)).toBe(true);
      expect(Array.isArray(support.features.supportedCodecs)).toBe(true);
    });
  });
});

