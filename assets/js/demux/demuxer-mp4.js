importScripts("https://unpkg.com/mp4box@0.5.2/dist/mp4box.all.min.js");

// Wraps an MP4Box File as a WritableStream underlying sink.
class MP4FileSink {
  #setStatus = null;
  #file = null;
  #offset = 0;

  constructor(file, setStatus) {
    this.#file = file;
    this.#setStatus = setStatus;
  }

  write(chunk) {
    // MP4Box.js requires buffers to be ArrayBuffers, but we have a Uint8Array.
    const buffer = new ArrayBuffer(chunk.byteLength);
    new Uint8Array(buffer).set(chunk);

    // Inform MP4Box where in the file this chunk is from.
    buffer.fileStart = this.#offset;
    this.#offset += buffer.byteLength;

    // Append chunk.
    this.#setStatus("fetch", (this.#offset / (1024 ** 2)).toFixed(1) + " MiB");
    this.#file.appendBuffer(buffer);
  }

  close() {
    this.#setStatus("fetch", "Done");
    this.#file.flush();
  }
}

// Demuxes the first video track of an MP4 file using MP4Box and decodes it using VideoDecoder,
// calling `onFrame()` with decoded VideoFrame objects and `onError()` for decode errors.
class MP4Demuxer {
  #onFrame = (f) =>{};
  #onError = (f) =>{};
  #setStatus = (f) =>{};
  #file = null;
  #decoder = null;
  #frameCount = 0;
  #startTime = null;
  #totalFrames = 0;
  #totalSkipFrames = 0;
  #expectedFrames = 0;
  #lastEmittedTimestamp = null;
  #targetFps = 24;
  #frameInterval = 1000000 / 24; // 33333.33 microseconds for 30 fps
  #originalFps = 0;
  #expectedFramesAt30fps = 0;

  constructor(uri, {onFrame, onError, setStatus}) {
    this.#onFrame = onFrame;
    this.#onError = onError;
    this.#setStatus = setStatus;

    // Configure an MP4Box File for demuxing.
    this.#file = MP4Box.createFile();
    this.#file.onError = error => setStatus("onError", error);
    this.#file.onReady = this.#onReady.bind(this);
    this.#file.onSamples = this.#onSamples.bind(this);
    uri.fileStart = 0;
    this.#file.appendBuffer(uri)
    this.#file.flush();

    // Fetch the file and pipe the data through.
    // const fileSink = new MP4FileSink(this.#file, setStatus);
    // fetch(uri).then(response => {
    //   // highWaterMark should be large enough for smooth streaming, but lower is
    //   // better for memory usage.
    //   response.body.pipeTo(new WritableStream(fileSink, {highWaterMark: 2}));
    // });
  }

  // Get the appropriate `description` for a specific track. Assumes that the
  // track is H.264, H.265, VP8, VP9, or AV1.
  #description(track) {
    const trak = this.#file.getTrackById(track.id);
    for (const entry of trak.mdia.minf.stbl.stsd.entries) {
      const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
      if (box) {
        const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
        box.write(stream);
        return new Uint8Array(stream.buffer, 8);  // Remove the box header.
      }
    }
    throw new Error("avcC, hvcC, vpcC, or av1C box not found");
  }

  #onReady(info) {
    const track = info.videoTracks[0];
    
    // Calculate expected total frames based on duration and track samples
    this.#expectedFrames = track.nb_samples || Math.ceil(info.duration * (track.movie_timescale / track.movie_duration) * track.timescale / track.duration);
    
    // Calculate original FPS and expected frames at 30fps
    const durationInSeconds = info.duration / info.timescale;
    this.#originalFps = this.#expectedFrames / durationInSeconds;
    this.#expectedFramesAt30fps = Math.ceil(durationInSeconds * this.#targetFps);
    
    this.#configureDecoder(track);
    this.#file.setExtractionOptions(track.id);
    this.#setStatus("onReady", {
      duration: info.duration, 
      video: track.video,
      totalFrames: this.#expectedFrames,
      originalFps: this.#originalFps.toFixed(2),
      targetFps: this.#targetFps,
      expectedFramesAt30fps: this.#expectedFramesAt30fps
    });
    this.#file.start();
  }

  #configureDecoder(track) {
    this.#decoder = new VideoDecoder({
      output: (frame) => {
        // Frame rate limiting: only emit frames at target FPS (30 fps)
        const currentTimestamp = frame.timestamp;
        if (this.#lastEmittedTimestamp === null ||
            currentTimestamp - this.#lastEmittedTimestamp >= this.#frameInterval) {

          // Update statistics.
          if (this.#startTime == null) {
            this.#startTime = performance.now();
          } else {
            const elapsed = (performance.now() - this.#startTime) / 1000;
            const fps = ++this.#frameCount / elapsed;
            this.#setStatus("render", `${fps.toFixed(0)} fps (capped at ${this.#targetFps})`);
          }

          // Update last emitted timestamp
          this.#lastEmittedTimestamp = currentTimestamp;

          // Increment total frames processed (only for emitted frames)
          this.#totalFrames++;

          // Check if this is the last frame


          // Pass frame with metadata
          this.#onFrame({
            frame: frame,
            frameNumber: this.#totalFrames,
            totalFrames: this.#expectedFramesAt30fps,
          });


        } else {
          console.log(`Skip frame at timestamp: ${currentTimestamp}, last emitted: ${this.#lastEmittedTimestamp}`);
          this.#totalSkipFrames++
          frame.close();
        }
        // If this is the last frame, signal completion
        const isLastFrame = this.#totalFrames + this.#totalSkipFrames >= this.#expectedFrames - 5;
        console.log(`Decoded frame at timestamp: ${currentTimestamp}, total frames: ${this.#totalFrames}, skipped frames: ${this.#totalSkipFrames}`);
        if (isLastFrame) {
          console.log(`Last frame processed! Total frames: ${this.#totalFrames}, Skipped frames: ${this.#totalSkipFrames}`);
          this.#setStatus("onComplete", {
            totalFramesProcessed: this.#totalFrames,
            expectedFrames: this.#expectedFramesAt30fps,
            originalFrames: this.#expectedFrames,
            originalFps: this.#originalFps.toFixed(2),
            targetFps: this.#targetFps
          });
        }
      },
      error: (e) => {
        this.#setStatus("decode", e);
        this.#onError(e);
      }
    });

    // Generate and configure VideoDecoderConfig.
    const config = {
      codec: this.#getCodec(track),
      codedHeight: track.video.height,
      codedWidth: track.video.width,
      description: this.#description(track),
    };
    this.#setStatus("video", track.video)
    this.#setStatus("decode", `${config.codec} @ ${config.codedWidth}x${config.codedHeight}`);
    this.#decoder.configure(config);
  }

  #getCodec(track) {
    // Browser doesn't support parsing full vp8 codec (eg: `vp08.00.41.08`), they only support `vp8`.
    return track.codec.startsWith('vp08') ? 'vp8' : track.codec;
  }

  #onSamples(track_id, ref, samples) {
    // Generate and decode EncodedVideoChunk for each demuxed sample.
    for (const sample of samples) {
      const chunk = new EncodedVideoChunk({
        type: sample.is_sync ? "key" : "delta",
        timestamp: 1e6 * sample.cts / sample.timescale,
        duration: 1e6 * sample.duration / sample.timescale,
        data: sample.data
      });
      
      // Decode the chunk directly
      this.#decoder.decode(chunk);
    }
  }

  // Public method to close/cleanup the decoder
  close() {
    if (this.#decoder) {
      this.#decoder.close();
      this.#decoder = null;
    }
  }
}
