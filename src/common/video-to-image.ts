export async function videoFrameToImageData(videoFrame: VideoFrame): Promise<ImageData> {
  const width = videoFrame.displayWidth;
  const height = videoFrame.displayHeight;
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      return await videoFrameToImageDataOffscreen(videoFrame, width, height);
    }
  } catch (error) {
    console.warn('OffscreenCanvas conversion failed, falling back to regular Canvas:', error);
  }
  return videoFrameToImageDataCanvas(videoFrame, width, height);
}

async function videoFrameToImageDataOffscreen(
  videoFrame: VideoFrame,
  width: number,
  height: number
): Promise<ImageData> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from OffscreenCanvas');
  }
  ctx.drawImage(videoFrame, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function videoFrameToImageDataCanvas(
  videoFrame: VideoFrame,
  width: number,
  height: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get 2D context from Canvas');
  }
  ctx.drawImage(videoFrame, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}
