import { VideoExportService } from './video-export.js';
import type { VideoStudio } from '../../studio';

export function createVideoMuxer(studio: VideoStudio): VideoExportService {
    return new VideoExportService(studio);
}
