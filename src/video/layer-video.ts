import { createDemuxer } from "@/video/demux";
import { createFrameService } from '../frame';
import { StandardLayer } from '../layer/layer-common';
import { Frame } from "../frame/frame";
import { LayerFile, VideoLayerProperties, VideoDemuxerInterface, DemuxerMetadata } from '../layer/types';

export class VideoLayer extends StandardLayer implements VideoLayerProperties {
  public useHtmlDemux: boolean;
  private videoDemuxer: VideoDemuxerInterface;
  private reader?: FileReader;

  constructor(file: LayerFile, skipLoading: boolean = false, useHtmlDemux: boolean = false) {
    super(file);
    this.useHtmlDemux = useHtmlDemux;
    this.framesCollection = createFrameService(0, 0, false);
    this.videoDemuxer = createDemuxer(useHtmlDemux);
    this.#setupDemuxerCallbacks();

    // Empty VideoLayers (split() requires this)
    if (skipLoading) {
      return;
    }

    this.#readFile(file);
  }

  #setupDemuxerCallbacks(): void {
    this.videoDemuxer.setOnProgressCallback((progress: number) => {
      this.loadUpdateListener(this, progress, this.ctx);
    });

    this.videoDemuxer.setOnCompleteCallback((frames: any[]) => {
      frames.forEach((frame, index) => {
        this.framesCollection.update(index, new Frame(frame));
      });
      this.loadUpdateListener(this, 100, this.ctx, null);
      this.ready = true;
    });

    this.videoDemuxer.setOnMetadataCallback((metadata: DemuxerMetadata) => {
      this.totalTimeInMilSeconds = metadata.totalTimeInMilSeconds;
      this.framesCollection = createFrameService(this.totalTimeInMilSeconds, this.start_time, false);
      this.width = metadata.width;
      this.height = metadata.height;
      this.#handleVideoRatio();
    });
  }

  #readFile(file: LayerFile): void {
    if (file.uri !== null && file.uri !== undefined) {
      this.videoDemuxer.initDemux(file, this.renderer);
      return;
    }

    this.reader = new FileReader();
    this.reader.addEventListener("load", ((): void => {
      if (this.reader && typeof this.reader.result === 'string') {
        file.uri = this.reader.result;
        this.videoDemuxer.initDemux(file, this.renderer);
      }
    }).bind(this), false);

    this.reader.readAsDataURL(file as File);
  }

  #handleVideoRatio(): void {
    const playerRatio = this.canvas.width / this.canvas.height;
    const videoRatio = this.width / this.height;
    
    if (videoRatio > playerRatio) {
      const scale = videoRatio / playerRatio;
      this.height *= scale;
    } else {
      const scale = playerRatio / videoRatio;
      this.width *= scale;
    }
    this.renderer.setSize(this.width, this.height);
  }

  render(ctxOut: CanvasRenderingContext2D, currentTime: number, playing: boolean = false): void {
    if (!this.ready) {
      return;
    }
    if (!this.isLayerVisible(currentTime)) {
      return;
    }

    // Check if we need to re-render this frame
    if (!this.shouldReRender(currentTime)) {
      this.drawScaled(this.ctx, ctxOut);
      return;
    }

    const index = this.framesCollection.getIndex(currentTime, this.start_time);
    if (index < 0 || index >= this.framesCollection.getLength()) {
      return;
    }

    const frame = this.framesCollection.frames[index];
    const scale = frame.scale;
    const x = frame.x + this.renderer.width / 2 - this.width / 2;
    const y = frame.y + this.renderer.height / 2 - this.height / 2;

    this.renderer.clearRect();
    if (frame.frame instanceof VideoFrame) {
      this.renderer.drawImage(
        frame.frame, 
        0, 0, 
        this.width, this.height, 
        x, y, 
        scale * this.width, 
        scale * this.height
      );
    } else {
      // Assume it's ImageData
      const imageData = frame.frame as ImageData;
      this.renderer.putImageData(imageData, x, y);
    }
    this.drawScaled(this.renderer.context, ctxOut);
    this.updateRenderCache(currentTime);
  }
}
