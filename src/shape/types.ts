import {ShapeType} from '@/mediaclip/shape';

export interface ShapeButtonConfig {
  type: ShapeType;
  label: string;
  icon: string;
}

export const SHAPE_BUTTONS: ShapeButtonConfig[] = [
  {
    type: ShapeType.ELLIPSE,
    label: 'Ellipse',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <ellipse cx="12" cy="12" rx="10" ry="8"/>
    </svg>`
  },
  {
    type: ShapeType.SQUARE,
    label: 'Square',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>`
  },
  {
    type: ShapeType.LINE,
    label: 'Line',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>`
  },
  {
    type: ShapeType.ARROW,
    label: 'Arrow',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="15 8 19 12 15 16"/>
    </svg>`
  }
];

