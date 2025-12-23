import {MediaLayer} from "@/mediaclip";

/**
 * Local package representation of the media AbstractMedia
 * @see AbstractMedia
 * */
export interface MediaInterface extends MediaLayer{
  id: string;
  startTime: number; // ms
  totalTimeInMilSeconds: number; // ms
  adjustTotalTime: (diff: number) => void;
  render: (ctx: CanvasRenderingContext2D, time: number, playing?: boolean) => Promise<void>;
}

export type LayerUpdateKind = 'select' | 'delete' | 'split' | 'clone' | 'reorder';

