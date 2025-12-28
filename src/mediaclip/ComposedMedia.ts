import {AbstractMedia} from "@/mediaclip/media-common";
import {Frame} from "@/mediaclip/frame";
import {VideoMedia} from "@/mediaclip/video";
import {AudioMedia} from "@/mediaclip/audio";
import {ESAudioContext, IAudioClip, LayerChange} from "@/mediaclip/types";


export class ComposedMedia extends AbstractMedia implements IAudioClip{
  private readonly videoMedia: VideoMedia;
  private readonly audioMedia: AudioMedia;
  private readonly processedOperations: Set<string> = new Set();


  constructor(videoMedia: VideoMedia, audioMedia: AudioMedia) {
    super(videoMedia.name);
    this.videoMedia = videoMedia;
    this.audioMedia = audioMedia;
    this._width = videoMedia.width;
    this._height = videoMedia.height;
    this.totalTimeInMilSeconds = Math.max(videoMedia.totalTimeInMilSeconds, audioMedia.totalTimeInMilSeconds);
    this._ready = true;
  }

  protected _createCloneInstance(): AbstractMedia {
    return new ComposedMedia(
        this.videoMedia.clone() as VideoMedia,
        this.audioMedia.clone() as AudioMedia
    );
  }

  protected _performSplit(_: AbstractMedia, splitTime: number): AbstractMedia {
    const video = this.videoMedia.split(splitTime);
    const audio = this.audioMedia.split(splitTime);

    this.totalTimeInMilSeconds = this.videoMedia.totalTimeInMilSeconds;
    this.startTime = this.videoMedia.startTime;

    const composedMedia = new ComposedMedia(
        video as VideoMedia,
        audio as AudioMedia
    );
    composedMedia.startTime = video.startTime;
    composedMedia.totalTimeInMilSeconds = video.totalTimeInMilSeconds
    return composedMedia;
  }

  init( playerAudioContext?: AudioContext): void {
    this.videoMedia.init(playerAudioContext);
    this.audioMedia.init(playerAudioContext);
  }

  async update(change: LayerChange, referenceTime: number): Promise<void> {
    await this.videoMedia.update(change, referenceTime);
    await this.audioMedia.update(change, referenceTime);
  }

  disconnect(): void {
    this.audioMedia.disconnect();
  }

  isVideo(): boolean {
    return true;
  }

  isAudio(): boolean {
    return true;
  }

  setSpeed(speed: number): void {
    this.videoMedia.setSpeed(speed);
    this.audioMedia.setSpeed(speed);
    this._speedController.setSpeed(speed);
  }

  playStart(time: number): void {
    this.audioMedia.playStart(time);
  }

  scheduleStart(scheduleTime: number, offset: number): void {
    this.audioMedia.scheduleStart(scheduleTime, offset);
  }

  connectAudioSource(playerAudioContext: ESAudioContext): void {
    this.audioMedia.connectAudioSource(playerAudioContext);
  }

  removeInterval(startTime: number, endTime: number): boolean {
    if(this.processedOperations.has(`remove-${startTime}-${endTime}`)) {
      console.log(`Operation already processed: remove-${startTime}-${endTime}`);
      return true;
    }
    this.processedOperations.add(`remove-${startTime}-${endTime}`);
    const videoSuccess = this.videoMedia.removeInterval(startTime, endTime);
    const audioSuccess = this.audioMedia.removeInterval(startTime, endTime);
    return videoSuccess && audioSuccess;
  }

  async render(ctxOut: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): Promise<void> {
    if (!this.isLayerVisible(currentTime)) {
      return;
    }
    if (!this.shouldReRender(currentTime)) {
      return;
    }
    await this.videoMedia.render(ctxOut, currentTime, playing);
    await this.audioMedia.render(ctxOut, currentTime, playing);
    this.updateRenderCache(currentTime);
  }

  async getFrameAtIndex(index: number, preFetch: boolean = true): Promise<ImageBitmap | null> {
    return this.videoMedia.getFrameAtIndex(index, preFetch);
  }

  getTotalFrames(): number {
    return this.videoMedia.getTotalFrames();
  }

  getSpeed(): number {
    return this.videoMedia.getSpeed();
  }

  async getFrame(currentTime: number, playing: boolean = false): Promise<Frame | null> {
    return this.videoMedia.getFrame(currentTime, playing);
  }

  cleanup(): void {
    this.videoMedia.cleanup();
  }

  get video(): VideoMedia {
    return this.videoMedia;
  }

  get audio(): AudioMedia {
    return this.audioMedia;
  }
}