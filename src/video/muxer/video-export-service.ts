import {VideoStudio} from '@/studio';
import {MediaRecorderExporter} from './media-recorder-exporter.js';
import {WebCodecExporter} from './web-codec-exporter.js';

export class VideoExportService {
  private readonly studio: VideoStudio;
  private readonly codecSupported: boolean;

  constructor(studio: VideoStudio) {
    this.studio = studio;
    this.codecSupported = this.#checkCodecSupport();
  }

  #checkCodecSupport(): boolean {
    return 'VideoEncoder' in window && 'AudioEncoder' in window;
  }

  export(progressCallback: any, completionCallback: any): void {
    if (!this.codecSupported) {
      const mediaRecorderExporter = new MediaRecorderExporter(this.studio);
      mediaRecorderExporter.export(progressCallback, completionCallback);
      return;
    }
    const webCodecExporter = new WebCodecExporter(this.studio);
    webCodecExporter.export(progressCallback, completionCallback);
  }
}
