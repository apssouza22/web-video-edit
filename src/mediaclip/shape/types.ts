export enum ShapeType {
  ELLIPSE = 'ellipse',
  SQUARE = 'square',
  LINE = 'line',
  ARROW = 'arrow'
}

export interface ShapeStyle {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface ShapeConfig {
  type: ShapeType;
  style: ShapeStyle;
  width: number;
  height: number;
}

export const DEFAULT_SHAPE_STYLE: ShapeStyle = {
  fillColor: '#4a90d9',
  strokeColor: '#2c5aa0',
  strokeWidth: 2,
  opacity: 1
};

export const SHAPE_PRESETS: Record<ShapeType, ShapeConfig> = {
  [ShapeType.ELLIPSE]: {
    type: ShapeType.ELLIPSE,
    style: { ...DEFAULT_SHAPE_STYLE },
    width: 200,
    height: 200
  },
  [ShapeType.SQUARE]: {
    type: ShapeType.SQUARE,
    style: { ...DEFAULT_SHAPE_STYLE },
    width: 200,
    height: 200
  },
  [ShapeType.LINE]: {
    type: ShapeType.LINE,
    style: { ...DEFAULT_SHAPE_STYLE, fillColor: 'transparent', strokeWidth: 4 },
    width: 200,
    height: 4
  },
  [ShapeType.ARROW]: {
    type: ShapeType.ARROW,
    style: { ...DEFAULT_SHAPE_STYLE, strokeWidth: 4 },
    width: 200,
    height: 40
  }
};

