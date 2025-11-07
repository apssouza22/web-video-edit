import {MediaRecorderExporter} from './media-recorder-exporter.js';
import {WebCodecExporter} from './web-codec-exporter.js';

export class VideoExportService {
  private readonly codecSupported: boolean;

  constructor() {
    this.codecSupported = this.#checkCodecSupport();
  }

  #checkCodecSupport(): boolean {
    return 'VideoEncoder' in window && 'AudioEncoder' in window;
  }

  export(progressCallback: any, completionCallback: any): void {
    if (!this.codecSupported) {
      const mediaRecorderExporter = new MediaRecorderExporter();
      mediaRecorderExporter.export(progressCallback, completionCallback);
      return;
    }
    const webCodecExporter = new WebCodecExporter();
    webCodecExporter.export(progressCallback, completionCallback);
  }
}
