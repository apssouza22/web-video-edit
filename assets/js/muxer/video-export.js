import { exportToJson } from '../studio/utils.js';
import { MediaRecorderExporter } from './media-recorder-exporter.js';
import { WebCodecExporter } from './web-codec-exporter.js';

export class VideoExporter {

    /**
     * 
     * @param {VideoStudio} studio
     */
    constructor(studio) {
        this.studio = studio;
        this.codecSupported = this.#checkCodecSupport();
        this.exportId = 'video-export'; // Unique ID for loading popup tracking
    }

    #checkCodecSupport() {
        // Disabled codec support check for now
        return false;

        return 'VideoEncoder' in window && 'AudioEncoder' in window;
    }

    init() {
        document.getElementById('export').addEventListener('click', this.export.bind(this));
    }

    export(ev) {
        if (ev.shiftKey) {
            exportToJson();
            return;
        }
        if (this.studio.getLayers().length === 0) {
            alert("Nothing to export.");
            return;
        }

        // Start the loading popup for export
        this.studio.loadingPopup.startLoading(this.exportId, '', 'Exporting Video...');

        const exportButton = document.getElementById('export');
        const tempText = exportButton.textContent;
        exportButton.textContent = "Exporting...";

        // Progress callback to update the loading popup
        const progressCallback = (progress) => {
            this.studio.loadingPopup.updateProgress(this.exportId, progress);
        };

        // Completion callback to restore button and finalize
        const completionCallback = () => {
            exportButton.textContent = tempText;
            this.studio.loadingPopup.updateProgress(this.exportId, 100);
        };

        // Check if Web Codecs API is supported
        if (!this.codecSupported) {
            const mediaRecorderExporter = new MediaRecorderExporter(this.studio);
            mediaRecorderExporter.export(exportButton, tempText, progressCallback, completionCallback);
            return;
        }

        // Use the WebCodecExporter
        const webCodecExporter = new WebCodecExporter(this.studio);
        webCodecExporter.export(exportButton, tempText, progressCallback, completionCallback);
    }
}
