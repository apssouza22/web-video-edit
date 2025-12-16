import {TimelineLayer} from './timeline-layer';

export class ShapeTimelineLayer extends TimelineLayer {
  getLayerColors() {
    return {
      baseColor: 'rgb(46, 139, 87)',
      gradientColor: 'rgb(60, 179, 113)',
      selectedColor: 'rgb(0, 201, 87)',
      selectedGradient: 'rgb(46, 139, 87)'
    };
  }

  drawLayerSymbol(x: number, y: number, size: number) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1.5;

    const shapeSize = size * 0.35;
    
    this.ctx.beginPath();
    this.ctx.rect(x - shapeSize, y - shapeSize, shapeSize * 2, shapeSize * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }
}

