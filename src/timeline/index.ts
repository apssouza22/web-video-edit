import {Timeline} from './timeline';
import {setupMediaLibraryDrop} from "@/timeline/drop-media-handler";
export { Timeline } from './timeline';

export function createTimeline(): Timeline {
  const container = document.getElementById('timeline_content') as HTMLElement
  if (!container) {
    throw new Error('Timeline container not found');
  }
  setupMediaLibraryDrop(container);
  return new Timeline(container);
}
