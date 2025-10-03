import {StandardLayer} from '@/layer/layer-common';
import {AudioCutter} from '@/audio/audio-cutter';
import {AudioLoader} from '@/audio/audio-loader';
import {AudioSource} from '@/audio/audio-source';
import {MediaLayer} from "@/studio/media-edit";
import type {LayerFile} from "@/layer/types";

export class AudioLayer extends StandardLayer implements MediaLayer {
  private audioLoader: AudioLoader;
  public audioBuffer: AudioBuffer | null = null;
  public source: AudioSource | null = null;
  public playerAudioContext: AudioContext | null = null;
  public playing: boolean = false;
  public audioStreamDestination: MediaStreamAudioDestinationNode | null = null;
  public currentSpeed: number = 1.0; // Track current playback speed
  public lastAppliedSpeed: number = 1.0; // Track last applied speed for change detection
  private audioCutter: AudioCutter;
  public originalTotalTimeInMilSeconds: number = 0; // Store original duration before speed changes
  public started: boolean = false; // Track if audio source has started playing

  constructor(file: LayerFile, skipLoading: boolean = false) {
    super(file);
    this.audioLoader = new AudioLoader();
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
    this.audioBuffer = audioBuffer;
    this.originalTotalTimeInMilSeconds = this.audioBuffer.duration * 1000;
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds;
    if (this.totalTimeInMilSeconds === 0) {
      console.warn("Failed to load audio layer: " + this.name + ". Audio buffer duration is 0.");
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
   * Disposes of the audio layer resources
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

  connectAudioSource(playerAudioContext: AudioContext): void {
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
   * Removes an audio interval from this AudioLayer
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @returns True if the interval was successfully removed, false otherwise
   */
  removeInterval(startTime: number, endTime: number): boolean {
    if (!this.audioBuffer || !this.playerAudioContext) {
      console.warn(`Audio layer "${this.name}" missing audioBuffer or playerAudioContext`);
      return false;
    }

    if (startTime < 0 || endTime <= startTime) {
      console.error('Invalid time interval provided:', startTime, endTime);
      return false;
    }

    try {
      const newBuffer = this.audioCutter.removeInterval(this.audioBuffer, this.playerAudioContext, startTime, endTime);

      if (newBuffer && newBuffer !== this.audioBuffer) {
        this.#updateBuffer(newBuffer);
        console.log(`Successfully updated audio layer: "${this.name}"`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error removing audio interval from layer "${this.name}":`, error);
      return false;
    }
  }

  /**
   * Updates this AudioLayer with a new AudioBuffer
   * @param newBuffer - The new AudioBuffer
   */
  #updateBuffer(newBuffer: AudioBuffer): void {
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
