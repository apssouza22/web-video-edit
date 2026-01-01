import {AbstractClip, LayerChange} from '@/mediaclip';
import {StudioState} from '@/common/studio-state';
import {getEventBus, PlayerLayerTransformedEvent, TimelineLayerUpdateEvent} from '@/common/event-bus';
import {ClipSettingsView} from './clip-settings-view';

export class ClipSettingsService {
  #view: ClipSettingsView;
  #studioState: StudioState;
  #eventBus: ReturnType<typeof getEventBus>;
  #currentClip: AbstractClip | null = null;
  #updateThrottle: Map<string, number> = new Map();

  constructor() {
    this.#studioState = StudioState.getInstance();
    this.#eventBus = getEventBus();
    this.#view = new ClipSettingsView(this.#handlePropertyChange.bind(this));
  }

  init(): void {
    this.#view.init();
    this.#subscribeToEvents();
    this.#checkCurrentSelection();
  }

  #subscribeToEvents(): void {
    this.#eventBus.subscribe(PlayerLayerTransformedEvent, this.#onCanvasTransformed.bind(this));
    this.#eventBus.subscribe(TimelineLayerUpdateEvent, this.#onTimelineLayerUpdate.bind(this));
  }

  #onCanvasTransformed(event: PlayerLayerTransformedEvent): void {
    const selected = this.#studioState.getSelectedMedia();
    if (selected !== this.#currentClip) {
      this.#currentClip = selected;
      this.#view.updateClip(selected);
    }
  }

  #onTimelineLayerUpdate(event: TimelineLayerUpdateEvent): void {
    // Handle timeline updates that might affect selection
    if (event.action === 'select') {
      const selected = this.#studioState.getSelectedMedia();
      if (selected !== this.#currentClip) {
        this.#currentClip = selected;
        this.#view.updateClip(selected);
      }
      return
    }
    if (event.action === 'delete') {
      // If current clip was deleted, clear selection
      if (this.#currentClip && event.layer.id === this.#currentClip.id) {
        this.#currentClip = null;
        this.#view.updateClip(null);
      }
    }
  }

  #checkCurrentSelection(): void {
    const selected = this.#studioState.getSelectedMedia();
    if (selected) {
      this.#currentClip = selected;
      this.#view.updateClip(selected);
    }
  }

  #handlePropertyChange(property: string, value: any): void {
    if (!this.#currentClip) return;
    this.#throttledUpdate(property, value);
  }

  #throttledUpdate(property: string, value: any): void {
    // Throttle updates for real-time changes (16ms = ~60fps)
    const now = Date.now();
    const lastUpdate = this.#updateThrottle.get(property) || 0;

    if (now - lastUpdate < 16) {
      // Skip this update, too soon
      return;
    }

    this.#updateThrottle.set(property, now);
    this.#applyPropertyUpdate(property, value);
  }

  #applyPropertyUpdate(property: string, value: any): void {
    const clip = this.#currentClip;
    if (!clip) return;

    const currentTime = this.#studioState.getPlayingTime();

    try {
      // Transform properties use update() method
      if (['x', 'y', 'scale', 'rotation'].includes(property)) {
        const change: LayerChange = { [property]: value };
        clip.update(change, currentTime);
        return;
      }

      // Timing properties use direct setters
      if (property === 'startTime') {
        clip.startTime = value;
        return;
      }
      if (property === 'duration') {
        clip.totalTimeInMilSeconds = value;
        return;
      }
      if (property === 'speed') {
        // Speed is controlled via SpeedController
        // Access the internal speed controller if available
        if (typeof (clip as any).setSpeed === 'function') {
          (clip as any).setSpeed(value);
        }
        return;
      }

      // Volume for audio clips
      if (property === 'volume') {
        // Check if clip has volume property (will be added to AudioMedia)
        if ('volume' in clip && typeof (clip as any).volume !== 'undefined') {
          (clip as any).volume = value / 100; // Convert percentage to 0-1
        }
        return;
      }
    } catch (error) {
      console.error(`Error updating property ${property}:`, error);
    }
  }
}
