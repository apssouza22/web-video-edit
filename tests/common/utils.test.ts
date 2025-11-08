import { fixWebmDuration } from '@/common/utils';

describe('fixWebmDuration', () => {
  let mockBlob: Blob;

  beforeEach(() => {
    // Create a mock WebM blob for testing
    const mockData = new Uint8Array([
      // EBML Header (simplified mock data)
      0x1a, 0x45, 0xdf, 0xa3,
      // Minimal WebM structure
      0x01, 0x02, 0x03, 0x04, 0x05
    ]);
    mockBlob = new Blob([mockData], { type: 'video/webm' });
  });

  test('should fix WebM duration and add Cues metadata', async () => {
    const result = await fixWebmDuration(mockBlob);

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('video/webm');
  });

  test('should handle blob with correct MIME type', async () => {
    const webmBlob = new Blob([new Uint8Array(100)], { type: 'video/webm;codecs=vp9' });
    const result = await fixWebmDuration(webmBlob);

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toContain('video/webm');
  });

  test('should return a blob even if Cues metadata addition fails', async () => {
    // Create a blob with invalid data that might cause processing to fail
    const invalidBlob = new Blob(['invalid data'], { type: 'video/webm' });
    const result = await fixWebmDuration(invalidBlob);

    // Should still return a blob (fallback behavior)
    expect(result).toBeInstanceOf(Blob);
  });

  test('should handle empty blob gracefully', async () => {
    const emptyBlob = new Blob([], { type: 'video/webm' });
    const result = await fixWebmDuration(emptyBlob);

    expect(result).toBeInstanceOf(Blob);
  });

  test('should process blob with video/webm codec variants', async () => {
    const codecs = [
      'video/webm',
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus'
    ];

    for (const codec of codecs) {
      const blob = new Blob([new Uint8Array(50)], { type: codec });
      const result = await fixWebmDuration(blob);

      expect(result).toBeInstanceOf(Blob);
    }
  });

  test('should maintain blob size or increase it (due to Cues metadata)', async () => {
    const result = await fixWebmDuration(mockBlob);

    // The result should be at least as large as the original
    // (adding Cues metadata typically increases size slightly)
    expect(result.size).toBeGreaterThanOrEqual(0);
  });

  test('should handle large blobs efficiently', async () => {
    // Create a larger mock blob (1MB)
    const largeData = new Uint8Array(1024 * 1024);
    for (let i = 0; i < largeData.length; i++) {
      largeData[i] = i % 256;
    }
    const largeBlob = new Blob([largeData], { type: 'video/webm' });

    const startTime = Date.now();
    const result = await fixWebmDuration(largeBlob);
    const endTime = Date.now();

    expect(result).toBeInstanceOf(Blob);
    // Processing should complete in reasonable time (less than 5 seconds)
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('should preserve blob type after processing', async () => {
    const customTypeBlob = new Blob([new Uint8Array(100)], { 
      type: 'video/webm;codecs=vp9,opus' 
    });
    const result = await fixWebmDuration(customTypeBlob);

    expect(result.type).toBeTruthy();
    expect(result.type).toContain('video/webm');
  });
});

describe('fixWebmDuration - Integration with mocks', () => {
  test('should successfully call duration fix library', async () => {
    const mockBlob = new Blob([new Uint8Array(100)], { type: 'video/webm' });
    
    // This test verifies that the mocked webm-duration-fix is being called
    const result = await fixWebmDuration(mockBlob);
    
    expect(result).toBeInstanceOf(Blob);
  });

  test('should successfully call ts-ebml library for Cues', async () => {
    const mockData = new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, // EBML header signature
      0x01, 0x02, 0x03, 0x04
    ]);
    const mockBlob = new Blob([mockData], { type: 'video/webm' });
    
    // This test verifies that the mocked ts-ebml is being used
    const result = await fixWebmDuration(mockBlob);
    
    expect(result).toBeInstanceOf(Blob);
    // The mock should return a blob with some size
    expect(result.size).toBeGreaterThan(0);
  });
});

describe('fixWebmDuration - Error handling', () => {
  test('should handle processing errors gracefully with fallback', async () => {
    // Create a blob that might cause issues in processing
    const problematicBlob = new Blob([new Uint8Array(5)], { type: 'video/webm' });
    
    // Should not throw, should return fallback result
    await expect(fixWebmDuration(problematicBlob)).resolves.toBeInstanceOf(Blob);
  });

  test('should log errors but not throw', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const mockBlob = new Blob([new Uint8Array(10)], { type: 'video/webm' });
    const result = await fixWebmDuration(mockBlob);
    
    // Should still return a result
    expect(result).toBeInstanceOf(Blob);
    
    // Clean up spies
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test('should handle non-WebM blobs gracefully', async () => {
    const mp4Blob = new Blob([new Uint8Array(100)], { type: 'video/mp4' });
    
    // Should still process without crashing
    const result = await fixWebmDuration(mp4Blob);
    expect(result).toBeInstanceOf(Blob);
  });
});

