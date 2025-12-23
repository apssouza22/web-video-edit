import type {ESRenderingContext2D} from '@/common/render-2d';
import {IClip} from "@/mediaclip";

export type ESAudioContext = AudioContext | OfflineAudioContext;

/**
 * Local interface for media layers in the video/mux package.
 * Decouples video export from the concrete AbstractMedia class.
 */
export interface ExportMediaLayer extends IClip {
  readonly startTime: number;
  readonly totalTimeInMilSeconds: number;
  readonly audioBuffer: AudioBuffer | null;

  render(ctxOut: ESRenderingContext2D, currentTime: number, playing?: boolean): Promise<void>;
  connectAudioSource(audioContext: ESAudioContext): void;
  playStart(time: number): void;
  isAudio(): boolean;
}

