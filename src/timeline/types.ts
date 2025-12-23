import {IClip} from "@/mediaclip";

/**
 * Local package representation of the media AbstractMedia
 * @see AbstractMedia
 * */
export interface IClipTl extends IClip{
  id: string;
  startTime: number; // ms
  totalTimeInMilSeconds: number; // ms
  adjustTotalTime: (diff: number) => void;
  render: (ctx: CanvasRenderingContext2D, time: number, playing?: boolean) => Promise<void>;
}

export type LayerUpdateKind = 'select' | 'delete' | 'split' | 'clone' | 'reorder';

