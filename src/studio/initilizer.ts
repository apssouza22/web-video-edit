import {VideoStudio} from "@/studio/studio";
import {StudioEventHandler} from "@/studio/studio-event-handler";
import {MediaOps} from "@/studio/media-ops";
import {StudioState} from "@/common";
import {createMediaService} from "@/mediaclip";
import {getMediaLibrary} from "@/medialibrary";

export function initStudio(): VideoStudio {

  const mediaService = createMediaService();
  const mediaLibrary = getMediaLibrary();
  const studio = new VideoStudio(mediaService, mediaLibrary);
  studio.init();

  const mediaOps = new MediaOps(studio, mediaService, StudioState.getInstance());
  const eventHandler = new StudioEventHandler(studio, mediaOps);
  eventHandler.init();
  return studio;
}
