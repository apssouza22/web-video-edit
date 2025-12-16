import { TimelineLayer } from './timeline-layer';

export class CaptionTimelineLayer extends TimelineLayer {
  getLayerColors() {
    return {
      baseColor: 'rgb(255, 165, 0)',
      gradientColor: 'rgb(255, 140, 0)',
      selectedColor: 'rgb(255, 200, 100)',
      selectedGradient: 'rgb(255, 165, 0)'
    };
  }

  drawLayerSymbol(x: number, y: number, size: number) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1.5;

    const textSize = size * 0.5;
    this.ctx.font = `bold ${textSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillText('CC', x, y);
    this.ctx.strokeText('CC', x, y);
  }
}

