import { AudioLayer } from '../layer/layer-audio.js';
import { addElementToBackground } from '../layer/layer-common.js';
import { getSupportedMimeTypes } from '../studio/utils.js';

/**
 * Class for exporting video using MediaRecorder API
 */
export class MediaRecorderExporter {
    /**
     * @param {VideoStudio} studio
     */
    constructor(studio) {
        this.studio = studio;
    }

    /**
     * Start the export process using MediaRecorder
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

        // Calculate total duration from layers
        this.totalDuration = this.#getTotalDuration();

        const stream = this.studio.player.canvas.captureStream();

        let audioLayers = this.#getAudioLayers();
        if (audioLayers.length > 0) {
            const audioStreamDestination = this.studio.player.audioContext.createMediaStreamDestination();
            audioLayers.forEach(layer => {
                layer.audioStreamDestination = audioStreamDestination;
            });
            let tracks = audioStreamDestination.stream.getAudioTracks();
            stream.addTrack(tracks[0]);
        }
        this.#startMediaRecord(stream, exportButton, tempText, availableTypes);
    }

    /**
     * Calculate total duration from all layers
     * @returns {number} Total duration in seconds
     * @private
     */
    #getTotalDuration() {
        let maxDuration = 0;
        for (let layer of this.studio.getLayers()) {
            const layerEnd = layer.start_time + layer.total_time;
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
     * Start recording using MediaRecorder
     * @param {MediaStream} stream - The stream to record
     * @param {HTMLElement} exportButton - The button that triggered the export
     * @param {string} tempText - Original button text to restore after export
     * @param {Array} availableTypes - Array of supported MIME types
     * @private
     */
    #startMediaRecord(stream, exportButton, tempText, availableTypes) {
        const chunks = [];
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = e => chunks.push(e.data);

        rec.onstop = e => {
            this.#stopProgressTracking();
            this.#downloadVideo(new Blob(chunks, { type: availableTypes[0] }));
            if (this.completionCallback) this.completionCallback();
        };

        this.studio.player.onend((player) => {
            rec.stop();
            player.pause();
            player.time = 0;
        });

        this.studio.pause();
        this.studio.player.time = 0;
        
        // Start progress tracking
        this.#startProgressTracking();
        
        this.studio.play();
        rec.start();
    }

    /**
     * Start tracking export progress based on playback time
     * @private
     */
    #startProgressTracking() {
        if (!this.progressCallback || this.totalDuration <= 0) return;

        this.progressInterval = setInterval(() => {
            const currentTime = this.studio.player.time;
            const progress = Math.min((currentTime / this.totalDuration) * 100, 99); // Cap at 99% until complete
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
