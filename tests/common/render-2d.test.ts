import {beforeEach, describe, expect, jest, test } from '@jest/globals';

// Use dynamic imports for ESM
const { Canvas2DRender } = await import('@/common/render-2d');

describe('Canvas2DRender', () => {
  // @ts-ignore
  let render: Canvas2DRender;

  beforeEach(() => {
    render = new Canvas2DRender();
  });

  describe('Instantiation', () => {
    test('should create instance without canvas parameter', () => {
      const render = new Canvas2DRender();
      expect(render).toBeInstanceOf(Canvas2DRender);
      expect(render.canvas).toBeDefined();
      expect(render.context).toBeDefined();
    });

    test('should have default canvas and context', () => {
      expect(render.canvas).toBeTruthy();
      expect(render.context).toBeTruthy();
    });
  });

  describe('Size Properties', () => {
    test('should get width and height', () => {
      render.setSize(800, 600);
      
      expect(render.width).toBe(800);
      expect(render.height).toBe(600);
    });

    test('should set canvas size', () => {
      render.setSize(1920, 1080);
      
      expect(render.canvas.width).toBe(1920);
      expect(render.canvas.height).toBe(1080);
    });


    test('should handle zero dimensions', () => {
      render.setSize(0, 0);
      expect(render.width).toBe(0);
      expect(render.height).toBe(0);
    });

    test('should get clientWidth and clientHeight', () => {
      render.setSize(800, 600);
      
      expect(render.clientWidth).toBeDefined();
      expect(render.clientHeight).toBeDefined();
      expect(typeof render.clientWidth).toBe('number');
      expect(typeof render.clientHeight).toBe('number');
    });
  });

  describe('Drawing Methods', () => {
    beforeEach(() => {
      render.setSize(800, 600);
    });

    describe('clearRect', () => {
      test('should clear entire canvas with default parameters', () => {
        const clearRectSpy = jest.spyOn(render.context, 'clearRect');
        render.clearRect();
        
        expect(clearRectSpy).toHaveBeenCalledWith(0, 0, 800, 600);
      });

      test('should clear specific area', () => {
        const clearRectSpy = jest.spyOn(render.context, 'clearRect');
        render.clearRect(10, 20, 100, 50);
        
        expect(clearRectSpy).toHaveBeenCalledWith(10, 20, 100, 50);
      });

      test('should clear from position with full dimensions', () => {
        const clearRectSpy = jest.spyOn(render.context, 'clearRect');
        render.clearRect(50, 75);
        
        expect(clearRectSpy).toHaveBeenCalledWith(50, 75, 800, 600);
      });
    });

    describe('drawImage', () => {
      let mockImage: HTMLImageElement;

      beforeEach(() => {
        mockImage = document.createElement('img');
      });

      test('should draw image with two parameters', () => {
        const drawImageSpy = jest.spyOn(render.context, 'drawImage');
        render.drawImage(mockImage, 10, 20);
        
        expect(drawImageSpy).toHaveBeenCalledWith(mockImage, 10, 20);
      });

      test('should draw image with size', () => {
        const drawImageSpy = jest.spyOn(render.context, 'drawImage');
        render.drawImage(mockImage, 10, 20, 100, 50);
        
        expect(drawImageSpy).toHaveBeenCalledWith(mockImage, 10, 20, 100, 50);
      });

      test('should draw image with full parameters', () => {
        const drawImageSpy = jest.spyOn(render.context, 'drawImage');
        render.drawImage(mockImage, 0, 0, 100, 100, 50, 50, 200, 200);
        
        expect(drawImageSpy).toHaveBeenCalledWith(mockImage, 0, 0, 100, 100, 50, 50, 200, 200);
      });
    });

    describe('putImageData', () => {
      test('should put image data', () => {
        const imageData = render.context.createImageData(10, 10);
        const putImageDataSpy = jest.spyOn(render.context, 'putImageData');
        
        render.putImageData(imageData, 0, 0);
        
        expect(putImageDataSpy).toHaveBeenCalledWith(imageData, 0, 0);
      });
    });

    describe('getImageData', () => {
      test('should get image data with default parameters', () => {
        const imageData = render.getImageData();
        
        expect(imageData).toBeTruthy();
      });

      test('should get image data with specific dimensions', () => {
        const imageData = render.getImageData(0, 0, 100, 100);
        
        expect(imageData).toBeTruthy();
        expect(imageData?.width).toBe(100);
        expect(imageData?.height).toBe(100);
      });

      test('should get image data from specific position', () => {
        const imageData = render.getImageData(50, 50, 200, 150);
        
        expect(imageData).toBeTruthy();
      });
    });
  });

  describe('Text Methods', () => {
    beforeEach(() => {
      render.setSize(800, 600);
    });

    test('should measure text', () => {
      const metrics = render.context.measureText('Hello World');
      
      expect(metrics).toBeDefined();
      expect(metrics.width).toBeDefined();
    });

    test('should fill text without max width', () => {
      const fillTextSpy = jest.spyOn(render.context, 'fillText');
      render.context.fillText('Hello', 100, 200);
      
      expect(fillTextSpy).toHaveBeenCalledWith('Hello', 100, 200);
    });

    test('should fill text with max width', () => {
      const fillTextSpy = jest.spyOn(render.context, 'fillText');
      render.context.fillText('Hello', 100, 200, 300);
      
      expect(fillTextSpy).toHaveBeenCalledWith('Hello', 100, 200, 300);
    });
  });

  describe('Transformation Methods', () => {
    beforeEach(() => {
      render.setSize(800, 600);
    });

    test('should save context state', () => {
      const saveSpy = jest.spyOn(render.context, 'save');
      render.save();
      
      expect(saveSpy).toHaveBeenCalled();
    });

    test('should restore context state', () => {
      const restoreSpy = jest.spyOn(render.context, 'restore');
      render.restore();
      
      expect(restoreSpy).toHaveBeenCalled();
    });

    test('should translate context', () => {
      const translateSpy = jest.spyOn(render.context, 'translate');
      render.translate(100, 50);
      
      expect(translateSpy).toHaveBeenCalledWith(100, 50);
    });

    test('should rotate context', () => {
      const rotateSpy = jest.spyOn(render.context, 'rotate');
      render.rotate(Math.PI / 4);
      
      expect(rotateSpy).toHaveBeenCalledWith(Math.PI / 4);
    });

    test('should scale context', () => {
      const scaleSpy = jest.spyOn(render.context, 'scale');
      render.scale(2, 2);
      
      expect(scaleSpy).toHaveBeenCalledWith(2, 2);
    });
  });

  describe('Style Properties', () => {
    beforeEach(() => {
      render.setSize(800, 600);
    });

    test('should get and set font', () => {
      render.context.font = '16px Arial';
      expect(render.context.font).toBe('16px Arial');
    });

    test('should get and set fillStyle', () => {
      render.context.fillStyle = '#FF0000';
      expect(render.context.fillStyle).toBe('#FF0000');
    });

    test('should get and set shadowColor', () => {
      render.context.shadowColor = 'rgba(0,0,0,0.5)';
      expect(render.context.shadowColor).toBe('rgba(0,0,0,0.5)');
    });

    test('should get and set shadowBlur', () => {
      render.context.shadowBlur = 10;
      expect(render.context.shadowBlur).toBe(10);
    });

    test('should get and set textAlign', () => {
      render.context.textAlign = 'center';
      expect(render.context.textAlign).toBe('center');
    });

    test('should handle different textAlign values', () => {
      const alignValues: CanvasTextAlign[] = ['left', 'right', 'center', 'start', 'end'];
      
      alignValues.forEach(align => {
        render.context.textAlign = align;
        expect(render.context.textAlign).toBe(align);
      });
    });
  });

  describe('drawScaled Static Method', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockContext: CanvasRenderingContext2D;

    beforeEach(() => {
      mockCanvas = document.createElement('canvas');
      mockCanvas.width = 1920;
      mockCanvas.height = 1080;
      mockContext = mockCanvas.getContext('2d')!;
    });

    test('should draw scaled content from context', () => {
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = 640;
      sourceCanvas.height = 480;
      const sourceContext = sourceCanvas.getContext('2d')!;

      const drawImageSpy = jest.spyOn(mockContext, 'drawImage');
      
      Canvas2DRender.drawScaled(sourceContext, mockContext);
      
      expect(drawImageSpy).toHaveBeenCalled();
    });

    test('should draw scaled video element', () => {
      const mockVideo = document.createElement('video');
      const drawImageSpy = jest.spyOn(mockContext, 'drawImage');
      Canvas2DRender.drawScaled(mockVideo, mockContext);
      expect(drawImageSpy).toHaveBeenCalled();
    });

    test('should handle different aspect ratios', () => {
      const wideCanvas = document.createElement('canvas');
      wideCanvas.width = 1920;
      wideCanvas.height = 1080;
      const wideContext = wideCanvas.getContext('2d')!;

      const tallCanvas = document.createElement('canvas');
      tallCanvas.width = 1080;
      tallCanvas.height = 1920;
      const tallContext = tallCanvas.getContext('2d')!;

      const drawImageSpy = jest.spyOn(mockContext, 'drawImage');
      
      Canvas2DRender.drawScaled(wideContext, mockContext);
      expect(drawImageSpy).toHaveBeenCalled();

      drawImageSpy.mockClear();
      
      Canvas2DRender.drawScaled(tallContext, mockContext);
      expect(drawImageSpy).toHaveBeenCalled();
    });
  });

  describe('Transferable Canvas', () => {
    test('should have transferableCanvas property', () => {
      expect(render.transferableCanvas).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle operations on empty canvas', () => {
      const emptyRender = new Canvas2DRender();
      
      expect(() => {
        emptyRender.clearRect();
        emptyRender.save();
        emptyRender.restore();
        emptyRender.translate(10, 10);
      }).not.toThrow();
    });

    test('should handle negative coordinates', () => {
      render.setSize(800, 600);
      
      expect(() => {
        render.clearRect(-10, -10, 50, 50);
        render.translate(-100, -50);
      }).not.toThrow();
    });

    test('should handle very large dimensions', () => {
      expect(() => {
        render.setSize(10000, 10000);
      }).not.toThrow();
    });

    test('should handle fractional values', () => {
      expect(() => {
        render.setSize(800.5, 600.7);
        render.translate(10.5, 20.3);
        render.rotate(1.5708);
        render.scale(1.5, 1.5);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should perform complex drawing sequence', () => {
      render.setSize(800, 600);
      
      render.save();
      render.context.fillStyle = '#FF0000';
      render.context.font = '20px Arial';
      render.translate(100, 100);
      render.rotate(Math.PI / 4);
      render.scale(2, 2);
      render.context.fillText('Test', 0, 0);
      render.restore();
      
      expect(render.context.fillStyle).toBeDefined();
    });

    test('should handle multiple save and restore calls', () => {
      render.setSize(800, 600);
      
      render.save();
      render.context.fillStyle = '#FF0000';
      render.save();
      render.context.fillStyle = '#00FF00';
      render.save();
      render.context.fillStyle = '#0000FF';
      render.restore();
      render.restore();
      render.restore();
      
      expect(render.context.fillStyle).toBeDefined();
    });
  });
});

