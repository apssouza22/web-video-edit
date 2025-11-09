import {AbstractMedia, ESAudioContext} from './media-common';
import {AudioLoader} from './audio-loader';
import {AudioSource} from '@/media/audio-source';
import type {LayerFile} from "./types";

export class AudioMedia extends AbstractMedia {
  private audioLoader: AudioLoader;
  public audioBuffer: AudioBuffer | null = null;
  public source: AudioSource | null = null;
  public playing: boolean = false;
  public audioStreamDestination: MediaStreamAudioDestinationNode | null = null;
  public currentSpeed: number = 1.0; // Track current playback speed
  public lastAppliedSpeed: number = 1.0; // Track last applied speed for change detection
  public originalTotalTimeInMilSeconds: number = 0; // Store original duration before speed changes
  public started: boolean = false; // Track if audio source has started playing

  constructor(file: LayerFile, skipLoading: boolean = false) {
    super(file);
    this.audioLoader = new AudioLoader();

    if (skipLoading) {
      return;
    }
    this.#loadAudioFile(file);
  }

  /**
   * Loads an audio file using the AudioLoader
   * @param file - The audio file to load
   */
  async #loadAudioFile(file: File): Promise<void> {
    try {
      const audioBuffer = await this.audioLoader.loadAudioFile(file);
      this.#onAudioLoadSuccess(audioBuffer);
    } catch (error) {
      console.error(`Failed to load audio layer: ${this.name}`, error);
      // TODO: Handle error appropriately
    }
  }

  /**
   * Handles successful audio loading
   * @param audioBuffer - The loaded audio buffer
   */
  #onAudioLoadSuccess(audioBuffer: AudioBuffer): void {
    this.audioBuffer = audioBuffer;
    this.originalTotalTimeInMilSeconds = this.audioBuffer.duration * 1000;
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds;
    if (this.totalTimeInMilSeconds === 0) {
      console.warn("Failed to load audio media: " + this.name + ". Audio buffer duration is 0.");
    }
    this.ready = true;
    this.loadUpdateListener(this, 100, null, audioBuffer);
  }

  updateName(name: string): void {
    this.name = name + " [Audio] ";
  }

  disconnect(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
  }

  /**
   * Disposes of the audio media resources
   */
  dispose(): void {
    this.disconnect();
    if (this.audioLoader) {
      this.audioLoader.dispose();
    }
  }

  init(canvasWidth: number, canvasHeight: number, playerAudioContext?: AudioContext): void {
    super.init(canvasWidth, canvasHeight);
    if (playerAudioContext) {
      this.playerAudioContext = playerAudioContext;
    }
  }

  setSpeed(speed: number): void {
    super.setSpeed(speed);
    this.#updateTotalTimeForSpeed();
  }

  connectAudioSource(playerAudioContext: ESAudioContext): void {
    this.disconnect();
    this.currentSpeed = this.speedController.getSpeed();
    this.lastAppliedSpeed = this.currentSpeed;
    this.source = new AudioSource(playerAudioContext);
    if (this.audioStreamDestination) {
      //Used for video exporting
      this.source.connect(this.audioStreamDestination, this.currentSpeed, this.audioBuffer!);
    } else {
      this.source.connect(playerAudioContext.destination, this.currentSpeed, this.audioBuffer!);
    }
    this.started = false;
  }

  render(ctxOut: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): void {
    if (!this.ready) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }
    if (!playing) {
      return;
    }

    const currentSpeed = this.speedController.getSpeed();
    if (currentSpeed !== this.lastAppliedSpeed && this.source) {
      this.connectAudioSource(this.playerAudioContext!);
    }

    let time = currentTime - this.start_time;
    if (time < 0 || time > this.totalTimeInMilSeconds) {
      return;
    }

    if (!this.started) {
      this.source!.start(0, time / 1000);
      this.started = true;
    }
  }

  playStart(time: number): void {
    this.source!.start(time / 1000, 0);
  }

  /**
   * Updates this AudioMedia with a new AudioBuffer
   * @param newBuffer - The new AudioBuffer
   */
  updateBuffer(newBuffer: AudioBuffer): void {
    if (!newBuffer) {
      console.error('Invalid buffer provided for updateBuffer');
      return;
    }

    this.disconnect();
    this.audioBuffer = newBuffer;
    this.originalTotalTimeInMilSeconds = newBuffer.duration * 1000;
    this.currentSpeed = this.speedController.getSpeed();
    this.#updateTotalTimeForSpeed();
    this.connectAudioSource(this.playerAudioContext!);
  }

  #updateTotalTimeForSpeed(): void {
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds / this.speedController.getSpeed();
    console.log(`Updated total time for speed ${this.currentSpeed}: ${this.totalTimeInMilSeconds}ms from original ${this.originalTotalTimeInMilSeconds}ms`);
  }
}
