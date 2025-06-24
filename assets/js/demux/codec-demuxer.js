// import { DemuxHandler } from "./demux.js";

export class CodecDemuxer {
  constructor() {
    // this.demuxHandler = new DemuxHandler();
    // this.demuxHandler.addOnUpdateListener(this.#demuxUpdateListener.bind(this));
  }


  async #processVideoWithWebCodecs(file) {
    this.demuxHandler.start(await file.arrayBuffer(), "2d");
  }


  #demuxUpdateListener(message) {
    const data = message.data

    for (const key in data) {
      if (key === "onReady") {
        console.log("onReady", data[key]);
        let width = data[key].video.width;
        let height = data[key].video.height;
        let dur = data[key].duration;
        this.totalTimeInMilSeconds = dur * 1000;
        this.expectedTotalFrames = data[key].totalFrames || Math.ceil(dur * fps);
      }

      if (key === "onFrame") {
        const frameData = data[key];

        // Convert VideoFrame to ImageData if needed
        // You can choose to store as ImageData for consistency
        const frame = this.#convertVideoFrameToImageData(frameData.frame);
        this.framesCollection.push(frame);

        // Update progress based on frame count
        const progress = Math.min(95, (frameData.frameNumber / frameData.totalFrames) * 100);
        this.loadUpdateListener(this, progress, this.ctx, null);

      }

      if (key === "onComplete") {
        console.log("Demux completed:", data[key]);
        console.log(`Processed ${this.framesCollection.getLength()}frames`);
        this.loadUpdateListener(this, 100, this.ctx, null);
        this.ready = true;
      }
    }
  }

  /**
   * Converts a VideoFrame to ImageData
   * @param {VideoFrame} videoFrame - The VideoFrame to convert
   * @returns {ImageData} The converted ImageData
   */
  #convertVideoFrameToImageData(videoFrame) {
    this.renderer.drawImage(videoFrame, 0, 0);
    const frame = this.renderer.getImageData(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
    videoFrame.close();
    return frame;
  }

  async initialize(fileSrc, renderer) {
    this.fileSrc = fileSrc;
    this.renderer = renderer;
    // TODO: Implement codec demuxer using library
  }
}