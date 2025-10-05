import {VideoCanvas} from './canvas.js';
import {StudioState} from "@/common/studio-state";

/**
 * Creates a VideoCanvas instance.
 */
export function createVideoCanvas(studioState: StudioState): VideoCanvas {
  return new VideoCanvas(studioState);
}

export { VideoCanvas } from './canvas.js';
