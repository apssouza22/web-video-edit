export interface ClipPropertyDescriptor {
  property: string;
  label: string;
  type: 'number' | 'range';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface PropertyUpdate {
  property: string;
  value: any;
}

export const TRANSFORM_PROPERTIES: ClipPropertyDescriptor[] = [
  {
    property: 'x',
    label: 'Position X',
    type: 'number',
    unit: 'px'
  },
  {
    property: 'y',
    label: 'Position Y',
    type: 'number',
    unit: 'px'
  },
  {
    property: 'scale',
    label: 'Scale',
    type: 'number',
    min: 0.1,
    max: 5,
    step: 0.1
  },
  {
    property: 'rotation',
    label: 'Rotation',
    type: 'number',
    min: -360,
    max: 360,
    step: 1,
    unit: 'deg'
  }
];

export const TIMING_PROPERTIES: ClipPropertyDescriptor[] = [
  {
    property: 'startTime',
    label: 'Start Time',
    type: 'number',
    min: 0,
    unit: 'ms'
  },
  {
    property: 'duration',
    label: 'Duration',
    type: 'number',
    min: 1,
    unit: 'ms'
  },
  {
    property: 'speed',
    label: 'Speed',
    type: 'number',
    min: 0.25,
    max: 4,
    step: 0.1
  }
];

export const VOLUME_PROPERTY: ClipPropertyDescriptor = {
  property: 'volume',
  label: 'Volume',
  type: 'range',
  min: 0,
  max: 100,
  step: 1,
  unit: '%'
};
