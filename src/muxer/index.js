import { VideoExportService } from './video-export.js';

export function createVideoMuxer(studio) {
    return new VideoExportService(studio);
}
