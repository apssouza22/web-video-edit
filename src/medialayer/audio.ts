import {AbstractMedia} from './media-common';
import {AudioLoader} from './audio-loader';
import {AudioSource} from '@/medialayer/audio-source';
import type {ESAudioContext, LayerFile} from "./types";
import {AudioSplitHandler} from "@/audio/AudioSplitHandler";
import {AudioCutter} from "@/audio/audio-cutter";

export class AudioMedia extends AbstractMedia {
  private audioLoader: AudioLoader;
  private source: AudioSource | null = null;
  private currentSpeed: number = 1.0;
  private lastAppliedSpeed: number = 1.0;
  private originalTotalTimeInMilSeconds: number = 0;
  private started: boolean = false;
  private audioSplitHandler: AudioSplitHandler;
  private audioCutter: AudioCutter;

  constructor(file: LayerFile, skipLoading: boolean = false) {
    super(file);
    this.audioLoader = new AudioLoader();
    this.audioSplitHandler = new AudioSplitHandler();
    this.audioCutter = new AudioCutter();
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
    this._audioBuffer = audioBuffer;
    this.originalTotalTimeInMilSeconds = this._audioBuffer.duration * 1000;
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds;
    if (this.totalTimeInMilSeconds === 0) {
      console.warn("Failed to load audio media: " + this._name + ". Audio buffer duration is 0.");
    }
    this._ready = true;
    this._loadUpdateListener(this, 100, audioBuffer);
  }

  updateName(name: string): void {
    this._name = name + " [Audio] ";
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
      this._playerAudioContext = playerAudioContext;
    }
  }

  setSpeed(speed: number): void {
    super.setSpeed(speed);
    this.#updateTotalTimeForSpeed();
  }

  connectAudioSource(playerAudioContext: ESAudioContext): void {
    this.disconnect();
    this.currentSpeed = this._speedController.getSpeed();
    this.lastAppliedSpeed = this.currentSpeed;
    this.source = new AudioSource(playerAudioContext);
    if (this._audioStreamDestination) {
      //Used for video exporting
      this.source.connect(this._audioStreamDestination, this.currentSpeed, this._audioBuffer!);
    } else {
      this.source.connect(playerAudioContext.destination, this.currentSpeed, this._audioBuffer!);
    }
    this.started = false;
  }

  async render(ctxOut: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): Promise<void> {
    if (!this._ready) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }
    if (!playing) {
      return;
    }

    const currentSpeed = this._speedController.getSpeed();
    if (currentSpeed !== this.lastAppliedSpeed && this.source) {
      this.connectAudioSource(this._playerAudioContext!);
    }

    let time = currentTime - this.startTime;
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
    this._audioBuffer = newBuffer;
    this.originalTotalTimeInMilSeconds = newBuffer.duration * 1000;
    this.currentSpeed = this._speedController.getSpeed();
    this.#updateTotalTimeForSpeed();
    this.connectAudioSource(this._playerAudioContext!);
  }

  #updateTotalTimeForSpeed(): void {
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds / this._speedController.getSpeed();
    console.log(`Updated total time for speed ${this.currentSpeed}: ${this.totalTimeInMilSeconds}ms from original ${this.originalTotalTimeInMilSeconds}ms`);
  }

  protected _createCloneInstance(): AbstractMedia {
    const audioLayer = new AudioMedia(this._file!, true);
    audioLayer._playerAudioContext = this._playerAudioContext;
    audioLayer._audioBuffer = this._audioBuffer;
    return audioLayer as AbstractMedia;
  }

  /**
   * Override split to handle audio-specific splitting
   */
  protected _performSplit(mediaClone: AbstractMedia, splitTime: number): void {
    if (!this._audioBuffer || !this._playerAudioContext) {
      console.error('AudioMedia missing audioBuffer or playerAudioContext');
      return;
    }

    const layerRelativeTime = (splitTime - this.startTime) / 1000; // Convert to seconds

    if (layerRelativeTime <= 0 || layerRelativeTime >= this._audioBuffer.duration) {
      console.error('Split time is outside audio bounds');
      return;
    }

    const firstBuffer = this.audioSplitHandler.createAudioBufferSegment(this._audioBuffer, 0, layerRelativeTime, this._playerAudioContext);
    const secondBuffer = this.audioSplitHandler.createAudioBufferSegment(this._audioBuffer, layerRelativeTime, this._audioBuffer.duration, this._playerAudioContext);

    if (!firstBuffer || !secondBuffer) {
      console.error('Failed to create audio buffer segments');
      return;
    }

    // Update clone (first part)
    (mediaClone as AudioMedia)._name = this._name + " [Split]";
    (mediaClone as AudioMedia)._audioBuffer = firstBuffer;
    mediaClone.totalTimeInMilSeconds = firstBuffer.duration * 1000;

    // Update original (second part)
    this._audioBuffer = secondBuffer;
    this.totalTimeInMilSeconds = secondBuffer.duration * 1000;
    this.startTime = this.startTime + mediaClone.totalTimeInMilSeconds;

    console.log(`Successfully split AudioMedia: "${this._name}" at ${layerRelativeTime}s`);
  }

  removeInterval(startTime: number, endTime: number): boolean {
    if (!this._audioBuffer || !this._playerAudioContext) {
      console.warn(`Audio layer "${this._name}" missing audioBuffer or playerAudioContext`);
      return false;
    }

    if (startTime < 0 || endTime <= startTime) {
      console.error('Invalid time interval provided:', startTime, endTime);
      return false;
    }

    const newBuffer = this.audioCutter.removeInterval(this._audioBuffer, this._playerAudioContext, startTime, endTime);
    if (newBuffer && newBuffer !== this._audioBuffer) {
      this.updateBuffer(newBuffer);
      console.log(`Successfully updated audio layer: "${this._name}" after removing interval ${startTime}s to ${endTime}s`);
      return true;
    }
    return false;
  }
}
