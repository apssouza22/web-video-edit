/**
 * Local package representation of the media AbstractMedia
 * @see AbstractMedia
 * */
export interface MediaInterface {
  id: string;
  name?: string;
  startTime: number; // ms
  totalTimeInMilSeconds: number; // ms
  // Adjust end time by diff milliseconds
  adjustTotalTime: (diff: number) => void;
  // Render preview at given time; third arg optional flag for playing
  render: (ctx: CanvasRenderingContext2D, time: number, playing?: boolean) => void;
}

export type LayerUpdateKind = 'select' | 'delete' | 'split' | 'clone' | 'reorder';

