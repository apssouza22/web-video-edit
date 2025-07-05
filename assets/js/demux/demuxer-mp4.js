importScripts("https://unpkg.com/mp4box@0.5.2/dist/mp4box.all.min.js");

// Demuxes the first video track of an MP4 file using MP4Box and decodes it using VideoDecoder,
// calling `onFrame()` with decoded VideoFrame objects and `onError()` for decode errors.
class MP4Demuxer {
  #onFrame = null;
  #onError = null;
  #file = null;
  #decoder = null;
  #onReadyCallback;

  constructor(uri, {onFrame, onError, onReady}) {
    this.#onFrame = onFrame;
    this.#onError = onError;
    this.#onReadyCallback = onReady

    // Configure an MP4Box File for demuxing.
    this.#file = MP4Box.createFile();
    this.#file.onError = onError
    this.#file.onReady = this.#onReady.bind(this);
    this.#file.onSamples = this.#onSamples.bind(this);
    uri.fileStart=0
    this.#file.appendBuffer(uri);
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
    this.#onReadyCallback(info);
    const track = info.videoTracks[0];
    this.#configureDecoder(track);
    this.#file.setExtractionOptions(track.id);
    this.#file.start();
  }

  #configureDecoder(track) {
    this.#decoder = new VideoDecoder({
      output: (frame) => {
        this.#onFrame(frame);
      },
      error: (e) => {
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
