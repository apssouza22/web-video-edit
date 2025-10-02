import {Timeline} from './timeline';
import {VideoStudio} from "@/studio";

export function createTimeline(studio: VideoStudio): Timeline {
  return new Timeline(studio);
}
