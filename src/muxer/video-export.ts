import { exportToJson } from '../studio/index.js';
import { MediaRecorderExporter } from './media-recorder-exporter.js';
import { WebCodecExporter } from './web-codec-exporter.js';
import type { VideoStudio } from '../studio/index.js';

export class VideoExportService {
    private readonly studio: VideoStudio;
    private readonly codecSupported: boolean;
    private readonly exportId: string = 'video-export'; // Unique ID for loading popup tracking

    constructor(studio: VideoStudio) {
        this.studio = studio;
        this.codecSupported = this.#checkCodecSupport();
    }

    #checkCodecSupport(): boolean {
        return 'VideoEncoder' in window && 'AudioEncoder' in window;
    }

    init(): void {
        const exportButton = document.getElementById('export');
        if (exportButton) {
            exportButton.addEventListener('click', this.export.bind(this));
        }
    }

    export(ev: MouseEvent): void {
        if (ev.shiftKey) {
            exportToJson();
            return;
        }
        if (this.studio.getLayers().length === 0) {
            alert("Nothing to export.");
            return;
        }

        this.studio.loadingPopup.startLoading(this.exportId, '', 'Exporting Video...');

        const exportButton = document.getElementById('export') as HTMLButtonElement;
        if (!exportButton) {
            console.error('Export button not found');
            return;
        }

        const tempText = exportButton.textContent || 'Export';
        exportButton.textContent = "Exporting...";

        const progressCallback = (progress: number): void => {
            this.studio.loadingPopup.updateProgress(this.exportId, progress);
        };

        const completionCallback = (): void => {
            exportButton.textContent = tempText;
            this.studio.loadingPopup.updateProgress(this.exportId, 100);
        };

        if (!this.codecSupported) {
            const mediaRecorderExporter = new MediaRecorderExporter(this.studio);
            mediaRecorderExporter.export(exportButton, tempText, progressCallback, completionCallback);
            return;
        }

        const webCodecExporter = new WebCodecExporter(this.studio);
        webCodecExporter.export(exportButton, tempText, progressCallback, completionCallback);
    }
}
