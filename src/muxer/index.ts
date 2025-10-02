import { VideoExportService } from './video-export.js';
import type { VideoStudio } from '../studio/index';

export function createVideoMuxer(studio: VideoStudio): VideoExportService {
    return new VideoExportService(studio);
}
