import type { AbstractMedia } from '@/mediaclip';
import type { IClipTl, LayerUpdateKind } from '@/timeline/types';
import type {TranscriptionResult} from "@/transcription/types";

/**
 * Reorder data for media repositioning
 */
interface LayerReorderData {
  fromIndex: number;
  toIndex: number;
}


export abstract class BaseEvent {
  abstract readonly name: string;
}

export class PlayerTimeUpdateEvent extends BaseEvent {
  readonly name = 'player:timeUpdate';
  constructor(public newTime: number, public oldTime: number) {
    super();
  }
}

export class PlayerLayerTransformedEvent extends BaseEvent {
  readonly name = 'player:layerTransformed';
  constructor(public layer: AbstractMedia) {
    super();
  }
}

export class TimelineTimeUpdateEvent extends BaseEvent {
  readonly name = 'timeline:timeUpdate';
  constructor(public newTime: number, public oldTime: number) {
    super();
  }
}

export class TimelineLayerUpdateEvent extends BaseEvent {
  readonly name = 'timeline:layerUpdate';
  constructor(
    public action: LayerUpdateKind,
    public layer: IClipTl,
    public oldLayer?: IClipTl,
    public extra?: LayerReorderData
  ) {
    super();
  }
}

export class TranscriptionRemoveIntervalEvent extends BaseEvent {
  readonly name = 'transcription:removeInterval';

  constructor(public startTime: number, public endTime: number, public audioId: string) {
    super();
  }
}

export class TranscriptionSeekEvent extends BaseEvent {
  readonly name = 'transcription:seek';

  constructor(public timestamp: number, audioId: string) {
    super();
  }
}

export class TranscriptionCompletedEvent extends BaseEvent {
  readonly name = 'transcription:completed';
  constructor(public transcriptionData: any, public layer?: AbstractMedia) {
    super();
  }
}

export class UiSpeedChangeEvent extends BaseEvent {
  readonly name = 'ui:speedChange';
  constructor(public speed: number) {
    super();
  }
}

export class UiAspectRatioChangeEvent extends BaseEvent {
  readonly name = 'ui:aspectRatioChange';
  constructor(public ratio: string, public oldRatio?: string) {
    super();
  }
}

export class MediaLoadUpdateEvent extends BaseEvent {
  readonly name = 'media:loadUpdate';
  constructor(
    public progress: number,
    public layerName: string,
    public layer?: AbstractMedia,
    public audioBuffer?: AudioBuffer | null,
  ) {
    super();
  }
}

export class RecordVideoFileCreatedEvent extends BaseEvent {
  readonly name = 'record:videoFileCreated';
  constructor(public videoFile: File) {
    super();
  }
}

export class MediaLibraryDropEvent extends BaseEvent {
  readonly name = 'mediaLibrary:drop';
  constructor(public fileId: string) {
    super();
  }
}

export class CaptionCreateEvent extends BaseEvent {
  readonly name = 'caption:create';
  constructor(public transcriptionData: Map<string, TranscriptionResult>) {
    super();
  }
}

export class SpeechGeneratedEvent extends BaseEvent {
  readonly name = 'speech:generated';
  constructor(public audioBlob: Blob) {
    super();
  }
}

export class SearchCompleteEvent extends BaseEvent {
  readonly name = 'search:complete';
  constructor(public result: any) {
    super();
  }
}

type EventHandler<T extends BaseEvent> = (event: T) => void;
type EventClass<T extends BaseEvent> = new (...args: any[]) => T;

export class EventBus {
  #listeners: Map<string, Set<EventHandler<any>>> = new Map();
  #onceListeners: Map<string, Set<EventHandler<any>>> = new Map();

  subscribe<T extends BaseEvent>(
    EventClass: EventClass<T>,
    handler: EventHandler<T>
  ): () => void {
    const eventName = new EventClass().name;
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }
    
    this.#listeners.get(eventName)!.add(handler);
    return () => this.unsubscribe(EventClass, handler);
  }

  once<T extends BaseEvent>(
    EventClass: EventClass<T>,
    handler: EventHandler<T>
  ): void {
    const eventName = new EventClass().name;
    if (!this.#onceListeners.has(eventName)) {
      this.#onceListeners.set(eventName, new Set());
    }
    this.#onceListeners.get(eventName)!.add(handler);
  }

  unsubscribe<T extends BaseEvent>(
    EventClass: EventClass<T>,
    handler: EventHandler<T>
  ): void {
    const eventName = new EventClass().name;
    const listeners = this.#listeners.get(eventName);

    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.#listeners.delete(eventName);
      }
    }
    const onceListeners = this.#onceListeners.get(eventName);
    if (onceListeners) {
      onceListeners.delete(handler);
      if (onceListeners.size === 0) {
        this.#onceListeners.delete(eventName);
      }
    }
  }

  emit<T extends BaseEvent>(event: T): void {
    const listeners = this.#listeners.get(event.name);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.name}:`, error);
        }
      });
    }

    const onceListeners = this.#onceListeners.get(event.name);
    if (onceListeners) {
      onceListeners.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in once event handler for ${event.name}:`, error);
        }
      });
      this.#onceListeners.delete(event.name);
    }
  }

  clear<T extends BaseEvent>(EventClass?: EventClass<T>): void {
    if (EventClass) {
      const eventName = new EventClass().name;
      this.#listeners.delete(eventName);
      this.#onceListeners.delete(eventName);
    } else {
      this.#listeners.clear();
      this.#onceListeners.clear();
    }
  }

  hasListeners<T extends BaseEvent>(EventClass: EventClass<T>): boolean {
    const eventName = new EventClass().name;
    const regularListeners = this.#listeners.get(eventName);
    const onceListeners = this.#onceListeners.get(eventName);
    return (regularListeners && regularListeners.size > 0) || 
           (onceListeners && onceListeners.size > 0) || 
           false;
  }

  listenerCount<T extends BaseEvent>(EventClass: EventClass<T>): number {
    const eventName = new EventClass().name;
    const regularCount = this.#listeners.get(eventName)?.size || 0;
    const onceCount = this.#onceListeners.get(eventName)?.size || 0;
    return regularCount + onceCount;
  }
}

let globalEventBusInstance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!globalEventBusInstance) {
    globalEventBusInstance = new EventBus();
  }
  return globalEventBusInstance;
}

export function resetEventBus(): void {
  if (globalEventBusInstance) {
    globalEventBusInstance.clear();
  }
  globalEventBusInstance = null;
}