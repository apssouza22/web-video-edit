import { AudioLayer } from '../layer/layer-audio.js';
import { addElementToBackground } from '../layer/layer-common.js';
import { getSupportedMimeTypes } from './utils.js';

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
     */
    export(exportButton, tempText) {
        const availableTypes = this.#getSupportedMimeTypes();
        if (availableTypes.length === 0) {
            alert("Cannot export! Please use a screen recorder instead.");
            return;
        }

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

        rec.onstop = e => this.#downloadVideo(new Blob(chunks, { type: availableTypes[0] }));
        this.studio.player.onend(function (player) {
            rec.stop();
            exportButton.textContent = tempText;
            player.pause();
            player.time = 0;
        });

        this.studio.pause();
        this.studio.player.time = 0;
        this.studio.play();
        rec.start();
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
        const extension = blob.type.split(';')[0].split('/')[1];
        const filename = (new Date()).getTime() + '.' + extension;
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
