import {Timeline} from './timeline';
import type { StandardLayer } from './types';
import {VideoStudio} from "@/studio";

export function createTimeline(studio: VideoStudio): Timeline {
  return new Timeline(studio);
}
