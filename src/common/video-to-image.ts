export function imageBitmapToImageData(imageBitmap: ImageBitmap): ImageData {
  const width = imageBitmap.width;
  const height = imageBitmap.height;
  
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }
    ctx.drawImage(imageBitmap, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get 2D context from Canvas');
  }
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

