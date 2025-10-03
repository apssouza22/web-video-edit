export interface StandardLayer {
  id: string;
  name?: string;
  start_time: number; // ms
  totalTimeInMilSeconds: number; // ms
  // Adjust end time by diff milliseconds
  adjustTotalTime: (diff: number) => void;
  // Render preview at given time; third arg optional flag for playing
  render: (ctx: CanvasRenderingContext2D, time: number, playing?: boolean) => void;
}

export type LayerUpdateKind = 'select' | 'delete' | 'split' | 'clone' | 'reorder';

