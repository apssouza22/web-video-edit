import {WebCodecExporter} from './web-codec-exporter.js';

export class VideoExportService {
  private readonly codecSupported: boolean;
  private webCodecExporter: WebCodecExporter;

  constructor() {
    this.codecSupported = this.#checkCodecSupport();
    this.webCodecExporter = new WebCodecExporter();
  }

  #checkCodecSupport(): boolean {
    return 'VideoEncoder' in window && 'AudioEncoder' in window;
  }

  export(progressCallback: any, completionCallback: any): void {
    if (!this.codecSupported) {
      alert("WebCodecs API is not supported in this browser. Please use a different browser.");
      if (completionCallback) completionCallback();
      return;
    }
    this.webCodecExporter.export(progressCallback, completionCallback);
  }
}
