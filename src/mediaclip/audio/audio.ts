import {AbstractMedia} from '@/mediaclip/media-common';
import {AudioSource} from '@/mediaclip/audio/audio-source';
import type {ESAudioContext, IAudioClip} from "../types";
import {AudioSplitHandler} from "@/mediaclip/audio/AudioSplitHandler";
import {AudioCutter} from "@/mediaclip/audio/audio-cutter";
import {AudioFrameSource} from "@/mediaclip/mediasource";
import {Canvas2DRender} from "@/common/render-2d";

export class AudioMedia extends AbstractMedia implements IAudioClip {
  private audioFrameSource: AudioFrameSource | undefined;
  private source: AudioSource;
  private currentSpeed: number = 1.0;
  private lastAppliedSpeed: number = 1.0;
  private originalTotalTimeInMilSeconds: number = 0;
  private started: boolean = false;
  private audioSplitHandler: AudioSplitHandler;
  private audioCutter: AudioCutter;

  constructor(name: string, audioFrameSource?: AudioFrameSource) {
    super(name);
    this.audioSplitHandler = new AudioSplitHandler();
    this.audioCutter = new AudioCutter();
    this.source = new AudioSource();
    if (!audioFrameSource) {
      return;
    }

    this.initializeFromAudioSource(audioFrameSource);
  }

  private initializeFromAudioSource(audioFrameSource: AudioFrameSource): void {
    this.audioFrameSource = audioFrameSource;
    this._audioBuffer = audioFrameSource.audioBuffer;
    this.originalTotalTimeInMilSeconds = audioFrameSource.metadata.totalTimeInMilSeconds;
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds;
    
    if (this.totalTimeInMilSeconds === 0) {
      console.warn("Failed to load audio media: " + this._name + ". Audio buffer duration is 0.");
    }
    
    this._ready = true;
  }

  disconnect(): void {
      this.source.disconnect();
      this.started = false;
  }

  dispose(): void {
    this.disconnect();
    if (this.audioFrameSource) {
      this.audioFrameSource.cleanup();
    }
  }

  setSpeed(speed: number): void {
    super.setSpeed(speed);
    this.updateTotalTimeForSpeed();
  }

  connectAudioSource(playerAudioContext: ESAudioContext): void {
    this.disconnect();
    this.currentSpeed = this._speedController.getSpeed();
    this.lastAppliedSpeed = this.currentSpeed;

    if (this.audioStreamDestination) {
      //Used for video exporting
      this.source.connect(playerAudioContext, this.audioStreamDestination, this.currentSpeed, this._audioBuffer!);
    } else {
      this.source.connect(playerAudioContext, playerAudioContext.destination, this.currentSpeed, this._audioBuffer!);
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
    if (currentSpeed !== this.lastAppliedSpeed && this.source.isConnected) {
      this.connectAudioSource(this._playerAudioContext!);
    }

    let time = currentTime - this.startTime;
    if (time < 0 || time > this.totalTimeInMilSeconds) {
      return;
    }

    if (!this.source.isConnected){
      this.connectAudioSource(this._playerAudioContext!);
    }

    // Keeping the standard render cache mechanism for consistency, even though audio rendering is handled differently
    if (!this.shouldReRender(currentTime)) {
      return;
    }
    this.updateRenderCache(currentTime);
  }

  playStart(time: number): void {
    this.source.start(time / 1000, 0);
  }

  scheduleStart(scheduleTime: number, offset: number): void {
    if (!this.source.isConnected) {
      this.connectAudioSource(this._playerAudioContext!);
    }

    if (!this.started) {
      // Schedule audio to start at precise future time
      this.source.start(scheduleTime, offset);
      this.started = true;
    }
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
    this.updateTotalTimeForSpeed();
    this.connectAudioSource(this._playerAudioContext!);
  }

  private updateTotalTimeForSpeed(): void {
    this.totalTimeInMilSeconds = this.originalTotalTimeInMilSeconds / this._speedController.getSpeed();
    console.log(`Updated total time for speed ${this.currentSpeed}: ${this.totalTimeInMilSeconds}ms from original ${this.originalTotalTimeInMilSeconds}ms`);
  }

  protected _createCloneInstance(): AbstractMedia {
    const audioLayer = new AudioMedia(this.name);
    audioLayer._playerAudioContext = this._playerAudioContext;
    audioLayer._audioBuffer = this._audioBuffer;
    audioLayer.audioFrameSource = this.audioFrameSource;
    return audioLayer as AbstractMedia;
  }

  /**
   * Override split to handle audio-specific splitting
   */
  protected _performSplit(mediaClone: AbstractMedia, splitTime: number): AbstractMedia {
    if (!this._audioBuffer || !this._playerAudioContext) {
      throw new Error('AudioMedia missing audioBuffer or playerAudioContext');
    }

    const layerRelativeTime = (splitTime - this.startTime) / 1000;

    if (layerRelativeTime <= 0 || layerRelativeTime >= this._audioBuffer.duration) {
      throw new Error('Split time is out of bounds for AudioMedia');
    }

    const firstBuffer = this.audioSplitHandler.createAudioBufferSegment(this._audioBuffer, 0, layerRelativeTime, this._playerAudioContext);
    const secondBuffer = this.audioSplitHandler.createAudioBufferSegment(this._audioBuffer, layerRelativeTime, this._audioBuffer.duration, this._playerAudioContext);

    if (!firstBuffer || !secondBuffer) {
      throw new Error('Failed to create audio buffer segments during split');
    }

    // Update clone (first part)
    (mediaClone as AudioMedia)._name = this._name + "-split";

    (mediaClone as AudioMedia)._audioBuffer = firstBuffer;
    mediaClone.totalTimeInMilSeconds = firstBuffer.duration * 1000;

    // Update original (second part)
    this._audioBuffer = secondBuffer;
    this.totalTimeInMilSeconds = secondBuffer.duration * 1000;
    this.startTime = this.startTime + mediaClone.totalTimeInMilSeconds;

    console.log(`Successfully split AudioMedia: "${this._name}" at ${layerRelativeTime}s`);
    return mediaClone;
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
