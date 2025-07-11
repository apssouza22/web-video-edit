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
        console.log('Canvas dimensions:', this.studio.player.canvas.width, 'x', this.studio.player.canvas.height);
        console.log('Available layers:', this.studio.getLayers().length);
        console.log('Audio layers:', this.#getAudioLayers().length);

        this.isEncoding = true;
        this.exportStartTime = performance.now();
        
        // Calculate total duration and expected frames
        this.totalDuration = this.#getTotalDuration();
        this.totalFrames = Math.ceil(this.totalDuration * this.frameRate);
        this.chunks = [];
        
        try {
            await this.#setupMediaBunnyOutput();
            
            // Set up callback for when playback ends
            this.studio.player.onend(async (player) => {
                console.log('🏁 Playback ended, finalizing export...');
                await this.#finishEncodingAndDownload();
                player.pause();
                player.time = 0;
                this.isEncoding = false;
                const totalTime = ((performance.now() - this.exportStartTime) / 1000).toFixed(2);
                console.log(`✅ Export completed in ${totalTime}s`);
                if (this.completionCallback) this.completionCallback();
            });

            // Start playback and encoding
            this.studio.pause();
            this.studio.player.time = 0;

            this.#setupAudioForExport();
            this.#startFrameCapture();

            console.log('▶️ Starting playback for encoding...');
            this.studio.play();
        } catch (error) {
            console.error('❌ Error starting export:', error);
            this.isEncoding = false;
            if (this.completionCallback) this.completionCallback();
            alert('Failed to start video export: ' + error.message);
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
     * Start frame capture interval for MediaBunny CanvasSource
     * @private
     */
    #startFrameCapture() {
        console.log('📸 Starting frame capture interval...');
        this.exportStartTime = performance.now();
        this.readyForMoreFrames = true;
        this.lastFrameNumber = -1;
        
        // Start with immediate frame capture (following test.js pattern)
        this.#addVideoFrame();
        
        this.videoCaptureInterval = setInterval(async () => {
            await this.#addVideoFrame();
        }, 1000 / this.frameRate);
    }

    /**
     * Add a video frame to the MediaBunny CanvasSource
     * @private
     */
    async #addVideoFrame() {
        if (!this.readyForMoreFrames || !this.isEncoding) {
            return;
        }

        // Use playback time for frame timing (more accurate than elapsed time)
        const currentTime = this.studio.player.time; // Time in seconds
        const frameNumber = Math.round(currentTime * this.frameRate);
        
        if (frameNumber === this.lastFrameNumber) {
            // Prevent multiple frames with the same timestamp
            return;
        }

        this.lastFrameNumber = frameNumber;
        const timestamp = frameNumber / this.frameRate;

        try {
            this.readyForMoreFrames = false;
            await this.videoSource.add(timestamp, 1 / this.frameRate);
            this.readyForMoreFrames = true;
            
            // Update progress
            if (this.progressCallback && this.totalDuration > 0) {
                const progress = Math.min((currentTime / this.totalDuration) * 100, 99);
                this.progressCallback(progress);
            }
            
            if (frameNumber % 30 === 0) {
                console.log(`📹 Added frame ${frameNumber} at ${timestamp.toFixed(2)}s (playback: ${currentTime.toFixed(2)}s)`);
            }
        } catch (error) {
            console.error('❌ Error adding video frame:', error);
            this.readyForMoreFrames = true;
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

        // Cleanup audio connections
        this.#cleanupAudio();

        // Convert chunks to a blob using MediaBunny's format
        const videoData = new Blob(this.chunks, { type: this.output.format.mimeType });
        console.log(`📦 Final blob size: ${(videoData.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📦 Final blob type: ${videoData.type}`);
        
        this.#downloadVideo(videoData);
    }

    /**
     * Cleanup audio connections (similar to MediaRecorderExporter)
     * @private
     */
    #cleanupAudio() {
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
        
        console.log('✅ Audio connections cleaned up');
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
    }

    /**
     * Calculate total duration from all layers
     * @returns {number} Total duration in seconds
     * @private
     */
    #getTotalDuration() {
        let maxDuration = 0;
        for (let layer of this.studio.getLayers()) {
            const layerEnd = layer.start_time + layer.totalTimeInMilSeconds / 1000;
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
                        const currentTime = this.studio.player.time;
                        const progress = Math.min((currentTime / this.totalDuration) * 100, 99);
                        this.progressCallback(progress);
                    }
                },
            })),
        });

        const canvas = this.studio.player.canvas;
        console.log(`📹 Setting up video source - Canvas: ${canvas.width}x${canvas.height}`);
        
        this.videoSource = new CanvasSource(canvas, {
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