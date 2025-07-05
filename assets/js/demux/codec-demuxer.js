import { Canvas2DRender } from "../common/render-2d.js";
export class CodecDemuxer {
  #worker;
  #frames;
  /** @type {Canvas2DRender} */
  #renderer;


  constructor(renderer) {
    this.#frames = [];
    this.#worker = new Worker(new URL("./worker.js", import.meta.url));
    this.#worker.addEventListener("message", this.#demuxUpdateListener.bind(this));
    this.loadUpdateListener = (progress) => {
      console.log("Load update:", progress);
    }
  }

  #demuxUpdateListener(message) {
    const data = message.data

    for (const key in data) {
      if (key === "onReady") {
        console.log("onReady", data[key]);

        let width = data[key].videoTracks[0].video.width;
        let height = data[key].videoTracks[0].video.height;
        let dur = data[key].duration;
        console.log("Video dimensions:", width, "x", height, "Duration:", dur / 1000 / 60, "minutes");
        this.totalTimeInMilSeconds = dur * 1000;
      }

      if (key === "onFrame") {
        const frameData = data[key];
        this.#frames.push(frameData);
        console.log("OnFrame. Frame received:", this.#frames.length);
      }

      if (key === "onComplete") {
        console.log("Demux completed:", data[key]);
        console.log(`Processed ${this.#frames.length}frames`);
        this.loadUpdateListener(this, 100, this.#renderer.context, null);
        this.ready = true;
      }
    }
  }

  /**
   * Initialize the demuxer with a file and renderer
   * @param {File} file
   * @param renderer
   * @returns {Promise<void>}
   */
  async initialize(file, renderer) {
    const arrayBuffer = await file.arrayBuffer();
    arrayBuffer.fileStart = 0;
    this.#worker.postMessage({
      task: "init",
      arrayBuffer: arrayBuffer,
      canvas: renderer.transferableCanvas
    }, [renderer.transferableCanvas]);
  }
}