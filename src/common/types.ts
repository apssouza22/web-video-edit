/**
 * Local interface for media layers in the common package.
 * Decouples common utilities from the concrete AbstractMedia class.
 */
export interface CommonMediaLayer {
  readonly id: string;
  readonly name: string;
  startTime: number;
  totalTimeInMilSeconds: number;

  isVideo(): boolean;
  isAudio(): boolean;
}

