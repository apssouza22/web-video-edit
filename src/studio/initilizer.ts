import {VideoStudio} from "@/studio/studio";
import {StudioEventHandler} from "@/studio/studio-event-handler";
import {initScreenRecording} from "@/record/controls";
import {MediaOps} from "@/studio/media-ops";
import {StudioState} from "@/common";
import {createAudioService} from "@/audio";
import {createMediaService} from "@/media";
import {StudioControls} from "@/studio/controls";
import {getMediaLibrary} from "@/medialibrary";

export function initStudio(): VideoStudio {
  initScreenRecording();
  const audioService = createAudioService();
  const mediaService = createMediaService(audioService);
  const mediaLibrary = getMediaLibrary();
  const studio = new VideoStudio(mediaService, mediaLibrary);
  studio.init();

  const studioControls = new StudioControls(studio);
  studioControls.init();

  const mediaOps = new MediaOps(studio, mediaService, StudioState.getInstance());
  const eventHandler = new StudioEventHandler(studio, mediaOps);
  eventHandler.init();
  return studio;
}
