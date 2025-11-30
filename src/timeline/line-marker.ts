
export function renderLineMarker(
    time: number,
    ctx: CanvasRenderingContext2D,
    totalTime: number,
    timeMarkerHeight: number
): void {
  if (totalTime === 0) {
    return;
  }

  const scale = ctx.canvas.clientWidth / totalTime;
  const markerX = time * scale;

  // Draw the main line marker
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.moveTo(markerX, 0);
  ctx.lineTo(markerX, ctx.canvas.clientHeight);
  ctx.stroke();

  // Draw time display
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Position text to avoid overlapping with time marker
  const textX = markerX + 5;
  const textY = timeMarkerHeight + 5;

  // Draw background for better readability
  const timeText = time.toFixed(2) + 's';
  const textMetrics = ctx.measureText(timeText);
  const textWidth = textMetrics.width + 6;
  const textHeight = 16;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(textX - 3, textY - 2, textWidth, textHeight);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText(timeText, textX, textY);
}