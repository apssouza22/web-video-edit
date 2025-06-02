class VideoExporter {

    /**
     * 
     * @param {VideoStudio} studio
     */
    constructor(studio) {
        this.studio = studio;
        this.codecSupported = this.#checkCodecSupport();
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

        const exportButton = document.getElementById('export');
        const tempText = exportButton.textContent;
        exportButton.textContent = "Exporting...";

        // Check if Web Codecs API is supported
        if (!this.codecSupported) {
            const mediaRecorderExporter = new MediaRecorderExporter(this.studio);
            mediaRecorderExporter.export(exportButton, tempText);
            return;
        }

        // Use the WebCodecExporter
        const webCodecExporter = new WebCodecExporter(this.studio);
        webCodecExporter.export(exportButton, tempText);
    }
}
