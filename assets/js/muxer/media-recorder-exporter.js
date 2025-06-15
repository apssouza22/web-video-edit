import { addElementToBackground, AudioLayer } from '../layer';
import { getSupportedMimeTypes, VideoStudio } from '../studio';

/**
 * Class for exporting video using MediaRecorder API without playing in the main player
 */
export class MediaRecorderExporter {
    /**
     * @param {VideoStudio} studio
     */
    constructor(studio) {
        this.studio = studio;
        this.recordingCanvas = null;
        this.recordingCtx = null;
        this.recordingTime = 0;
        this.mediaRecorder = null;
        this.isRecording = false;
        this.audioContext = new AudioContext();
    }

    /**
     * Start the export process using MediaRecorder without playing in the main player
     * @param {HTMLElement} exportButton - The button that triggered the export
     * @param {string} tempText - Original button text to restore after export
     * @param {Function} progressCallback - Callback function to report progress (0-100)
     * @param {Function} completionCallback - Callback function to call when export is complete
     */
    export(exportButton, tempText, progressCallback = null, completionCallback = null) {
        this.progressCallback = progressCallback;
        this.completionCallback = completionCallback;

        const availableTypes = this.#getSupportedMimeTypes();
        if (availableTypes.length === 0) {
            alert("Cannot export! Please use a screen recorder instead.");
            if (this.completionCallback) this.completionCallback();
            return;
        }
        this.totalDuration = this.#getTotalDuration();

        if (this.totalDuration <= 0) {
            alert("No content to export!");
            this.completionCallback();
            return;
        }

        this.#createRecordingCanvas();
        let stream = this.recordingCanvas.captureStream();
        this.#loadAudioTrack(stream);
        this.#startBackgroundRecording(stream, availableTypes);
    }

    #loadAudioTrack(stream) {
        const audioLayers = this.#getAudioLayers();
        if (audioLayers.length <= 0) {
            return
        }
        const audioStreamDestination = this.audioContext.createMediaStreamDestination();
        audioLayers.forEach(layer => {
            layer.audioStreamDestination = audioStreamDestination;
        });
        let tracks = audioStreamDestination.stream.getAudioTracks();
        if (tracks.length > 0) {
            stream.addTrack(tracks[0]);
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
    }

    /**
     * Start recording using MediaRecorder with background rendering
     * @param {MediaStream} stream - The stream to record
     * @param {Array} availableTypes - Array of supported MIME types
     * @private
     */
    #startBackgroundRecording(stream, availableTypes) {
        const chunks = [];
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: availableTypes[0] });
        this.isRecording = true;
        this.recordingTime = 0;

        this.mediaRecorder.ondataavailable = e => chunks.push(e.data);
        this.mediaRecorder.onstop = e => {
            this.#stopBackgroundRecording();
            this.#downloadVideo(new Blob(chunks, { type: availableTypes[0] }));
            if (this.completionCallback) {
                this.completionCallback();
            }
        };

        this.#startProgressTracking();
        this.#startBackgroundRendering();
        this.mediaRecorder.start();
    }

    /**
     * Start background rendering loop that renders frames without playing
     * @private
     */
    #startBackgroundRendering() {
        let lastTimestamp = null;
        
        this.#setupAudioForExport();

        const renderFrame = (currentTime) => {
            if (lastTimestamp === null) {
                lastTimestamp = currentTime;
            }
            
            if (!this.isRecording) return;

            const deltaTime = currentTime - lastTimestamp;
            this.recordingTime += deltaTime;
            this.#renderLayersAtTime(this.recordingTime);

            if (this.recordingTime >= this.totalDuration) {
                this.mediaRecorder.stop();
                return;
            }

            lastTimestamp = currentTime;
            
            window.requestAnimationFrame(renderFrame);
        };

        window.requestAnimationFrame(renderFrame);
    }

    /**
     * Setup audio connections for export
     * @private
     */
    #setupAudioForExport() {
        this.audioContext.resume();
        for (let layer of this.studio.getLayers()) {
            if (layer instanceof AudioLayer) {
                layer.connectAudioSource(this.audioContext);
            }
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
     * Stop background recording and cleanup
     * @private
     */
    #stopBackgroundRecording() {
        this.isRecording = false;
        this.#stopProgressTracking();
        this.studio.getLayers().forEach(layer => {
            layer.audioStreamDestination = null;
        });

        // Cleanup recording canvas
        if (this.recordingCanvas) {
            this.recordingCanvas.remove();
            this.recordingCanvas = null;
            this.recordingCtx = null;
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

    /**
     * Start tracking export progress based on recording time
     * @private
     */
    #startProgressTracking() {
        if (!this.progressCallback || this.totalDuration <= 0) return;

        this.progressInterval = setInterval(() => {
            const progress = Math.min((this.recordingTime / this.totalDuration) * 100, 99); // Cap at 99% until complete
            this.progressCallback(progress);
        }, 100); // Update every 100ms
    }

    /**
     * Stop progress tracking
     * @private
     */
    #stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        if (this.progressCallback) {
            this.progressCallback(100);
        }
    }

    /**
     * Download the recorded video
     * @param {Blob} blob - The video blob to download
     * @private
     */
    #downloadVideo(blob) {
        console.log("Warning: Exported video may need to be fixed with CloudConvert.com or similar tools.");
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
        const extension = blob.type.includes('webm') ? 'webm' : 'mp4';
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

    /**
     * Get supported MIME types for MediaRecorder
     * @returns {Array} Array of supported MIME types
     * @private
     */
    #getSupportedMimeTypes() {
        return getSupportedMimeTypes();
    }
}