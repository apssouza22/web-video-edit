import {VideoExportService} from './video-export-service.js';

export function createVideoMuxer(): VideoExportService {
    return new VideoExportService();
}

export {VideoExportHandler} from './video-export-handler';
