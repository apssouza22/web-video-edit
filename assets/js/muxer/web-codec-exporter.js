import {AudioLayer} from '../layer/index.js';
import {
  CanvasSource,
  AudioBufferSource,
  Mp4OutputFormat,
  Output,
  BufferTarget,
  QUALITY_HIGH,
  getFirstEncodableVideoCodec,
  getFirstEncodableAudioCodec,
} from "https://cdn.jsdelivr.net/npm/mediabunny@1.0.2/+esm";

/**
 * Class for exporting video using MediaBunny library with Web Codecs API
 *
 * This implementation follows the test2.js approach using BufferTarget and synchronous frame rendering
 */
export class WebCodecExporter {

  exportWidth = 1920;
  exportHeight = 1080;

  /**
   * @param {VideoStudio} studio - The video studio instance
   */
  constructor(studio) {
    this.studio = studio;
    this.output = null;
    this.canvasSource = null;
    this.audioBufferSource = null;
    this.isEncoding = false;
    this.progressCallback = null;
    this.completionCallback = null;
    this.totalFrames = 0;
    this.totalDuration = 0;
    this.frameRate = 30;
    this.recordingCanvas = null;
    this.recordingCtx = null;
    this.audioContext = null;
    this.numberOfChannels = 2;
    this.sampleRate = 48000;
  }

  /**
   * Start the export process using MediaBunny library with BufferTarget approach
   * @param {HTMLElement} exportButton - The button that triggered the export
   * @param {string} tempText - Original button text to restore after export
   * @param {Function} progressCallback - Callback function to report progress (0-100)
   * @param {Function} completionCallback - Callback function called when export completes
   */
  async export(exportButton, tempText, progressCallback = null, completionCallback = null) {
    if (this.isEncoding) {
      console.warn('Export already in progress');
      return;
    }

    this.progressCallback = progressCallback;
    this.completionCallback = completionCallback;

    console.log('🎬 Starting MediaBunny export with BufferTarget approach...');
    console.log('Available layers:', this.studio.getLayers().length);
    console.log('Audio layers:', this.#getAudioLayers().length);

    this.isEncoding = true;
    this.totalDuration = this.#getTotalDuration();
    this.totalFrames = Math.ceil((this.totalDuration / 1000) * this.frameRate);

    try {
      this.#createRecordingCanvas();
      await this.#setupMediaBunnyOutput();
      await this.#setupAudioContext();
      await this.#renderFramesSynchronously();
      console.log('✅ Export completed successfully');
    } catch (error) {
      console.error('❌ Error during export:', error);
      this.isEncoding = false;
      if (this.completionCallback) {
        this.completionCallback();
      }
      alert('Failed to export video: ' + error.message);
    }
  }

  /**
   * Create a separate OffscreenCanvas for recording at 1920x1080 resolution
   * @private
   */
  #createRecordingCanvas() {
    this.recordingCanvas = new OffscreenCanvas(this.exportWidth, this.exportHeight);
    // Enhanced context settings for better quality
    this.recordingCtx = this.recordingCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // Better performance
      colorSpace: 'srgb', // Better color space
      willReadFrequently: false // Optimized for writing
    });
    
    // Set high-quality rendering settings
    this.recordingCtx.imageSmoothingEnabled = true;
    this.recordingCtx.imageSmoothingQuality = 'high';
    
    console.log(`📹 Created high-quality OffscreenCanvas: ${this.recordingCanvas.width}x${this.recordingCanvas.height}`);
  }

  /**
   * Set up MediaBunny output with BufferTarget and proper codec selection
   * @private
   */
  async #setupMediaBunnyOutput() {
    this.output = new Output({
      target: new BufferTarget(),
      format: new Mp4OutputFormat(),
    });

    // Use recording canvas dimensions for codec selection (1920x1080)
    const exportWidth = this.recordingCanvas.width;
    const exportHeight = this.recordingCanvas.height;

    // Enhanced codec selection with quality preferences
    const videoCodec = await getFirstEncodableVideoCodec(
        this.output.format.getSupportedVideoCodecs(),
        {
          width: exportWidth,
          height: exportHeight,
          framerate: this.frameRate,
          bitrate: QUALITY_HIGH
        }
    );

    if (!videoCodec) {
      throw new Error('Your browser doesn\'t support video encoding.');
    }

    console.log('🎥 Using video codec:', videoCodec);
    console.log(`🎥 Export resolution: ${exportWidth}x${exportHeight}`);

    // Create canvas source with detected codec
    this.canvasSource = new CanvasSource(this.recordingCanvas, {
      codec: videoCodec,
      bitrate: QUALITY_HIGH,
    });

    this.output.addVideoTrack(this.canvasSource, {frameRate: this.frameRate});
    const audioLayers = this.#getAudioLayers();
    if (audioLayers.length > 0) {
      const audioCodec = await getFirstEncodableAudioCodec(
          this.output.format.getSupportedAudioCodecs(),
          {
            numberOfChannels: this.numberOfChannels,
            sampleRate: this.sampleRate,
          }
      );

      if (audioCodec) {
        console.log('🎵 Using audio codec:', audioCodec);
        this.audioBufferSource = new AudioBufferSource({
          codec: audioCodec,
          bitrate: QUALITY_HIGH,
        });
        this.output.addAudioTrack(this.audioBufferSource);
      } else {
        console.warn('No audio codec available, exporting video only');
      }
    }

    await this.output.start();
  }

  /**
   * Setup audio context for offline rendering
   * @private
   */
  async #setupAudioContext() {
    const audioLayers = this.#getAudioLayers();
    if (audioLayers.length === 0 || !this.audioBufferSource) {
      return;
    }
    const durationInSeconds = this.totalDuration / 1000;
    this.audioContext = new OfflineAudioContext(
        this.numberOfChannels,
        this.sampleRate * durationInSeconds,
        this.sampleRate
    );
  }

  /**
   * Render frames synchronously following test2.js approach
   * @private
   */
  async #renderFramesSynchronously() {
    let currentFrame = 0;
    for (currentFrame = 0; currentFrame < this.totalFrames; currentFrame++) {
      const currentTime = (currentFrame / this.frameRate) * 1000; // Convert to milliseconds
      const videoProgress = currentFrame / this.totalFrames;
      const overallProgress = videoProgress * (this.audioBufferSource ? 0.9 : 0.95);

      if (this.progressCallback) {
        this.progressCallback(Math.round(overallProgress * 100));
      }
      this.#renderFrameAtTime(currentTime);

      // Add frame to video encoder - await is crucial for backpressure
      await this.canvasSource.add(currentTime / 1000, 1 / this.frameRate);
    }

    this.canvasSource.close();

    // Render audio if available
    if (this.audioBufferSource && this.audioContext) {
      if (this.progressCallback) {
        this.progressCallback(90);
      }

      await this.#renderAudioOffline();
    }

    // Finalize the output
    if (this.progressCallback) {
      this.progressCallback(95);
    }

    console.log('🔄 Finalizing output...');
    await this.output.finalize();
    await this.#createAndDownloadFile();

    if (this.progressCallback) {
      this.progressCallback(100);
    }

    this.isEncoding = false;
    if (this.completionCallback) {
      this.completionCallback();
    }
  }

  /**
   * Render audio using offline audio context
   * @private
   */
  async #renderAudioOffline() {
    console.log('🎵 Rendering audio offline...');
    const audioLayers = this.#getAudioLayers();
    const gainNode = this.audioContext.createGain();
    gainNode.connect(this.audioContext.destination);

    // Process each audio layer
    for (const layer of audioLayers) {
      if (layer.audioBuffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = layer.audioBuffer;

        // Apply layer timing and volume
        const startTime = (layer.startTime || 0) / 1000;
        const volume = layer.volume !== undefined ? layer.volume : 1.0;
        const layerGain = this.audioContext.createGain();
        layerGain.gain.value = volume;

        source.connect(layerGain);
        layerGain.connect(gainNode);

        source.start(startTime);
        console.log(`🎵 Added audio layer: start=${startTime}s, volume=${volume}`);
      }
    }

    // Render the audio
    const audioBuffer = await this.audioContext.startRendering();
    await this.audioBufferSource.add(audioBuffer);
    this.audioBufferSource.close();

    console.log('✅ Audio rendered');
  }

  /**
   * Create and download the final MP4 file
   * @private
   */
  async #createAndDownloadFile() {
    console.log('📁 Creating final MP4 file...');
    const videoBlob = new Blob([this.output.target.buffer], {type: 'video/mp4'});

    // Create download link
    const url = URL.createObjectURL(videoBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-export-${Date.now()}.mp4`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    const fileSizeMB = (videoBlob.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Export complete! File size: ${fileSizeMB} MB`);
  }

  /**
   * Render a single frame at the specified time
   * @param {number} currentTime - Time in milliseconds
   * @private
   */
  #renderFrameAtTime(currentTime) {
    this.recordingCtx.clearRect(0, 0, this.recordingCanvas.width, this.recordingCanvas.height);
    const layers = this.studio.getLayers();
    for (const layer of layers) {
      layer.render(this.recordingCtx, currentTime);
    }
  }

  /**
   * Calculate total duration from all layers
   * @returns {number} Total duration in milliseconds
   * @private
   */
  #getTotalDuration() {
    let maxDuration = 0;
    for (let layer of this.studio.getLayers()) {
      const layerEnd = layer.start_time + layer.totalTimeInMilSeconds;
      if (layerEnd > maxDuration) {
        maxDuration = layerEnd;
      }
    }
    return maxDuration;
  }

  /**
   * Get audio layers from the studio
   * @returns {Array} Array of audio layers
   * @private
   */
  #getAudioLayers() {
    const layers = [];
    for (let layer of this.studio.getLayers()) {
      if (layer instanceof AudioLayer) {
        layers.push(layer);
      }
    }
    return layers;
  }
}
