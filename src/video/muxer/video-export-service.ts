import {WebCodecExporter, ExportOptions} from './web-codec-exporter.js';

export class VideoExportService {
  private readonly codecSupported: boolean;

  constructor() {
    this.codecSupported = this.#checkCodecSupport();
  }

  #checkCodecSupport(): boolean {
    return 'VideoEncoder' in window && 'AudioEncoder' in window;
  }

  export(progressCallback: any, completionCallback: any, options?: ExportOptions): void {
    if (!this.codecSupported) {
      alert("WebCodecs API is not supported in this browser. Please use a different browser.");
      if (completionCallback) completionCallback();
      return;
    }

    const exportOptions: ExportOptions = options || {
      qualityPreset: 'archive',
      preferredCodecs: ['hevc', 'avc'],
    };

    const webCodecExporter = new WebCodecExporter(exportOptions);
    webCodecExporter.export(progressCallback, completionCallback);
  }
}
