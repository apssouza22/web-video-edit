import {
  getEventBus,
  MediaLibraryDropEvent, MediaLoadUpdateEvent,
  PlayerLayerTransformedEvent,
  PlayerTimeUpdateEvent,
  RecordVideoFileCreatedEvent,
  TimelineLayerUpdateEvent,
  TimelineTimeUpdateEvent,
  TranscriptionRemoveIntervalEvent,
  TranscriptionSeekEvent,
  UiSpeedChangeEvent,
  CaptionCreateEvent,
  SpeechGeneratedEvent
} from '@/common/event-bus';
import {VideoStudio} from "@/studio/studio";
import {MediaOps} from "@/studio/media-ops";
import {StudioState} from "@/common";
import {createMediaCaption, createMediaFromFile} from "@/mediaclip";
import {CaptionMedia} from "@/mediaclip/caption";

export class StudioEventHandler {
  #studio: VideoStudio;
  #eventBus = getEventBus();
  #eventUnsubscribers: (() => void)[] = [];
  private mediaControls: MediaOps;
  #studioState = StudioState.getInstance();

  constructor(studio: VideoStudio, mediaControls: MediaOps) {
    this.#studio = studio;
    this.mediaControls = mediaControls;
  }

  init(): void {
    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(PlayerTimeUpdateEvent, (event) => {
          this.#studioState.setPlayingTime(event.newTime);
          this.#studio.timeline.playerTime = event.newTime;
          this.#studio.transcriptionManager.highlightChunksByTime(event.newTime / 1000);
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(TimelineTimeUpdateEvent, (event) => {
          this.#studio.pause();
          this.#studioState.setPlayingTime(event.newTime);
          this.#studio.player.setTime(event.newTime);
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(TimelineLayerUpdateEvent, (event) => {
          const media = this.#studio.getMediaById(event.layer.id);
          if (!media) {
            return;
          }
          if (event.action === 'select') {
            this.#studio.setSelectedLayer(media);
          } else if (event.action === 'delete') {
            this.#studio.remove(media);
          } else if (event.action === 'clone') {
            this.#studio.cloneLayer(media);
          } else if (event.action === 'split') {
            this.mediaControls.split();
          } else if (event.action === 'reorder') {
            if (event.extra) {
              this.#studio.reorderLayer(event.extra.fromIndex, event.extra.toIndex);
            }
          }
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(TranscriptionRemoveIntervalEvent, (event) => {
          console.log(`TranscriptionManager: Removing interval from ${event.startTime} to ${event.endTime}`);
          this.mediaControls.removeInterval(event.startTime, event.endTime);
          this.updateCaptions(event);
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(TranscriptionSeekEvent, (event) => {
          const newTime = event.timestamp * 1000;
          this.#studioState.setPlayingTime(newTime);
          this.#studio.player.pause();
          this.#studio.player.setTime(newTime);
          this.#studio.player.play();
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(PlayerLayerTransformedEvent, (event) => {
          console.log(`Layer "${event.layer.name}" transformed`);
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(UiSpeedChangeEvent, (event) => {
          console.log(`Speed changed to: ${event.speed}`);
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(RecordVideoFileCreatedEvent, async (event) => {
          await this.#studio.mediaLibrary.addFile(event.videoFile);
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(MediaLibraryDropEvent, async (event) => {
          await this.#studio.createMediaFromLibrary(event.fileId);
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(MediaLoadUpdateEvent, (event) => {
          this.#studio.onLayerLoadUpdate(event.progress, event.layerName, event.layer, event.audioBuffer);
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(CaptionCreateEvent, (event) => {
          const captionMedias = createMediaCaption(event.transcriptionData);
          captionMedias.forEach(captionMedia => {
            this.#studio.addLayer(captionMedia);
          })
        })
    );

    this.#eventUnsubscribers.push(
        this.#eventBus.subscribe(SpeechGeneratedEvent, async (event) => {
          await createMediaFromFile(event.audioBlob as File);
        })
    );
  }

  private updateCaptions(event: TranscriptionRemoveIntervalEvent) {
    // Update caption layers with adjusted timestamps
    const removedDuration = event.endTime - event.startTime;
    const allLayers = this.#studio.getMedias();

    for (const layer of allLayers) {
      if (layer instanceof CaptionMedia) {
        // Check if this caption layer belongs to the audio that was edited
        // Caption layers are named like "audioId-Caption" or contain the audioId
        const captionAudioId = layer.name.split('-')[0];
        if (captionAudioId === event.audioId || layer.name.includes(event.audioId)) {
          layer.updateTimestamps(event.startTime, removedDuration);
          console.log(`Updated caption layer "${layer.name}" timestamps after interval removal`);
        }
      }
    }
  }

  destroy(): void {
    this.#eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.#eventUnsubscribers = [];
  }
}
