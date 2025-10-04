import {VideoStudio} from "@/studio/studio";
import {StudioEventHandler} from "@/studio/studio-event-handler";

export function initStudio(): VideoStudio {
  const studio = new VideoStudio();
  studio.init();
  const eventHandler = new StudioEventHandler(studio);
  eventHandler.init();
  return studio;
}
