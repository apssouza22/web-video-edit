import {
  getEventBus,
  PlayerLayerTransformedEvent,
  PlayerTimeUpdateEvent,
  TimelineLayerUpdateEvent,
  TimelineTimeUpdateEvent,
  TranscriptionRemoveIntervalEvent,
  TranscriptionSeekEvent,
  UiSpeedChangeEvent
} from '@/common/event-bus';
import {VideoStudio} from "@/studio/studio";

export class StudioEventHandler {
  #studio: VideoStudio;
  #eventBus = getEventBus();
  #eventUnsubscribers: (() => void)[] = [];

  constructor(studio: VideoStudio) {
    this.#studio = studio;
  }

  init(): void {
    this.#eventUnsubscribers.push(
      this.#eventBus.subscribe(PlayerTimeUpdateEvent, (event) => {
        this.#studio.studioState.setPlayingTime(event.newTime);
        this.#studio.timeline.playerTime = event.newTime;
        this.#studio.transcriptionManager.highlightChunksByTime(event.newTime / 1000);
      })
    );

    this.#eventUnsubscribers.push(
      this.#eventBus.subscribe(TimelineTimeUpdateEvent, (event) => {
        if (!this.#studio.player.playing) {
          this.#studio.studioState.setPlayingTime(event.newTime);
          this.#studio.player.setTime(event.newTime);
        }
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
          this.#studio.mediaEditor.split();
        } else if (event.action === 'reorder') {
          if (event.extra) {
            console.log(`Layer "${media.name}" reordered from index ${event.extra.fromIndex} to ${event.extra.toIndex}`);
          }
        }
      })
    );

    this.#eventUnsubscribers.push(
      this.#eventBus.subscribe(TranscriptionRemoveIntervalEvent, (event) => {
        console.log(`TranscriptionManager: Removing interval from ${event.startTime} to ${event.endTime}`);
        this.#studio.mediaEditor.removeInterval(event.startTime, event.endTime);
      })
    );

    this.#eventUnsubscribers.push(
      this.#eventBus.subscribe(TranscriptionSeekEvent, (event) => {
        const newTime = event.timestamp * 1000;
        this.#studio.studioState.setPlayingTime(newTime);
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
  }

  destroy(): void {
    this.#eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.#eventUnsubscribers = [];
  }
}
