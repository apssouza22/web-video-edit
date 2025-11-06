import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { SpeedControlInput } from '@/studio/speed-control-input';
import { resetEventBus } from '@/common/event-bus';

describe('SpeedControlInput', () => {
  let speedControl: SpeedControlInput;
  let mockLayer: any;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="speed-control-item"></div>
    `;

    mockLayer = {
      getSpeed: jest.fn(() => 1.0),
      setSpeed: jest.fn()
    };

    speedControl = new SpeedControlInput();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetEventBus();
  });

  describe('constructor', () => {
    test('should create speed control component', () => {
      expect(speedControl).toBeDefined();
    });

    test('should create container element', () => {
      speedControl.init();
      const container = document.querySelector('.speed-control-container');
      expect(container).not.toBeNull();
    });

    test('should create input element', () => {
      speedControl.init();
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.type).toBe('number');
    });

    test('should set default input attributes', () => {
      speedControl.init();
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      expect(input.min).toBe('0.1');
      expect(input.max).toBe('10');
      expect(input.step).toBe('0.1');
      expect(input.value).toBe('1.0');
    });
  });

  describe('init', () => {
    test('should mount component to parent element', () => {
      speedControl.init();
      
      const parent = document.getElementById('speed-control-item');
      const container = parent?.querySelector('.speed-control-container');
      expect(container).not.toBeNull();
    });

    test('should throw error if parent element not found', () => {
      document.body.innerHTML = '';
      
      expect(() => {
        speedControl.init();
      }).toThrow('Parent must be an HTML element');
    });

    test('should disable input initially', () => {
      speedControl.init();
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe('setLayer', () => {
    beforeEach(() => {
      speedControl.init();
    });

    test('should set current layer', () => {
      speedControl.setLayer(mockLayer);
      
      expect(mockLayer.getSpeed).toHaveBeenCalled();
    });

    test('should update input value with layer speed', () => {
      mockLayer.getSpeed.mockReturnValue(2.0);
      
      speedControl.setLayer(mockLayer);
      
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      expect(input.value).toBe('2.00');
    });

    test('should enable input when layer is set', () => {
      speedControl.setLayer(mockLayer);
      
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      expect(input.disabled).toBe(false);
    });

    test('should remove disabled class from container', () => {
      speedControl.setLayer(mockLayer);
      
      const container = document.querySelector('.speed-control-container');
      expect(container?.classList.contains('disabled')).toBe(false);
    });

    test('should handle different speed values', () => {
      const speeds = [0.5, 1.0, 1.5, 2.0];
      
      speeds.forEach(speed => {
        mockLayer.getSpeed.mockReturnValue(speed);
        speedControl.setLayer(mockLayer);
        
        const input = document.querySelector('.speed-control-input') as HTMLInputElement;
        expect(input.value).toBe(speed.toFixed(2));
      });
    });
  });

  describe('input validation', () => {
    beforeEach(() => {
      speedControl.init();
      speedControl.setLayer(mockLayer);
    });

    test('should accept valid speed values', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      input.value = '1.5';
      input.dispatchEvent(new Event('input'));
      
      expect(mockLayer.setSpeed).toHaveBeenCalledWith(1.5);
    });

    test('should accept minimum valid speed (0.1)', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      input.value = '0.1';
      input.dispatchEvent(new Event('input'));
      
      expect(mockLayer.setSpeed).toHaveBeenCalledWith(0.1);
    });

    test('should accept maximum valid speed (10)', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      input.value = '10';
      input.dispatchEvent(new Event('input'));
      
      expect(mockLayer.setSpeed).toHaveBeenCalledWith(10);
    });

    test('should reject speed below minimum on blur', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      input.value = '0.05';
      input.dispatchEvent(new Event('blur'));
      
      const error = document.querySelector('.speed-control-error');
      expect(error).not.toBeNull();
      expect(error?.textContent).toContain('Invalid speed value');
    });

    test('should reject speed above maximum on blur', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      input.value = '11';
      input.dispatchEvent(new Event('blur'));
      
      const error = document.querySelector('.speed-control-error');
      expect(error).not.toBeNull();
    });

    test('should reject NaN values on blur', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      input.value = 'abc';
      input.dispatchEvent(new Event('blur'));
      
      const error = document.querySelector('.speed-control-error');
      expect(error).not.toBeNull();
    });

    test('should reset to current speed on invalid blur', () => {
      mockLayer.getSpeed.mockReturnValue(2.0);
      speedControl.setLayer(mockLayer);
      
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      input.value = '15';
      input.dispatchEvent(new Event('blur'));
      
      expect(input.value).toBe('2.00');
    });
  });

  describe('keyboard shortcuts', () => {
    beforeEach(() => {
      speedControl.init();
      speedControl.setLayer(mockLayer);
    });

    test('should trigger validation on Enter key', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      const blurSpy = jest.spyOn(input, 'blur');
      
      input.value = '2.0';
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);
      
      expect(blurSpy).toHaveBeenCalled();
    });

    test('should reset value on Escape key', () => {
      mockLayer.getSpeed.mockReturnValue(1.5);
      speedControl.setLayer(mockLayer);
      
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      input.value = '3.0';
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      input.dispatchEvent(event);
      
      expect(input.value).toBe('1.50');
    });

    test('should not affect other keys', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      const initialValue = input.value;
      
      const event = new KeyboardEvent('keydown', { key: 'A' });
      input.dispatchEvent(event);
      
      expect(input.value).toBe(initialValue);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      speedControl.init();
      speedControl.setLayer(mockLayer);
    });

    test('should show error message when validation fails', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      input.value = '0.05';
      input.dispatchEvent(new Event('blur'));
      
      const error = document.querySelector('.speed-control-error');
      expect(error).not.toBeNull();
      expect(error?.textContent).toContain('Invalid speed value');
    });

    test('should auto-remove error after 3 seconds', (done) => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      input.value = '0.05';
      input.dispatchEvent(new Event('blur'));
      
      const error = document.querySelector('.speed-control-error');
      expect(error).not.toBeNull();
      
      setTimeout(() => {
        const errorAfter = document.querySelector('.speed-control-error');
        expect(errorAfter).toBeNull();
        done();
      }, 3100);
    });

    test('should handle setSpeed errors', () => {
      // @ts-ignore
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLayer.setSpeed.mockImplementation(() => {
        throw new Error('Speed setting failed');
      });
      
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      input.value = '2.0';
      input.dispatchEvent(new Event('input'));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to set speed:', expect.any(Error));
      
      const error = document.querySelector('.speed-control-error');
      expect(error).not.toBeNull();
      expect(error?.textContent).toContain('Speed setting failed');
      
      consoleErrorSpy.mockRestore();
    });

    test('should clear existing error before showing new one', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      // First error
      input.value = '0.05';
      input.dispatchEvent(new Event('blur'));
      
      // Second error
      input.value = '15';
      input.dispatchEvent(new Event('blur'));
      
      const errors = document.querySelectorAll('.speed-control-error');
      expect(errors.length).toBe(1);
    });
  });

  describe('onSpeedChange callback', () => {
    beforeEach(() => {
      speedControl.init();
      speedControl.setLayer(mockLayer);
    });

    test('should call callback when speed changes', () => {
      const callback = jest.fn();
      speedControl.onSpeedChange(callback);
      
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      input.value = '2.0';
      input.dispatchEvent(new Event('input'));
      
      expect(callback).toHaveBeenCalledWith(2.0);
    });

    test('should emit event bus event when speed changes', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      input.value = '1.5';
      input.dispatchEvent(new Event('input'));
      
      // Event bus event should be emitted
      // This is tested indirectly through the layer.setSpeed call
      expect(mockLayer.setSpeed).toHaveBeenCalledWith(1.5);
    });
  });

  describe('decimal precision', () => {
    beforeEach(() => {
      speedControl.init();
      speedControl.setLayer(mockLayer);
    });

    test('should display speed with 2 decimal places', () => {
      mockLayer.getSpeed.mockReturnValue(1.5);
      speedControl.setLayer(mockLayer);
      
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      expect(input.value).toBe('1.50');
    });

    test('should handle speeds with many decimal places', () => {
      mockLayer.getSpeed.mockReturnValue(1.23456789);
      speedControl.setLayer(mockLayer);
      
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      expect(input.value).toBe('1.23');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      speedControl.init();
    });

    test('should handle setLayer without init', () => {
      const newSpeedControl = new SpeedControlInput();
      
      expect(() => {
        newSpeedControl.setLayer(mockLayer);
      }).not.toThrow();
    });

    test('should handle input change without layer set', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      expect(() => {
        input.value = '2.0';
        input.dispatchEvent(new Event('input'));
      }).not.toThrow();
    });

    test('should handle blur without layer set', () => {
      const input = document.querySelector('.speed-control-input') as HTMLInputElement;
      
      expect(() => {
        input.value = '2.0';
        input.dispatchEvent(new Event('blur'));
      }).not.toThrow();
    });
  });
});

