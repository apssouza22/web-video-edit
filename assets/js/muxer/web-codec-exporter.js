import { addElementToBackground, AudioLayer } from '../layer/index.js';
import {
    CanvasSource,
    MediaStreamAudioTrackSource,
    Mp4OutputFormat,
    Output,
    QUALITY_MEDIUM,
    StreamTarget,
} from "https://cdn.jsdelivr.net/npm/mediabunny@1.0.2/+esm";

/**
 * Class for exporting video using MediaBunny library with Web Codecs API
 *
 * This implementation uses MediaBunny for proper MP4 export with VP9 video and Opus audio
 */
export class WebCodecExporter {
    /**
     * @param {VideoStudio} studio - The video studio instance
     */
    constructor(studio) {
        this.studio = studio;
        this.output = null;
        this.videoSource = null;
        this.audioSource = null;
        this.chunks = [];
        this.frameCounter = 0;
        this.isEncoding = false;
        this.exportStartTime = 0;
        this.progressCallback = null;
        this.completionCallback = null;
        this.totalFrames = 0;
        this.totalDuration = 0;
        this.mediaStream = null;
        this.videoCaptureInterval = null;
        this.readyForMoreFrames = true;
        this.lastFrameNumber = -1;
        this.frameRate = 30;
        this.recordingCanvas = null;
        this.recordingCtx = null;
        this.currentTime = 0;
    }

    /**
     * Start the export process using MediaBunny library with Web Codecs API
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

        console.log('🎬 Starting MediaBunny export...');
        console.log('Available layers:', this.studio.getLayers().length);
        console.log('Audio layers:', this.#getAudioLayers().length);

        this.isEncoding = true;
        this.exportStartTime = performance.now();
        this.currentTime = 0; // Track current export time
        
        // Calculate total duration and expected frames
        this.totalDuration = this.#getTotalDuration();
        this.totalFrames = Math.ceil((this.totalDuration / 1000) * this.frameRate); // Convert to seconds
        this.chunks = [];
        
        try {
            // Create background canvas for rendering
            this.#createRecordingCanvas();
            
            // Set up MediaBunny output and encoders
            await this.#setupMediaBunnyOutput();
            
            // Setup audio for export
            this.#setupAudioForExport();

            // Start background frame rendering and capture
            this.#startBackgroundFrameCapture();

            console.log('▶️ Starting background rendering for encoding...');
        } catch (error) {
            console.error('❌ Error starting export:', error);
            this.isEncoding = false;
            if (this.completionCallback) this.completionCallback();
            alert('Failed to start video export: ' + error.message);
        }
    }

    /**
     * Create a separate canvas for recording that matches the player canvas
     * @private
     */
    #createRecordingCanvas() {
        this.recordingCanvas = document.createElement('canvas');
        this.recordingCanvas.width = this.studio.player.canvas.width;
        this.recordingCanvas.height = this.studio.player.canvas.height;
        this.recordingCtx = this.recordingCanvas.getContext('2d');

        addElementToBackground(this.recordingCanvas);
        console.log(`📹 Created recording canvas: ${this.recordingCanvas.width}x${this.recordingCanvas.height}`);
    }

    /**
     * Start background frame capture and rendering loop
     * @private
     */
    #startBackgroundFrameCapture() {
        console.log('📸 Starting background frame capture...');
        this.readyForMoreFrames = true;
        this.lastFrameNumber = -1;
        
        // Start with immediate frame capture
        this.#addVideoFrameFromBackground();
        
        // Set up interval for frame capture
        this.videoCaptureInterval = setInterval(async () => {
            await this.#addVideoFrameFromBackground();
        }, 1000 / this.frameRate);
    }

    /**
     * Add a video frame from background rendering to MediaBunny CanvasSource
     * @private
     */
    async #addVideoFrameFromBackground() {
        if (!this.readyForMoreFrames || !this.isEncoding) {
            return;
        }

        // Calculate current time in seconds for MediaBunny
        const currentTimeSeconds = this.currentTime / 1000;
        const frameNumber = Math.round(currentTimeSeconds * this.frameRate);
        
        if (frameNumber === this.lastFrameNumber) {
            // Prevent multiple frames with the same timestamp
            return;
        }

        // Check if we've reached the end
        if (this.currentTime >= this.totalDuration) {
            await this.#finishEncodingAndDownload();
            return;
        }

        this.lastFrameNumber = frameNumber;
        const timestamp = frameNumber / this.frameRate;

        try {
            this.readyForMoreFrames = false;
            
            this.#renderLayersAtTime(this.currentTime);
            await this.videoSource.add(timestamp, 1 / this.frameRate);
            this.readyForMoreFrames = true;
            
            // Update progress
            if (this.progressCallback && this.totalDuration > 0) {
                const progress = Math.min((this.currentTime / this.totalDuration) * 100, 99);
                this.progressCallback(progress);
            }
            
            this.currentTime += 1000 / this.frameRate; // Advance by frame duration in milliseconds
            
            if (frameNumber % 30 === 0) {
                console.log(`📹 Added frame ${frameNumber} at ${timestamp.toFixed(2)}s (time: ${this.currentTime.toFixed(0)}ms)`);
            }
        } catch (error) {
            console.error('❌ Error adding video frame:', error);
            this.readyForMoreFrames = true;
        }
    }

    /**
     * Render all layers to the recording canvas at a specific time
     * @param {number} time - Time in milliseconds
     * @private
     */
    #renderLayersAtTime(time) {
        this.recordingCtx.clearRect(0, 0, this.recordingCanvas.width, this.recordingCanvas.height);
        const layers = this.studio.getLayers();

        for (let layer of layers) {
            // Pass playing=true to ensure audio layers start at correct time
            layer.render(this.recordingCtx, time, true);
        }
    }

    /**
     * Set up audio for export (similar to MediaRecorderExporter)
     * @private
     */
    #setupAudioForExport() {
        const audioLayers = this.#getAudioLayers();
        if (audioLayers.length > 0 && this.studio.player.audioContext) {
            this.studio.player.audioContext.resume();
            audioLayers.forEach(layer => {
                if (layer.connectAudioSource) {
                    layer.connectAudioSource(this.studio.player.audioContext);
                }
            });
            console.log(`✅ Set up ${audioLayers.length} audio layer(s) for export`);
        }
    }

    /**
     * Finish encoding and download the video
     * @private
     */
    async #finishEncodingAndDownload() {
        console.log('🔄 Finalizing encoding...');
        
        // Stop frame capture
        if (this.videoCaptureInterval) {
            clearInterval(this.videoCaptureInterval);
            this.videoCaptureInterval = null;
            console.log('✅ Frame capture stopped');
        }
        
        // Finalize the output (not close!)
        try {
            await this.output.finalize();
            console.log('✅ Output finalized');
        } catch (e) {
            console.error('❌ Error finalizing output:', e);
        }

        this.#cleanupExport();
        const videoData = new Blob(this.chunks, { type: this.output.format.mimeType });
        console.log(`📦 Final blob size: ${(videoData.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📦 Final blob type: ${videoData.type}`);
        
        this.#downloadVideo(videoData);
        
        // Mark encoding as complete
        this.isEncoding = false;
        const totalTime = ((performance.now() - this.exportStartTime) / 1000).toFixed(2);
        console.log(`✅ Export completed in ${totalTime}s`);
        if (this.completionCallback) this.completionCallback();
    }

    /**
     * Cleanup audio connections and background canvas
     * @private
     */
    #cleanupExport() {
        const audioLayers = this.#getAudioLayers();
        audioLayers.forEach(layer => {
            layer.audioStreamDestination = null;
        });
        
        if (this.mediaStream) {
            // Stop all tracks in the media stream
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.mediaStream = null;
        }
        
        if (this.recordingCanvas) {
            this.recordingCanvas.remove();
            this.recordingCanvas = null;
            this.recordingCtx = null;
        }
        
        console.log('✅ Export cleanup completed');
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

    /**
     * Set up MediaBunny output with video and audio sources
     * @private
     */
    async #setupMediaBunnyOutput() {
        this.chunks = [];

        this.output = new Output({
            format: new Mp4OutputFormat({ fastStart: 'fragmented' }),
            target: new StreamTarget(new WritableStream({
                write: (chunk) => {
                    this.chunks.push(chunk.data);
                    
                    if (this.progressCallback && this.totalDuration > 0) {
                        const progress = Math.min(this.currentTime / this.totalDuration * 100, 99);
                        this.progressCallback(progress);
                    }
                },
            })),
        });

        console.log(`📹 Setting up video source - Canvas: ${this.recordingCanvas.width}x${this.recordingCanvas.height}`);
        
        this.videoSource = new CanvasSource(this.recordingCanvas, {
            codec: 'vp9', // VP9 for better compatibility
            bitrate: QUALITY_MEDIUM,
            keyFrameInterval: 0.5,
            latencyMode: 'realtime',
        });
        
        // Add video track with frame rate
        this.output.addVideoTrack(this.videoSource, { frameRate: this.frameRate });
        console.log('✅ Video track added to output');

        // Set up audio if audio layers exist
        const audioLayers = this.#getAudioLayers();
        if (audioLayers.length > 0) {
            await this.#setupAudioSource(audioLayers);
        } else {
            console.log('ℹ️ No audio layers found, video only export');
        }

        // CRITICAL: Start the MediaBunny output processing
        await this.output.start();
        console.log('✅ MediaBunny output started');
    }

    /**
     * Set up audio source using MediaBunny
     * @param {Array} audioLayers - Array of audio layers to capture
     * @private
     */
    async #setupAudioSource(audioLayers) {
        console.log('🔊 Setting up MediaBunny audio source...');
        
        try {
            if (!this.studio.player.audioContext) {
                console.error('❌ No audio context available');
                return;
            }

            const audioContext = this.studio.player.audioContext;
            const audioStreamDestination = audioContext.createMediaStreamDestination();
            
            // Connect audio layers to the stream destination
            audioLayers.forEach(layer => {
                layer.audioStreamDestination = audioStreamDestination;
                // Also connect audio source if available
                if (layer.connectAudioSource) {
                    layer.connectAudioSource(audioContext);
                }
            });
            const audioTracks = audioStreamDestination.stream.getAudioTracks();
            
            if (audioTracks.length > 0) {
                const audioTrack = audioTracks[0];
                this.mediaStream = audioStreamDestination.stream;
                
                console.log(`🔊 Found ${audioTracks.length} audio track(s)`);
                this.audioSource = new MediaStreamAudioTrackSource(audioTrack, {
                    codec: 'opus',
                    bitrate: QUALITY_MEDIUM,
                });
                this.output.addAudioTrack(this.audioSource);
            } else {
                console.warn('⚠️ No audio tracks available from audio stream destination');
            }
        } catch (error) {
            console.error('❌ Error setting up audio source:', error);
            console.log('ℹ️ Continuing with video-only export');
        }
    }

    /**
     * Download the recorded video
     * @param {Blob} blob - The video blob to download
     * @private
     */
    #downloadVideo(blob) {
        console.log("Starting download...");
        const vid = document.createElement('video');
        vid.controls = true;
        vid.src = URL.createObjectURL(blob);
        addElementToBackground(vid);
        this.#triggerFileDownload(blob);
        vid.currentTime = Number.MAX_SAFE_INTEGER;
    }

    /**
     * Trigger file download in the browser
     * @param {Blob} blob - The blob to download
     * @private
     */
    #triggerFileDownload(blob) {
        const extension = this.output.format.fileExtension.replace('.', ''); // Remove leading dot if present
        const filename = `video_export_${(new Date()).getTime()}.${extension}`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);

        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        }, 100);
    }
}